import { Router } from "express"
import { db, generateId } from "../db"

const router = Router()

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, action, entity, entity_id as entityId, entity_name as entityName, details, timestamp FROM logs ORDER BY timestamp DESC").all()
  res.json(rows)
})

router.post("/", (req, res) => {
  const { action, entity, entityId, entityName, details } = req.body
  if (!action || !entity) return res.status(400).json({ error: "Action and entity are required" })
  const id = generateId()
  const timestamp = new Date().toISOString()
  db.prepare("INSERT INTO logs (id, action, entity, entity_id, entity_name, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, action, entity, entityId || "", entityName || "", details || "", timestamp)
  res.json({ id, action, entity, entityId: entityId || "", entityName: entityName || "", details: details || "", timestamp })
})

export default router
