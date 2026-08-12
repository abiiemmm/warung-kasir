import { Router } from "express"
import { db, generateId } from "../db"
import { transactionSchema, voidSchema, type PaymentMethod } from "../validation"
import { HttpError, paginate, parsePagination, safeJsonParse } from "../utils"
import { writeLog } from "../audit"
import { findOpenShift } from "./shifts"
import type { AuthUser, CartItem, Transaction } from "../types"

const router = Router()

interface TransactionRow {
  id: string
  items: string
  total: number
  payment: number
  change: number
  paymentMethod: PaymentMethod
  discount: number
  costTotal: number
  userId: string
  userName: string
  shiftId: string | null
  voidedAt: string | null
  voidReason: string
  createdAt: string
}

const selectColumns = `
  id, items, total, payment, change, payment_method as paymentMethod, discount,
  cost_total as costTotal, user_id as userId, user_name as userName, shift_id as shiftId,
  voided_at as voidedAt, void_reason as voidReason, created_at as createdAt
`

function mapTransaction(row: TransactionRow): Transaction {
  return {
    ...row,
    items: safeJsonParse<CartItem[]>(row.items) ?? [],
    shiftId: row.shiftId || undefined,
    voidedAt: row.voidedAt || undefined,
  }
}

function getTransaction(id: string): Transaction | undefined {
  const row = db.prepare(`SELECT ${selectColumns} FROM transactions WHERE id = ?`).get(id) as
    | TransactionRow
    | undefined
  return row ? mapTransaction(row) : undefined
}

router.get("/", (req, res) => {
  const { from, to, paymentMethod, shiftId } = req.query
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined

  const where: string[] = []
  const values: unknown[] = []
  if (from) { where.push("substr(created_at, 1, 10) >= ?"); values.push(from) }
  if (to) { where.push("substr(created_at, 1, 10) <= ?"); values.push(to) }
  if (paymentMethod) { where.push("payment_method = ?"); values.push(paymentMethod) }
  if (shiftId) { where.push("shift_id = ?"); values.push(shiftId) }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : ""

  if (hasPagination) {
    const { page, limit, offset } = parsePagination(req.query)
    const totalRow = db.prepare(`SELECT COUNT(*) as c FROM transactions${whereSql}`).get(...values) as { c: number }
    const rows = db
      .prepare(`SELECT ${selectColumns} FROM transactions${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...values, limit, offset) as TransactionRow[]
    res.json(paginate(rows.map(mapTransaction), totalRow.c, page, limit))
  } else {
    const rows = db
      .prepare(`SELECT ${selectColumns} FROM transactions${whereSql} ORDER BY created_at DESC`)
      .all(...values) as TransactionRow[]
    res.json(rows.map(mapTransaction))
  }
})

router.get("/:id", (req, res) => {
  const tx = getTransaction(req.params.id)
  if (!tx) throw new HttpError(404, "Transaksi tidak ditemukan")
  res.json(tx)
})

interface ProductRow {
  id: string
  name: string
  price: number
  costPrice: number
  stock: number
  image: string | null
}

interface CheckoutInput {
  items: { productId: string; qty: number }[]
  payment: number
  paymentMethod: PaymentMethod
  discount: number
  idempotencyKey?: string
  user: AuthUser
  shiftId: string | null
}

const createTransaction = db.transaction((input: CheckoutInput): Transaction => {
  const { items, payment, paymentMethod, discount, idempotencyKey, user, shiftId } = input

  const productIds = items.map((i) => i.productId)
  const placeholders = productIds.map(() => "?").join(",")
  const products = db
    .prepare(
      `SELECT id, name, price, cost_price as costPrice, stock, image FROM products WHERE id IN (${placeholders})`
    )
    .all(...productIds) as ProductRow[]
  const productMap = new Map(products.map((p) => [p.id, p]))

  for (const item of items) {
    if (!productMap.has(item.productId)) throw new HttpError(400, "Produk tidak ditemukan")
  }

  // Item yang sama boleh dikirim dua kali; stok harus dicek terhadap total gabungannya.
  const qtyByProduct = new Map<string, number>()
  for (const item of items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.qty)
  }

  const cartItems: CartItem[] = []
  let subtotal = 0
  let costTotal = 0
  for (const [productId, qty] of qtyByProduct) {
    const p = productMap.get(productId)!
    if (p.stock < qty) throw new HttpError(400, `Stok "${p.name}" tidak cukup (tersisa ${p.stock})`)
    cartItems.push({
      productId: p.id,
      name: p.name,
      price: p.price,
      costPrice: p.costPrice,
      qty,
      image: p.image || undefined,
    })
    subtotal += p.price * qty
    costTotal += p.costPrice * qty
  }

  if (discount > subtotal) throw new HttpError(400, "Diskon melebihi total")
  const total = subtotal - discount
  if (payment < total) throw new HttpError(400, "Pembayaran kurang dari total")
  const change = payment - total

  const updateStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?")
  for (const [productId, qty] of qtyByProduct) updateStock.run(qty, productId)

  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO transactions
       (id, items, total, payment, change, payment_method, discount, cost_total,
        user_id, user_name, shift_id, void_reason, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
  ).run(
    id,
    JSON.stringify(cartItems),
    total,
    payment,
    change,
    paymentMethod,
    discount,
    costTotal,
    user.id,
    user.name,
    shiftId,
    idempotencyKey ?? null,
    createdAt
  )

  return {
    id,
    items: cartItems,
    total,
    payment,
    change,
    paymentMethod,
    discount,
    costTotal,
    userId: user.id,
    userName: user.name,
    shiftId: shiftId || undefined,
    voidReason: "",
    createdAt,
  }
})

router.post("/", (req, res) => {
  const data = transactionSchema.parse(req.body)

  // Anti dobel-tap: kalau key yang sama dikirim ulang, kembalikan transaksi yang sudah ada
  // alih-alih memotong stok dua kali.
  if (data.idempotencyKey) {
    const existing = db
      .prepare(`SELECT ${selectColumns} FROM transactions WHERE idempotency_key = ?`)
      .get(data.idempotencyKey) as TransactionRow | undefined
    if (existing) return res.json(mapTransaction(existing))
  }

  const shift = findOpenShift(req.user!.id)
  const tx = createTransaction({
    items: data.items,
    payment: data.payment,
    paymentMethod: data.paymentMethod,
    discount: data.discount,
    idempotencyKey: data.idempotencyKey,
    user: req.user!,
    shiftId: shift?.id ?? null,
  })

  const ringkasan = tx.items.map((i) => `${i.name} x${i.qty}`).join(", ")
  writeLog(req, {
    action: "checkout",
    entity: "transaction",
    entityId: tx.id,
    entityName: `Rp${tx.total.toLocaleString("id-ID")}`,
    details: `Transaksi Rp${tx.total.toLocaleString("id-ID")} (${tx.paymentMethod}) — ${ringkasan}`,
  })

  res.json(tx)
})

/**
 * Membatalkan transaksi: stok dikembalikan dan transaksi ditandai void
 * (baris tetap disimpan demi jejak audit, tapi dikecualikan dari laporan).
 */
const voidTransaction = db.transaction((tx: Transaction, reason: string): string => {
  const restock = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?")
  const recordAdjustment = db.prepare(
    `INSERT INTO stock_adjustments
       (id, product_id, product_name, type, qty_before, qty_after, delta, reason, user_id, user_name, created_at)
     VALUES (?, ?, ?, 'void', ?, ?, ?, ?, ?, ?, ?)`
  )
  const now = new Date().toISOString()

  for (const item of tx.items) {
    const current = db.prepare("SELECT stock FROM products WHERE id = ?").get(item.productId) as
      | { stock: number }
      | undefined
    // Produk yang sudah dihapus tidak bisa direstok, tapi pembatalan tetap dilanjutkan.
    if (!current) continue
    restock.run(item.qty, item.productId)
    recordAdjustment.run(
      generateId(),
      item.productId,
      item.name,
      current.stock,
      current.stock + item.qty,
      item.qty,
      `Pembatalan transaksi: ${reason}`,
      "",
      "",
      now
    )
  }

  db.prepare("UPDATE transactions SET voided_at = ?, void_reason = ? WHERE id = ?").run(now, reason, tx.id)
  return now
})

router.post("/:id/void", (req, res) => {
  const { reason } = voidSchema.parse(req.body)
  const tx = getTransaction(req.params.id)
  if (!tx) throw new HttpError(404, "Transaksi tidak ditemukan")
  if (tx.voidedAt) throw new HttpError(400, "Transaksi ini sudah dibatalkan")

  // Kasir hanya boleh membatalkan transaksinya sendiri di shift yang masih berjalan;
  // selebihnya harus lewat pemilik supaya pembatalan tidak jadi celah kecurangan.
  if (req.user!.role !== "owner") {
    const shift = findOpenShift(req.user!.id)
    const sameShift = shift && tx.shiftId === shift.id
    if (tx.userId !== req.user!.id || !sameShift) {
      throw new HttpError(403, "Hanya pemilik yang bisa membatalkan transaksi di luar shift Anda")
    }
  }

  const voidedAt = voidTransaction(tx, reason)
  writeLog(req, {
    action: "void",
    entity: "transaction",
    entityId: tx.id,
    entityName: `Rp${tx.total.toLocaleString("id-ID")}`,
    details: `Transaksi Rp${tx.total.toLocaleString("id-ID")} dibatalkan — ${reason}`,
  })

  res.json({ ...tx, voidedAt, voidReason: reason })
})

export default router
