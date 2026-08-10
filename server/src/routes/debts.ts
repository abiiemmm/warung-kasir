import { Router } from "express"
import { db, generateId } from "../db"
import { debtSchema, debtUpdateSchema, debtStatusSchema, debtPaymentSchema } from "../validation"
import { HttpError } from "../utils"
import type { Debt } from "../types"

const router = Router()

const selectColumns = `
  id, customer_name as customerName, description, amount,
  amount - IFNULL((SELECT SUM(amount) FROM debt_payments WHERE debt_id = debts.id), 0) AS remaining,
  CASE WHEN amount - IFNULL((SELECT SUM(amount) FROM debt_payments WHERE debt_id = debts.id), 0) <= 0 THEN 'paid' ELSE 'pending' END AS status,
  created_at as createdAt
`

function getDebt(id: string): Debt | undefined {
  return db.prepare(`SELECT ${selectColumns} FROM debts WHERE id = ?`).get(id) as Debt | undefined
}

router.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT ${selectColumns} FROM debts ORDER BY created_at DESC`).all()
  res.json(rows)
})

router.get("/:id", (req, res) => {
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  res.json(debt)
})

router.get("/:id/payments", (req, res) => {
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  const rows = db
    .prepare("SELECT id, debt_id as debtId, amount, note, created_at as createdAt FROM debt_payments WHERE debt_id = ? ORDER BY created_at DESC")
    .all(req.params.id)
  res.json(rows)
})

router.post("/", (req, res) => {
  const data = debtSchema.parse(req.body)
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO debts (id, customer_name, description, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, data.customerName, data.description || "", data.amount, data.status || "pending", createdAt)
  res.json({ ...data, id, remaining: data.amount, createdAt, status: data.status || "pending", description: data.description || "" })
})

router.put("/:id", (req, res) => {
  const data = debtUpdateSchema.parse(req.body)
  if (!getDebt(req.params.id)) throw new HttpError(404, "Piutang tidak ditemukan")

  const fields: string[] = []
  const values: unknown[] = []
  if (data.customerName !== undefined) { fields.push("customer_name = ?"); values.push(data.customerName) }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description) }
  if (data.amount !== undefined) { fields.push("amount = ?"); values.push(data.amount) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE debts SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const debt = getDebt(req.params.id)!
  const storedStatus = debt.remaining <= 0 ? "paid" : "pending"
  db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(storedStatus, req.params.id)
  res.json({ ...debt, status: storedStatus })
})

router.patch("/:id/status", (req, res) => {
  const { status } = debtStatusSchema.parse(req.body)
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")

  if (status === "paid" && debt.remaining > 0) {
    const id = generateId()
    db.prepare(
      "INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, debt.id, debt.remaining, "Pelunasan", new Date().toISOString())
  }

  db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(status, req.params.id)
  res.json(getDebt(req.params.id))
})

router.post("/:id/payments", (req, res) => {
  const data = debtPaymentSchema.parse(req.body)
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  if (data.amount > debt.remaining) throw new HttpError(400, `Pembayaran melebihi sisa piutang (${debt.remaining})`)

  const id = generateId()
  db.prepare(
    "INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, req.params.id, data.amount, data.note || "", new Date().toISOString())

  const updated = getDebt(req.params.id)!
  db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(updated.remaining <= 0 ? "paid" : "pending", req.params.id)
  res.json(getDebt(req.params.id))
})

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM debt_payments WHERE debt_id = ?").run(req.params.id)
  const result = db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id)
  res.json({ success: result.changes > 0 })
})

export default router
