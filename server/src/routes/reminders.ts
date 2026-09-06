import { Router } from "express"
import { db, generateId } from "../db"
import { reminderSchema, reminderUpdateSchema } from "../validation"
import { HttpError } from "../utils"
import { writeLog } from "../audit"

const router = Router()

const selectColumns = "id, date, title, product_id as productId, notes, created_at as createdAt"

function mapReminder(row: Record<string, unknown>) {
  return { ...row, productId: row.productId || undefined }
}

router.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT ${selectColumns} FROM reminders ORDER BY date ASC`).all() as Record<string, unknown>[]
  res.json(rows.map(mapReminder))
})

router.post("/", (req, res) => {
  const data = reminderSchema.parse(req.body)
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO reminders (id, date, title, product_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, data.date, data.title, data.productId || null, data.notes || "", createdAt)

  writeLog(req, { action: "created", entity: "reminder", entityId: id, entityName: data.title, details: `Pengingat "${data.title}" dibuat` })
  res.json({ id, date: data.date, title: data.title, productId: data.productId || undefined, notes: data.notes || "", createdAt })
})

router.put("/:id", (req, res) => {
  const data = reminderUpdateSchema.parse(req.body)
  const existing = db.prepare("SELECT id, title FROM reminders WHERE id = ?").get(req.params.id) as
    | { id: string; title: string }
    | undefined
  if (!existing) throw new HttpError(404, "Pengingat tidak ditemukan")

  const fields: string[] = []
  const values: unknown[] = []
  if (data.date !== undefined) { fields.push("date = ?"); values.push(data.date) }
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title) }
  if (data.productId !== undefined) { fields.push("product_id = ?"); values.push(data.productId || null) }
  if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const row = db.prepare(`SELECT ${selectColumns} FROM reminders WHERE id = ?`).get(req.params.id) as Record<string, unknown>
  writeLog(req, {
    action: "updated",
    entity: "reminder",
    entityId: existing.id,
    entityName: String(row.title),
    details: `Pengingat "${existing.title}" diperbarui`,
  })
  res.json(mapReminder(row))
})

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT id, title FROM reminders WHERE id = ?").get(req.params.id) as
    | { id: string; title: string }
    | undefined
  if (!existing) throw new HttpError(404, "Pengingat tidak ditemukan")

  db.prepare("DELETE FROM reminders WHERE id = ?").run(req.params.id)
  writeLog(req, {
    action: "deleted",
    entity: "reminder",
    entityId: existing.id,
    entityName: existing.title,
    details: `Pengingat "${existing.title}" dihapus`,
  })
  res.json({ success: true })
})

export default router
