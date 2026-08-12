import { Router } from "express"
import { db } from "../db"
import { paginate, parsePagination } from "../utils"

const router = Router()

const selectColumns = `
  id, action, entity, entity_id as entityId, entity_name as entityName,
  details, user_id as userId, user_name as userName, timestamp
`

/**
 * Log hanya bisa dibaca. Penulisannya dilakukan server sendiri (lihat audit.ts)
 * supaya jejak audit tidak bisa dipalsukan atau dilewati oleh klien.
 */
router.get("/", (req, res) => {
  const { entity, action, q, userId } = req.query
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined

  const where: string[] = []
  const values: unknown[] = []
  if (entity) { where.push("entity = ?"); values.push(entity) }
  if (action) { where.push("action = ?"); values.push(action) }
  if (userId) { where.push("user_id = ?"); values.push(userId) }
  if (q) {
    where.push("(LOWER(entity_name) LIKE ? OR LOWER(details) LIKE ? OR LOWER(user_name) LIKE ?)")
    const like = `%${String(q).toLowerCase()}%`
    values.push(like, like, like)
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
    const rows = db.prepare(`SELECT ${selectColumns} FROM logs${whereSql} ORDER BY timestamp DESC LIMIT 500`).all(...values)
    res.json(rows)
  }
})

export default router
