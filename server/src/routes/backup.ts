import { Router } from "express"
import express from "express"
import os from "os"
import path from "path"
import fs from "fs"
import Database from "better-sqlite3"
import { db, DB_PATH, closeDb, reopenDb, generateId } from "../db"
import { HttpError } from "../utils"
import { seed } from "../seed"

const backupRouter = Router()
const exportRouter = Router()
const restoreRouter = Router()
const resetRouter = Router()

backupRouter.get("/", (_req, res) => {
  const tmp = path.join(os.tmpdir(), `warung-backup-${Date.now()}.db`)
  db.backup(tmp)
    .then(() => {
      res.download(tmp, "warung-backup.db", () => {
        fs.rm(tmp, { force: true }, () => {})
      })
    })
    .catch((err) => {
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
  const tmp = path.join(os.tmpdir(), `warung-export-${Date.now()}.json`)
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  res.download(tmp, "warung-data-export.json", () => {
    fs.rm(tmp, { force: true }, () => {})
  })
})

restoreRouter.post(
  "/",
  express.raw({ type: () => true, limit: "50mb" }),
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

    res.json({ success: true })
  }
)

const TABLES_IN_ORDER = ["debt_payments", "debts", "transactions", "logs", "reminders", "products", "categories"]

resetRouter.post("/", (req, res) => {
  const { seed: reseed } = (req.body ?? {}) as { seed?: boolean }

  const wipe = db.transaction(() => {
    for (const table of TABLES_IN_ORDER) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  })
  wipe()

  if (reseed) seed()

  db.prepare(
    "INSERT INTO logs (id, action, entity, entity_id, entity_name, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(generateId(), "updated", "system", "", "System", `Semua data direset${reseed ? " lalu diisi ulang data contoh" : ""}`, new Date().toISOString())

  res.json({ success: true })
})

export { backupRouter, exportRouter, restoreRouter, resetRouter }
