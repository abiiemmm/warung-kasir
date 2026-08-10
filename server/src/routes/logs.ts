import { Router } from "express"
import { db, generateId } from "../db"
import { logSchema } from "../validation"
import { paginate, parsePagination } from "../utils"

const router = Router()

const selectColumns = "id, action, entity, entity_id as entityId, entity_name as entityName, details, timestamp"

router.get("/", (req, res) => {
  const { entity, action, q } = req.query
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined

  const where: string[] = []
  const values: unknown[] = []
  if (entity) { where.push("entity = ?"); values.push(entity) }
  if (action) { where.push("action = ?"); values.push(action) }
  if (q) {
    where.push("(LOWER(entity_name) LIKE ? OR LOWER(details) LIKE ?)")
    const like = `%${String(q).toLowerCase()}%`
    values.push(like, like)
  }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : ""

  if (hasPagination) {
    const { page, limit, offset } = parsePagination(req.query)
    const totalRow = db.prepare(`SELECT COUNT(*) as c FROM logs${whereSql}`).get(...values) as { c: number }
    const rows = db
      .prepare(`SELECT ${selectColumns} FROM logs${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
      .all(...values, limit, offset)
    res.json(paginate(rows, totalRow.c, page, limit))
  } else {
    const rows = db.prepare(`SELECT ${selectColumns} FROM logs${whereSql} ORDER BY timestamp DESC`).all(...values)
    res.json(rows)
  }
})

router.post("/", (req, res) => {
  const data = logSchema.parse(req.body)
  const id = generateId()
  const timestamp = new Date().toISOString()
  db.prepare(
    "INSERT INTO logs (id, action, entity, entity_id, entity_name, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.action, data.entity, data.entityId || "", data.entityName || "", data.details || "", timestamp)
  res.json({ id, ...data, entityId: data.entityId || "", entityName: data.entityName || "", details: data.details || "", timestamp })
})

export default router
