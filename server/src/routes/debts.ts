import { Router } from "express"
import { db, generateId } from "../db"

const router = Router()

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, customer_name as customerName, description, amount, status, created_at as createdAt FROM debts ORDER BY created_at DESC").all()
  res.json(rows)
})

router.post("/", (req, res) => {
  const { customerName, description, amount, status } = req.body
  if (!customerName || amount === undefined) return res.status(400).json({ error: "Missing required fields" })
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare("INSERT INTO debts (id, customer_name, description, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, customerName, description || "", amount, status || "pending", createdAt)
  res.json({ id, customerName, description: description || "", amount, status: status || "pending", createdAt })
})

router.put("/:id", (req, res) => {
  const { customerName, description, amount } = req.body
  const existing = db.prepare("SELECT id FROM debts WHERE id = ?").get(req.params.id)
  if (!existing) return res.status(404).json({ error: "Not found" })

  const fields: string[] = []
  const values: unknown[] = []
  if (customerName !== undefined) { fields.push("customer_name = ?"); values.push(customerName) }
  if (description !== undefined) { fields.push("description = ?"); values.push(description) }
  if (amount !== undefined) { fields.push("amount = ?"); values.push(amount) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE debts SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const row = db.prepare("SELECT id, customer_name as customerName, description, amount, status, created_at as createdAt FROM debts WHERE id = ?").get(req.params.id)
  res.json(row)
})

router.patch("/:id/status", (req, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ error: "Status is required" })
  const result = db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(status, req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: "Not found" })
  const row = db.prepare("SELECT id, customer_name as customerName, description, amount, status, created_at as createdAt FROM debts WHERE id = ?").get(req.params.id)
  res.json(row)
})

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

export default router
