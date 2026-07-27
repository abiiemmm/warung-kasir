import Database from "better-sqlite3"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "warung.db")

const db = new Database(DB_PATH)

db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    image TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    payment INTEGER NOT NULL,
    change INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    product_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`)

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function seed() {
  const count = db.prepare("SELECT COUNT(*) as c FROM categories").get() as { c: number }
  if (count.c > 0) return

  const now = new Date().toISOString()
  const catIds = [generateId(), generateId(), generateId(), generateId(), generateId()]

  const insertCat = db.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)")
  const cats = [
    { id: catIds[0], name: "Makanan" },
    { id: catIds[1], name: "Minuman" },
    { id: catIds[2], name: "Sembako" },
    { id: catIds[3], name: "Rokok" },
    { id: catIds[4], name: "Alat Tulis" },
  ]
  for (const c of cats) insertCat.run(c.id, c.name, now)

  const insertProduct = db.prepare("INSERT INTO products (id, name, price, stock, category_id, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
  const products = [
    { name: "Indomie Goreng", price: 4000, stock: 100, categoryId: catIds[0] },
    { name: "Indomie Rebus", price: 4000, stock: 100, categoryId: catIds[0] },
    { name: "Nasi Padang", price: 15000, stock: 20, categoryId: catIds[0] },
    { name: "Teh Botol", price: 5000, stock: 50, categoryId: catIds[1] },
    { name: "Aqua 600ml", price: 3000, stock: 60, categoryId: catIds[1] },
    { name: "Kopi ABC", price: 2000, stock: 80, categoryId: catIds[1] },
    { name: "Beras 5kg", price: 75000, stock: 10, categoryId: catIds[2] },
    { name: "Gula Pasir 1kg", price: 18000, stock: 15, categoryId: catIds[2] },
    { name: "Minyak Goreng 1L", price: 22000, stock: 12, categoryId: catIds[2] },
    { name: "Sampoerna Mild", price: 36000, stock: 30, categoryId: catIds[3] },
    { name: "Buku Tulis", price: 5000, stock: 40, categoryId: catIds[4] },
    { name: "Pulpen", price: 3000, stock: 50, categoryId: catIds[4] },
  ]
  for (const p of products) insertProduct.run(generateId(), p.name, p.price, p.stock, p.categoryId, null, now)

  const insertDebt = db.prepare("INSERT INTO debts (id, customer_name, description, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
  const debts = [
    { customerName: "Bu Sari", description: "Beras 5kg + Minyak Goreng", amount: 93000 },
    { customerName: "Pak RT", description: "Sembako bulanan", amount: 245000 },
    { customerName: "Mbak Dewi", description: "Indomie 10 + Telur 1kg", amount: 52000, status: "paid" },
    { customerName: "Mas Toni", description: "Rokok Sampoerna 2 slop", amount: 72000 },
  ]
  for (const d of debts) insertDebt.run(generateId(), d.customerName, d.description, d.amount, d.status || "pending", new Date(Date.now() - 86400000 * 2).toISOString())

  const insertReminder = db.prepare("INSERT INTO reminders (id, date, title, product_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)")
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7)
  const nextMonth = new Date(today); nextMonth.setMonth(nextMonth.getMonth() + 1)

  const reminders = [
    { date: tomorrow.toISOString().split("T")[0], title: "Restok Indomie", notes: "Indomie Goreng & Rebus masing-masing 1 dus" },
    { date: nextWeek.toISOString().split("T")[0], title: "Restok Beras", notes: "Beras 5kg minimal 10 karung" },
    { date: nextWeek.toISOString().split("T")[0], title: "Restok Minyak Goreng", notes: "Minyak goreng 1L 24 pcs" },
    { date: nextMonth.toISOString().split("T")[0], title: "Restok Sembako Bulanan", notes: "Gula, tepung, telur, susu kental manis" },
    { date: today.toISOString().split("T")[0], title: "Cek stok Rokok", notes: "Sampoerna Mild tinggal 3 bungkus" },
  ]
  for (const r of reminders) insertReminder.run(generateId(), r.date, r.title, null, r.notes, now)
}

seed()

export { db, generateId }
