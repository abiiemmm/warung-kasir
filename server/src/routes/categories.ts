import { Router } from "express"
import { db, generateId } from "../db"
import { categorySchema, categoryUpdateSchema } from "../validation"
import { HttpError } from "../utils"

const router = Router()

const selectColumns = "id, name, created_at as createdAt"

router.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT ${selectColumns} FROM categories ORDER BY name`).all()
  res.json(rows)
})

router.post("/", (req, res) => {
  const { name } = categorySchema.parse(req.body)
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)").run(id, name, createdAt)
  res.json({ id, name, createdAt })
})

router.put("/:id", (req, res) => {
  const { name } = categoryUpdateSchema.parse(req.body)
  const result = db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, req.params.id)
  if (result.changes === 0) throw new HttpError(404, "Kategori tidak ditemukan")
  const row = db.prepare(`SELECT ${selectColumns} FROM categories WHERE id = ?`).get(req.params.id)
  res.json(row)
})

router.delete("/:id", (req, res) => {
  const used = db.prepare("SELECT COUNT(*) as c FROM products WHERE category_id = ?").get(req.params.id) as { c: number }
  if (used.c > 0) throw new HttpError(400, `Kategori masih dipakai oleh ${used.c} produk. Pindahkan atau hapus produknya dulu.`)
  const result = db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

export default router
