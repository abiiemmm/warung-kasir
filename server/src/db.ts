import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { randomUUID } from "crypto"
import { fileURLToPath } from "url"
import { migrations } from "./migrations"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "warung.db")

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

function openDatabase(): Database.Database {
  const conn = new Database(DB_PATH)
  conn.pragma("journal_mode = WAL")
  conn.pragma("foreign_keys = ON")
  return conn
}

let db = openDatabase()

function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`)
  const applied = new Set(
    (db.prepare("SELECT id FROM migrations").all() as { id: string }[]).map((r) => r.id)
  )
  const runAll = db.transaction(() => {
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue
      migration.up(db)
      db.prepare("INSERT INTO migrations (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        new Date().toISOString()
      )
    }
  })
  runAll()
}

runMigrations()

function generateId(): string {
  return randomUUID()
}

function closeDb() {
  try {
    db.close()
  } catch { /* sudah tertutup */ }
}

function reopenDb() {
  db = openDatabase()
  runMigrations()
}

export { db, generateId, DB_PATH, closeDb, reopenDb }
