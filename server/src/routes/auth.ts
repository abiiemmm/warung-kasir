import { Router } from "express"
import { db, generateId } from "../db"
import { loginSchema, userCreateSchema, userUpdateSchema, changePinSchema } from "../validation"
import { HttpError } from "../utils"
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroySession,
  hashPin,
  loginLockoutSeconds,
  purgeExpiredSessions,
  readCookie,
  recordLoginFailure,
  recordLoginSuccess,
  requireAuth,
  requireOwner,
  setSessionCookie,
  verifyPin,
} from "../auth"
import { writeLog } from "../audit"
import type { UserRole } from "../types"

const authRouter = Router()
const usersRouter = Router()

interface UserRow {
  id: string
  name: string
  pinHash: string
  pinSalt: string
  role: UserRole
  active: number
}

authRouter.post("/login", (req, res) => {
  const { name, pin } = loginSchema.parse(req.body)

  const lockedFor = loginLockoutSeconds(name)
  if (lockedFor > 0) {
    throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi dalam ${lockedFor} detik.`)
  }

  const row = db
    .prepare(
      "SELECT id, name, pin_hash as pinHash, pin_salt as pinSalt, role, active FROM users WHERE LOWER(name) = LOWER(?)"
    )
    .get(name) as UserRow | undefined

  // Pesan error sengaja disamakan agar tidak membocorkan nama akun mana yang ada.
  const invalid = new HttpError(401, "Nama atau PIN salah")
  if (!row || !row.active || !verifyPin(pin, row.pinHash, row.pinSalt)) {
    recordLoginFailure(name)
    throw invalid
  }

  recordLoginSuccess(name)
  purgeExpiredSessions()
  const { token } = createSession(row.id)
  setSessionCookie(res, token)

  req.user = { id: row.id, name: row.name, role: row.role }
  writeLog(req, { action: "login", entity: "user", entityId: row.id, entityName: row.name, details: `${row.name} masuk` })

  res.json({ id: row.id, name: row.name, role: row.role })
})

authRouter.post("/logout", (req, res) => {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) destroySession(token)
  clearSessionCookie(res)
  res.json({ success: true })
})

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user)
})

authRouter.post("/change-pin", requireAuth, (req, res) => {
  const { currentPin, newPin } = changePinSchema.parse(req.body)
  const row = db
    .prepare("SELECT id, name, pin_hash as pinHash, pin_salt as pinSalt, role, active FROM users WHERE id = ?")
    .get(req.user!.id) as UserRow | undefined
  if (!row) throw new HttpError(404, "Pengguna tidak ditemukan")
  if (!verifyPin(currentPin, row.pinHash, row.pinSalt)) throw new HttpError(400, "PIN lama salah")

  const { hash, salt } = hashPin(newPin)
  db.prepare("UPDATE users SET pin_hash = ?, pin_salt = ? WHERE id = ?").run(hash, salt, row.id)
  writeLog(req, { action: "updated", entity: "user", entityId: row.id, entityName: row.name, details: "PIN diganti" })
  res.json({ success: true })
})

// ---------- Manajemen pengguna (khusus pemilik) ----------

const selectUser = "id, name, role, active, created_at as createdAt"

usersRouter.use(requireAuth, requireOwner)

usersRouter.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT ${selectUser} FROM users ORDER BY name`).all() as Record<string, unknown>[]
  res.json(rows.map((r) => ({ ...r, active: r.active === 1 })))
})

usersRouter.post("/", (req, res) => {
  const data = userCreateSchema.parse(req.body)
  const exists = db.prepare("SELECT id FROM users WHERE LOWER(name) = LOWER(?)").get(data.name)
  if (exists) throw new HttpError(400, "Nama pengguna sudah dipakai")

  const id = generateId()
  const createdAt = new Date().toISOString()
  const { hash, salt } = hashPin(data.pin)
  db.prepare(
    "INSERT INTO users (id, name, pin_hash, pin_salt, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
  ).run(id, data.name, hash, salt, data.role, createdAt)

  writeLog(req, { action: "created", entity: "user", entityId: id, entityName: data.name, details: `Pengguna "${data.name}" (${data.role}) dibuat` })
  res.json({ id, name: data.name, role: data.role, active: true, createdAt })
})

usersRouter.put("/:id", (req, res) => {
  const data = userUpdateSchema.parse(req.body)
  const target = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(req.params.id) as
    | { id: string; name: string; role: UserRole }
    | undefined
  if (!target) throw new HttpError(404, "Pengguna tidak ditemukan")

  // Jangan sampai tidak tersisa satu pun pemilik yang aktif.
  const losesOwner = (data.role !== undefined && data.role !== "owner") || data.active === false
  if (target.role === "owner" && losesOwner) {
    const otherOwners = db
      .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'owner' AND active = 1 AND id != ?")
      .get(target.id) as { c: number }
    if (otherOwners.c === 0) throw new HttpError(400, "Harus ada minimal satu pemilik yang aktif")
  }

  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) {
    const clash = db.prepare("SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND id != ?").get(data.name, target.id)
    if (clash) throw new HttpError(400, "Nama pengguna sudah dipakai")
    fields.push("name = ?"); values.push(data.name)
  }
  if (data.role !== undefined) { fields.push("role = ?"); values.push(data.role) }
  if (data.active !== undefined) { fields.push("active = ?"); values.push(data.active ? 1 : 0) }
  if (data.pin !== undefined) {
    const { hash, salt } = hashPin(data.pin)
    fields.push("pin_hash = ?", "pin_salt = ?"); values.push(hash, salt)
  }

  if (fields.length > 0) {
    values.push(target.id)
    db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  // Menonaktifkan akun harus langsung memutus sesi yang sedang berjalan.
  if (data.active === false || data.pin !== undefined) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(target.id)
  }

  const row = db.prepare(`SELECT ${selectUser} FROM users WHERE id = ?`).get(target.id) as Record<string, unknown>
  writeLog(req, { action: "updated", entity: "user", entityId: target.id, entityName: String(row.name), details: `Pengguna "${target.name}" diperbarui` })
  res.json({ ...row, active: row.active === 1 })
})

usersRouter.delete("/:id", (req, res) => {
  const target = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(req.params.id) as
    | { id: string; name: string; role: UserRole }
    | undefined
  if (!target) throw new HttpError(404, "Pengguna tidak ditemukan")
  if (target.id === req.user!.id) throw new HttpError(400, "Tidak bisa menghapus akun sendiri")
  if (target.role === "owner") {
    const otherOwners = db
      .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'owner' AND active = 1 AND id != ?")
      .get(target.id) as { c: number }
    if (otherOwners.c === 0) throw new HttpError(400, "Harus ada minimal satu pemilik yang aktif")
  }

  // Riwayat shift mereferensikan users(id); hapus permanen akan merusak jejak audit.
  const shiftCount = db.prepare("SELECT COUNT(*) as c FROM shifts WHERE user_id = ?").get(target.id) as { c: number }
  if (shiftCount.c > 0) {
    throw new HttpError(400, "Pengguna sudah punya riwayat shift. Nonaktifkan saja agar riwayat tetap tersimpan.")
  }

  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(target.id)
  db.prepare("DELETE FROM users WHERE id = ?").run(target.id)
  writeLog(req, { action: "deleted", entity: "user", entityId: target.id, entityName: target.name, details: `Pengguna "${target.name}" dihapus` })
  res.json({ success: true })
})

export { authRouter, usersRouter }
