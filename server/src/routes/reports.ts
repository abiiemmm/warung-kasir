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
  paymentMethod: string
  createdAt: string
}

interface ParsedTx extends Omit<TxRow, "items"> {
  items: CartItem[]
  date: string
}

function getTransactions(from?: string, to?: string): ParsedTx[] {
  const where: string[] = []
  const values: unknown[] = []
  if (from) { where.push("substr(created_at, 1, 10) >= ?"); values.push(from) }
  if (to) { where.push("substr(created_at, 1, 10) <= ?"); values.push(to) }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : ""
  const rows = db
    .prepare(`SELECT id, items, total, discount, payment_method as paymentMethod, created_at as createdAt FROM transactions${whereSql}`)
    .all(...values) as TxRow[]
  return rows.map((r) => ({
    ...r,
    items: safeJsonParse<CartItem[]>(r.items) ?? [],
    date: r.createdAt.slice(0, 10),
  }))
}

router.get("/summary", (req, res) => {
  const from = typeof req.query.from === "string" ? req.query.from : undefined
  const to = typeof req.query.to === "string" ? req.query.to : undefined
  const txs = getTransactions(from, to)

  const totalRevenue = txs.reduce((s, t) => s + t.total, 0)
  const totalDiscount = txs.reduce((s, t) => s + t.discount, 0)
  const itemCount = txs.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0)

  const byMethod: Record<string, number> = {}
  for (const t of txs) byMethod[t.paymentMethod] = (byMethod[t.paymentMethod] || 0) + t.total

  const dailyMap = new Map<string, { count: number; revenue: number }>()
  for (const t of txs) {
    const cur = dailyMap.get(t.date) || { count: 0, revenue: 0 }
    cur.count += 1
    cur.revenue += t.total
    dailyMap.set(t.date, cur)
  }
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    count: txs.length,
    totalRevenue,
    totalDiscount,
    itemCount,
    avgPerTx: txs.length ? Math.round(totalRevenue / txs.length) : 0,
    byMethod,
    daily,
  })
})

router.get("/by-product", (req, res) => {
  const from = typeof req.query.from === "string" ? req.query.from : undefined
  const to = typeof req.query.to === "string" ? req.query.to : undefined
  const txs = getTransactions(from, to)

  const map = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const t of txs) {
    for (const item of t.items) {
      const cur = map.get(item.productId) || { name: item.name, qty: 0, revenue: 0 }
      cur.qty += item.qty
      cur.revenue += item.price * item.qty
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
  const from = typeof req.query.from === "string" ? req.query.from : undefined
  const to = typeof req.query.to === "string" ? req.query.to : undefined
  const txs = getTransactions(from, to)

  const products = db.prepare("SELECT id, category_id as categoryId FROM products").all() as { id: string; categoryId: string }[]
  const productCat = new Map(products.map((p) => [p.id, p.categoryId]))
  const categories = db.prepare("SELECT id, name FROM categories").all() as { id: string; name: string }[]

  const map = new Map<string, { categoryId: string; name: string; revenue: number; qty: number }>()
  for (const t of txs) {
    for (const item of t.items) {
      const categoryId = productCat.get(item.productId) || "uncategorized"
      const cat = categories.find((c) => c.id === categoryId)
      const name = cat ? cat.name : "Tanpa Kategori"
      const cur = map.get(categoryId) || { categoryId, name, revenue: 0, qty: 0 }
      cur.qty += item.qty
      cur.revenue += item.price * item.qty
      map.set(categoryId, cur)
    }
  }
  const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)

  res.json({ data: rows })
})

export default router
