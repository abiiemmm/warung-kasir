import type { Request } from "express"
import { db, generateId } from "./db"

export interface AuditEntry {
  action: string
  entity: string
  entityId?: string
  entityName?: string
  details?: string
}

const insertLog = () =>
  db.prepare(
    `INSERT INTO logs (id, action, entity, entity_id, entity_name, details, user_id, user_name, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

/**
 * Audit trail ditulis oleh server, bukan client — supaya siapa pun yang memanggil
 * API (termasuk lewat curl) tetap meninggalkan jejak yang tidak bisa dipalsukan.
 */
export function writeLog(req: Request, entry: AuditEntry): void {
  const user = req.user
  insertLog().run(
    generateId(),
    entry.action,
    entry.entity,
    entry.entityId || "",
    entry.entityName || "",
    entry.details || "",
    user?.id || "",
    user?.name || "Sistem",
    new Date().toISOString()
  )
}

/** Versi tanpa request, untuk kejadian yang dipicu sistem sendiri. */
export function writeSystemLog(entry: AuditEntry): void {
  insertLog().run(
    generateId(),
    entry.action,
    entry.entity,
    entry.entityId || "",
    entry.entityName || "",
    entry.details || "",
    "",
    "Sistem",
    new Date().toISOString()
  )
}
