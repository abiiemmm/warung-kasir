import { Router } from "express"
import { db, generateId } from "../db"

const router = Router()

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, items, total, payment, change, created_at as createdAt FROM transactions ORDER BY created_at DESC").all() as {
    id: string; items: string; total: number; payment: number; change: number; createdAt: string
  }[]
  res.json(rows.map((r) => ({ ...r, items: JSON.parse(r.items) })))
})

router.post("/", (req, res) => {
  const { items, total, payment, change } = req.body
  if (!items || total === undefined) return res.status(400).json({ error: "Missing required fields" })
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare("INSERT INTO transactions (id, items, total, payment, change, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, JSON.stringify(items), total, payment, change, createdAt)
  res.json({ id, items, total, payment, change, createdAt })
})

export default router
