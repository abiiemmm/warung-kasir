import { Router } from "express"
import { db, generateId } from "../db"
import { categorySchema, categoryUpdateSchema } from "../validation"
import { HttpError } from "../utils"
import { writeLog } from "../audit"

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
  writeLog(req, { action: "created", entity: "category", entityId: id, entityName: name, details: `Kategori "${name}" dibuat` })
  res.json({ id, name, createdAt })
})

router.put("/:id", (req, res) => {
  const { name } = categoryUpdateSchema.parse(req.body)
  const existing = db.prepare("SELECT name FROM categories WHERE id = ?").get(req.params.id) as
    | { name: string }
    | undefined
  if (!existing) throw new HttpError(404, "Kategori tidak ditemukan")

  db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, req.params.id)
  writeLog(req, {
    action: "updated",
    entity: "category",
    entityId: req.params.id,
    entityName: name,
    details: `Kategori "${existing.name}" diganti menjadi "${name}"`,
  })
  const row = db.prepare(`SELECT ${selectColumns} FROM categories WHERE id = ?`).get(req.params.id)
  res.json(row)
})

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT name FROM categories WHERE id = ?").get(req.params.id) as
    | { name: string }
    | undefined
  if (!existing) throw new HttpError(404, "Kategori tidak ditemukan")

  const used = db.prepare("SELECT COUNT(*) as c FROM products WHERE category_id = ?").get(req.params.id) as { c: number }
  if (used.c > 0) {
    throw new HttpError(400, `Kategori masih dipakai oleh ${used.c} produk. Pindahkan atau hapus produknya dulu.`)
  }

  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id)
  writeLog(req, {
    action: "deleted",
    entity: "category",
    entityId: req.params.id,
    entityName: existing.name,
    details: `Kategori "${existing.name}" dihapus`,
  })
  res.json({ success: true })
})

export default router
