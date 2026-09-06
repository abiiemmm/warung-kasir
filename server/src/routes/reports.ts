import { Router } from "express"
import { db } from "../db"
import { safeJsonParse } from "../utils"
import type { CartItem } from "../types"

const router = Router()

interface TxRow {
  id: string
  items: string
  total: number
  discount: number
  costTotal: number
  paymentMethod: string
  userId: string
  userName: string
  createdAt: string
}

interface ParsedTx extends Omit<TxRow, "items"> {
  items: CartItem[]
  date: string
}

/** Transaksi yang dibatalkan tidak pernah ikut dalam laporan apa pun. */
function getTransactions(from?: string, to?: string): ParsedTx[] {
  const where: string[] = ["voided_at IS NULL"]
  const values: unknown[] = []
  if (from) { where.push("substr(created_at, 1, 10) >= ?"); values.push(from) }
  if (to) { where.push("substr(created_at, 1, 10) <= ?"); values.push(to) }
  const rows = db
    .prepare(
      `SELECT id, items, total, discount, cost_total as costTotal, payment_method as paymentMethod,
              user_id as userId, user_name as userName, created_at as createdAt
       FROM transactions WHERE ${where.join(" AND ")}`
    )
    .all(...values) as TxRow[]
  return rows.map((r) => ({
    ...r,
    items: safeJsonParse<CartItem[]>(r.items) ?? [],
    date: r.createdAt.slice(0, 10),
  }))
}

function range(req: { query: Record<string, unknown> }): [string | undefined, string | undefined] {
  const from = typeof req.query.from === "string" ? req.query.from : undefined
  const to = typeof req.query.to === "string" ? req.query.to : undefined
  return [from, to]
}

router.get("/summary", (req, res) => {
  const [from, to] = range(req)
  const txs = getTransactions(from, to)

  const totalRevenue = txs.reduce((s, t) => s + t.total, 0)
  const totalDiscount = txs.reduce((s, t) => s + t.discount, 0)
  const totalCost = txs.reduce((s, t) => s + t.costTotal, 0)
  const itemCount = txs.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0)

  const byMethod: Record<string, number> = {}
  for (const t of txs) byMethod[t.paymentMethod] = (byMethod[t.paymentMethod] || 0) + t.total

  const dailyMap = new Map<string, { count: number; revenue: number; profit: number }>()
  for (const t of txs) {
    const cur = dailyMap.get(t.date) || { count: 0, revenue: 0, profit: 0 }
    cur.count += 1
    cur.revenue += t.total
    cur.profit += t.total - t.costTotal
    dailyMap.set(t.date, cur)
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const voided = db
    .prepare(
      `SELECT COUNT(*) as c, IFNULL(SUM(total), 0) as total FROM transactions
       WHERE voided_at IS NOT NULL${from ? " AND substr(created_at,1,10) >= ?" : ""}${to ? " AND substr(created_at,1,10) <= ?" : ""}`
    )
    .get(...[from, to].filter(Boolean)) as { c: number; total: number }

  res.json({
    count: txs.length,
    totalRevenue,
    totalDiscount,
    totalCost,
    grossProfit: totalRevenue - totalCost,
    itemCount,
    avgPerTx: txs.length ? Math.round(totalRevenue / txs.length) : 0,
    byMethod,
    daily,
    voidedCount: voided.c,
    voidedTotal: voided.total,
  })
})

router.get("/by-product", (req, res) => {
  const [from, to] = range(req)
  const txs = getTransactions(from, to)

  const map = new Map<string, { name: string; qty: number; revenue: number; profit: number }>()
  for (const t of txs) {
    for (const item of t.items) {
      const cur = map.get(item.productId) || { name: item.name, qty: 0, revenue: 0, profit: 0 }
      cur.qty += item.qty
      cur.revenue += item.price * item.qty
      cur.profit += (item.price - (item.costPrice ?? 0)) * item.qty
      map.set(item.productId, cur)
    }
  }
  const rows = Array.from(map.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 50)

  res.json({ data: rows })
})

router.get("/by-category", (req, res) => {
  const [from, to] = range(req)
  const txs = getTransactions(from, to)

  const products = db.prepare("SELECT id, category_id as categoryId FROM products").all() as {
    id: string
    categoryId: string
  }[]
  const productCat = new Map(products.map((p) => [p.id, p.categoryId]))
  const categories = db.prepare("SELECT id, name FROM categories").all() as { id: string; name: string }[]
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))

  const map = new Map<string, { categoryId: string; name: string; revenue: number; qty: number; profit: number }>()
  for (const t of txs) {
    for (const item of t.items) {
      const categoryId = productCat.get(item.productId) || "uncategorized"
      const name = categoryName.get(categoryId) ?? "Tanpa Kategori"
      const cur = map.get(categoryId) || { categoryId, name, revenue: 0, qty: 0, profit: 0 }
      cur.qty += item.qty
      cur.revenue += item.price * item.qty
      cur.profit += (item.price - (item.costPrice ?? 0)) * item.qty
      map.set(categoryId, cur)
    }
  }
  const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)

  res.json({ data: rows })
})

/** Rekap per kasir — untuk membandingkan performa dan menelusuri selisih uang. */
router.get("/by-user", (req, res) => {
  const [from, to] = range(req)
  const txs = getTransactions(from, to)

  const map = new Map<string, { userId: string; name: string; count: number; revenue: number; profit: number }>()
  for (const t of txs) {
    const cur = map.get(t.userId) || { userId: t.userId, name: t.userName || "Tanpa nama", count: 0, revenue: 0, profit: 0 }
    cur.count += 1
    cur.revenue += t.total
    cur.profit += t.total - t.costTotal
    map.set(t.userId, cur)
  }
  res.json({ data: Array.from(map.values()).sort((a, b) => b.revenue - a.revenue) })
})

export default router
