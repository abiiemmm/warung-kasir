import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto"
import type { NextFunction, Request, Response } from "express"
import { db, generateId } from "./db"
import { HttpError } from "./utils"
import type { AuthUser, UserRole } from "./types"

export const SESSION_COOKIE = "warung_session"

/** Sesi berumur 12 jam — kira-kira satu hari kerja warung, jadi kasir tidak perlu login berulang. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

const SCRYPT_KEYLEN = 64

export function hashPin(pin: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt ?? randomBytes(16).toString("hex")
  return { hash: scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex"), salt }
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const expected = Buffer.from(hash, "hex")
  const candidate = scryptSync(pin, salt, SCRYPT_KEYLEN)
  if (expected.length !== candidate.length) return false
  return timingSafeEqual(expected, candidate)
}

/** Token mentah hanya ada di cookie; database menyimpan hash-nya saja. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("hex")
  const now = Date.now()
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString()
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    userId,
    new Date(now).toISOString(),
    expiresAt
  )
  return { token, expiresAt }
}

export function destroySession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token))
}

export function purgeExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString())
}

function lookupSession(token: string): AuthUser | undefined {
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.role, s.expires_at as expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND u.active = 1`
    )
    .get(hashToken(token)) as { id: string; name: string; role: UserRole; expiresAt: string } | undefined

  if (!row) return undefined
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    destroySession(token)
    return undefined
  }
  return { id: row.id, name: row.name, role: row.role }
}

export function setSessionCookie(res: Response, token: string): void {
  // SameSite=Strict adalah pertahanan utama terhadap CSRF: browser tidak pernah
  // mengirim cookie ini pada request yang berasal dari situs lain.
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (process.env.COOKIE_SECURE === "true") parts.push("Secure")
  res.append("Set-Cookie", parts.join("; "))
}

export function clearSessionCookie(res: Response): void {
  res.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) throw new HttpError(401, "Silakan login terlebih dahulu")
  const user = lookupSession(token)
  if (!user) throw new HttpError(401, "Sesi sudah berakhir, silakan login lagi")
  req.user = user
  next()
}

export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new HttpError(401, "Silakan login terlebih dahulu")
  if (req.user.role !== "owner") throw new HttpError(403, "Hanya pemilik yang boleh melakukan tindakan ini")
  next()
}

// ---------- Pembatasan percobaan login ----------
//
// Dibatasi per nama akun, bukan per IP: frontend mem-proxy /api, sehingga
// backend melihat seluruh kasir datang dari satu IP yang sama dan limiter
// berbasis IP akan mengunci semua orang sekaligus.

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 5 * 60 * 1000
const failedLogins = new Map<string, { count: number; lockedUntil: number }>()

function loginKey(name: string): string {
  return name.trim().toLowerCase()
}

/** Sisa detik penguncian, atau 0 bila akun boleh mencoba login. */
export function loginLockoutSeconds(name: string): number {
  const entry = failedLogins.get(loginKey(name))
  if (!entry) return 0
  const remaining = entry.lockedUntil - Date.now()
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

export function recordLoginFailure(name: string): void {
  const key = loginKey(name)
  const entry = failedLogins.get(key) ?? { count: 0, lockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS
    entry.count = 0
  }
  failedLogins.set(key, entry)
}

export function recordLoginSuccess(name: string): void {
  failedLogins.delete(loginKey(name))
}

/**
 * Memastikan selalu ada satu akun pemilik supaya aplikasi tidak pernah terkunci.
 * Dipanggil saat startup; tidak menimpa akun yang sudah ada.
 */
export function ensureDefaultOwner(): { created: boolean; pin: string | null } {
  const existing = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }
  if (existing.c > 0) return { created: false, pin: null }

  const pin = process.env.OWNER_PIN || "111111"
  const { hash, salt } = hashPin(pin)
  db.prepare(
    "INSERT INTO users (id, name, pin_hash, pin_salt, role, active, created_at) VALUES (?, ?, ?, ?, 'owner', 1, ?)"
  ).run(generateId(), "Pemilik", hash, salt, new Date().toISOString())

  return { created: true, pin }
}
