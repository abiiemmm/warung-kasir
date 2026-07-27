import { Router } from "express"
import { db, generateId } from "../db"

const router = Router()

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, name, created_at as createdAt FROM categories ORDER BY name").all()
  res.json(rows)
})

router.post("/", (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: "Name is required" })
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)").run(id, name, createdAt)
  res.json({ id, name, createdAt })
})

router.put("/:id", (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: "Name is required" })
  const result = db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: "Not found" })
  const row = db.prepare("SELECT id, name, created_at as createdAt FROM categories WHERE id = ?").get(req.params.id)
  res.json(row)
})

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

export default router
