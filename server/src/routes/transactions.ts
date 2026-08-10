import { Router } from "express"
import { db, generateId } from "../db"
import { transactionSchema, type PaymentMethod } from "../validation"
import { HttpError, paginate, parsePagination, safeJsonParse } from "../utils"
import type { CartItem, Transaction } from "../types"

const router = Router()

interface TransactionRow {
  id: string
  items: string
  total: number
  payment: number
  change: number
  paymentMethod: PaymentMethod
  discount: number
  createdAt: string
}

const selectColumns =
  "id, items, total, payment, change, payment_method as paymentMethod, discount, created_at as createdAt"

function mapTransaction(row: TransactionRow): Transaction {
  return {
    ...row,
    items: safeJsonParse<CartItem[]>(row.items) ?? [],
  }
}

router.get("/", (req, res) => {
  const { from, to, paymentMethod } = req.query
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined

  const where: string[] = []
  const values: unknown[] = []
  if (from) { where.push("substr(created_at, 1, 10) >= ?"); values.push(from) }
  if (to) { where.push("substr(created_at, 1, 10) <= ?"); values.push(to) }
  if (paymentMethod) { where.push("payment_method = ?"); values.push(paymentMethod) }
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

interface ProductRow {
  id: string
  name: string
  price: number
  stock: number
  image: string | null
}

const createTransaction = db.transaction(
  (items: { productId: string; qty: number }[], payment: number, paymentMethod: PaymentMethod, discount: number) => {
    const productIds = items.map((i) => i.productId)
    const placeholders = productIds.map(() => "?").join(",")
    const products = db
      .prepare(`SELECT id, name, price, stock, image FROM products WHERE id IN (${placeholders})`)
      .all(...productIds) as ProductRow[]
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of items) {
      if (!productMap.has(item.productId)) throw new HttpError(400, "Produk tidak ditemukan")
    }

    const cartItems: CartItem[] = []
    let subtotal = 0
    for (const item of items) {
      const p = productMap.get(item.productId)!
      if (p.stock < item.qty) throw new HttpError(400, `Stok "${p.name}" tidak cukup (tersisa ${p.stock})`)
      cartItems.push({ productId: p.id, name: p.name, price: p.price, qty: item.qty, image: p.image || undefined })
      subtotal += p.price * item.qty
    }

    if (discount > subtotal) throw new HttpError(400, "Diskon melebihi total")
    const total = subtotal - discount
    if (payment < total) throw new HttpError(400, "Pembayaran kurang dari total")
    const change = payment - total

    const updateStock = db.prepare("UPDATE products SET stock = ? WHERE id = ?")
    for (const item of items) {
      const p = productMap.get(item.productId)!
      updateStock.run(p.stock - item.qty, item.productId)
    }

    const id = generateId()
    const createdAt = new Date().toISOString()
    db.prepare(
      "INSERT INTO transactions (id, items, total, payment, change, payment_method, discount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, JSON.stringify(cartItems), total, payment, change, paymentMethod, discount, createdAt)

    return { id, items: cartItems, total, payment, change, paymentMethod, discount, createdAt }
  }
)

router.post("/", (req, res) => {
  const data = transactionSchema.parse(req.body)
  const tx = createTransaction(data.items, data.payment, data.paymentMethod, data.discount)
  res.json(tx)
})

export default router
