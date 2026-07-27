import { Router } from "express"
import { db, generateId } from "../db"

const router = Router()

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, name, price, stock, category_id as categoryId, image, created_at as createdAt FROM products ORDER BY name").all()
  res.json(rows)
})

router.post("/", (req, res) => {
  const { name, price, stock, categoryId, image } = req.body
  if (!name || price === undefined || stock === undefined || !categoryId) return res.status(400).json({ error: "Missing required fields" })
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare("INSERT INTO products (id, name, price, stock, category_id, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, name, price, stock, categoryId, image || null, createdAt)
  res.json({ id, name, price, stock, categoryId, image: image || undefined, createdAt })
})

router.put("/:id", (req, res) => {
  const { name, price, stock, categoryId, image } = req.body
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id)
  if (!existing) return res.status(404).json({ error: "Not found" })

  const fields: string[] = []
  const values: unknown[] = []
  if (name !== undefined) { fields.push("name = ?"); values.push(name) }
  if (price !== undefined) { fields.push("price = ?"); values.push(price) }
  if (stock !== undefined) { fields.push("stock = ?"); values.push(stock) }
  if (categoryId !== undefined) { fields.push("category_id = ?"); values.push(categoryId) }
  if (image !== undefined) { fields.push("image = ?"); values.push(image || null) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const row = db.prepare("SELECT id, name, price, stock, category_id as categoryId, image, created_at as createdAt FROM products WHERE id = ?").get(req.params.id) as Record<string, unknown>
  res.json({ ...row, image: row.image || undefined })
})

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

router.patch("/:id/stock", (req, res) => {
  const { qty } = req.body
  if (qty === undefined) return res.status(400).json({ error: "qty is required" })
  const existing = db.prepare("SELECT id, stock FROM products WHERE id = ?").get(req.params.id) as { id: string; stock: number } | undefined
  if (!existing) return res.status(404).json({ error: "Not found" })
  const newStock = Math.max(0, existing.stock - qty)
  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newStock, req.params.id)
  res.json({ stock: newStock })
})

export default router
