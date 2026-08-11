import { Router } from "express"
import { db, generateId } from "../db"
import { productSchema, productUpdateSchema, stockPatchSchema } from "../validation"
import { HttpError } from "../utils"

const router = Router()

const selectColumns = "id, name, price, stock, category_id as categoryId, image, barcode, created_at as createdAt"

function mapProduct(row: Record<string, unknown>) {
  return {
    ...row,
    image: row.image || undefined,
    barcode: row.barcode || undefined,
  }
}

router.get("/", (req, res) => {
  const { search, categoryId } = req.query
  let sql = `SELECT ${selectColumns} FROM products`
  const where: string[] = []
  const values: unknown[] = []
  if (search) {
    where.push("(LOWER(name) LIKE ? OR barcode LIKE ?)")
    const like = `%${String(search).toLowerCase()}%`
    values.push(like, like)
  }
  if (categoryId) {
    where.push("category_id = ?")
    values.push(categoryId)
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`
  sql += " ORDER BY name"
  const rows = db.prepare(sql).all(...values) as Record<string, unknown>[]
  res.json(rows.map(mapProduct))
})

router.post("/", (req, res) => {
  const data = productSchema.parse(req.body)
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO products (id, name, price, stock, category_id, image, barcode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.name, data.price, data.stock, data.categoryId, data.image || null, data.barcode || null, createdAt)
  res.json({ ...data, id, createdAt, image: data.image || undefined })
})

router.put("/:id", (req, res) => {
  const data = productUpdateSchema.parse(req.body)
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id)
  if (!existing) throw new HttpError(404, "Produk tidak ditemukan")

  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name) }
  if (data.price !== undefined) { fields.push("price = ?"); values.push(data.price) }
  if (data.stock !== undefined) { fields.push("stock = ?"); values.push(data.stock) }
  if (data.categoryId !== undefined) { fields.push("category_id = ?"); values.push(data.categoryId) }
  if (data.image !== undefined) { fields.push("image = ?"); values.push(data.image || null) }
  if (data.barcode !== undefined) { fields.push("barcode = ?"); values.push(data.barcode || null) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const row = db.prepare(`SELECT ${selectColumns} FROM products WHERE id = ?`).get(req.params.id) as Record<string, unknown>
  res.json(mapProduct(row))
})

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

router.patch("/:id/stock", (req, res) => {
  const { qty } = stockPatchSchema.parse(req.body)
  const existing = db.prepare("SELECT id, stock FROM products WHERE id = ?").get(req.params.id) as { id: string; stock: number } | undefined
  if (!existing) throw new HttpError(404, "Produk tidak ditemukan")
  const newStock = Math.max(0, existing.stock + qty)
  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newStock, req.params.id)
  res.json({ stock: newStock })
})

export default router
