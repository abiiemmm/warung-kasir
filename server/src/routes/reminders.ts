import { Router } from "express"
import { db, generateId } from "../db"

const router = Router()

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, date, title, product_id as productId, notes, created_at as createdAt FROM reminders ORDER BY date ASC").all()
  res.json(rows)
})

router.post("/", (req, res) => {
  const { date, title, productId, notes } = req.body
  if (!date || !title) return res.status(400).json({ error: "Date and title are required" })
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare("INSERT INTO reminders (id, date, title, product_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, date, title, productId || null, notes || "", createdAt)
  res.json({ id, date, title, productId: productId || undefined, notes: notes || "", createdAt })
})

router.put("/:id", (req, res) => {
  const { date, title, productId, notes } = req.body
  const existing = db.prepare("SELECT id FROM reminders WHERE id = ?").get(req.params.id)
  if (!existing) return res.status(404).json({ error: "Not found" })

  const fields: string[] = []
  const values: unknown[] = []
  if (date !== undefined) { fields.push("date = ?"); values.push(date) }
  if (title !== undefined) { fields.push("title = ?"); values.push(title) }
  if (productId !== undefined) { fields.push("product_id = ?"); values.push(productId || null) }
  if (notes !== undefined) { fields.push("notes = ?"); values.push(notes) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const row = db.prepare("SELECT id, date, title, product_id as productId, notes, created_at as createdAt FROM reminders WHERE id = ?").get(req.params.id) as Record<string, unknown>
  res.json({ ...row, productId: row.productId || undefined })
})

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM reminders WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

export default router
