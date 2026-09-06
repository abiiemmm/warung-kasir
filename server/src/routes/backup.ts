import { Router } from "express"
import express from "express"
import os from "os"
import path from "path"
import fs from "fs"
import { randomBytes } from "crypto"
import Database from "better-sqlite3"
import { db, DB_PATH, closeDb, reopenDb } from "../db"
import { HttpError } from "../utils"
import { seed } from "../seed"
import { resetSchema } from "../validation"
import { writeLog } from "../audit"
import { ensureDefaultOwner } from "../auth"
import { requireContentType } from "../middleware"

const backupRouter = Router()
const exportRouter = Router()
const restoreRouter = Router()
const resetRouter = Router()

/**
 * Nama acak (bukan tanggal) supaya file sementara berisi salinan database tidak
 * bisa ditebak oleh pengguna lain di mesin yang sama, lalu selalu dihapus baik
 * sukses maupun gagal.
 */
function tempFilePath(prefix: string, ext: string): string {
  return path.join(os.tmpdir(), `${prefix}-${randomBytes(8).toString("hex")}.${ext}`)
}

backupRouter.get("/", (_req, res) => {
  const tmp = tempFilePath("warung-backup", "db")
  db.backup(tmp)
    .then(() => {
      res.download(tmp, "warung-backup.db", () => {
        fs.rm(tmp, { force: true }, () => {})
      })
    })
    .catch((err) => {
      fs.rm(tmp, { force: true }, () => {})
      console.error(err)
      res.status(500).json({ error: "Gagal membuat backup" })
    })
})

const TABLES = ["categories", "products", "transactions", "debts", "debt_payments", "reminders", "logs"]

exportRouter.get("/", (_req, res) => {
  const data: Record<string, unknown> = {}
  for (const table of TABLES) {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all()
  }
  const tmp = tempFilePath("warung-export", "json")
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
    res.download(tmp, "warung-data-export.json", () => {
      fs.rm(tmp, { force: true }, () => {})
    })
  } catch (err) {
    fs.rm(tmp, { force: true }, () => {})
    console.error(err)
    res.status(500).json({ error: "Gagal membuat export" })
  }
})

restoreRouter.post(
  "/",
  // Wajib octet-stream: menutup celah CSRF karena content-type ini selalu memicu
  // preflight, sehingga request lintas situs diblokir CORS sebelum sampai ke sini.
  requireContentType("application/octet-stream"),
  express.raw({ type: "application/octet-stream", limit: "50mb" }),
  (req, res) => {
    const buf = req.body as Buffer
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      throw new HttpError(400, "File kosong. Pilih file backup .db yang valid.")
    }

    const tmp = path.join(os.tmpdir(), `warung-restore-${Date.now()}.db`)
    fs.writeFileSync(tmp, buf)

    let src: Database.Database | null = null
    try {
      src = new Database(tmp, { readonly: true })
      const check = src.pragma("integrity_check", { simple: true }) as unknown
      if (check !== "ok") throw new Error("integrity check failed")
    } catch {
      throw new HttpError(400, "File bukan database SQLite yang valid")
    } finally {
      try { src?.close() } catch { /* ignore */ }
    }

    closeDb()
    fs.copyFileSync(tmp, DB_PATH)
    for (const ext of ["-wal", "-shm"]) {
      const f = `${DB_PATH}${ext}`
      if (fs.existsSync(f)) fs.unlinkSync(f)
    }
    fs.rmSync(tmp, { force: true })
    reopenDb()
    // File backup bisa berasal dari versi yang belum punya tabel users.
    ensureDefaultOwner()

    res.json({ success: true })
  }
)

const TABLES_IN_ORDER = [
  "debt_payments",
  "debts",
  "transactions",
  "stock_adjustments",
  "shifts",
  "logs",
  "reminders",
  "products",
  "categories",
]

resetRouter.post("/", (req, res) => {
  const { seed: reseed } = resetSchema.parse(req.body)

  const wipe = db.transaction(() => {
    for (const table of TABLES_IN_ORDER) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  })
  wipe()

  if (reseed) seed()

  writeLog(req, {
    action: "reset",
    entity: "system",
    entityName: "Sistem",
    details: `Semua data direset${reseed ? " lalu diisi ulang data contoh" : ""}`,
  })

  res.json({ success: true })
})

export { backupRouter, exportRouter, restoreRouter, resetRouter }
