import { db, generateId } from "./db"

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

  const insertProduct = db.prepare(
    "INSERT INTO products (id, name, price, stock, category_id, image, barcode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
  const products = [
    { name: "Indomie Goreng", price: 4000, stock: 100, categoryId: catIds[0], barcode: "8991002101027" },
    { name: "Indomie Rebus", price: 4000, stock: 100, categoryId: catIds[0], barcode: "8991002101041" },
    { name: "Nasi Padang", price: 15000, stock: 20, categoryId: catIds[0], barcode: null },
    { name: "Teh Botol", price: 5000, stock: 50, categoryId: catIds[1], barcode: "8996001301340" },
    { name: "Aqua 600ml", price: 3000, stock: 60, categoryId: catIds[1], barcode: "8992769010182" },
    { name: "Kopi ABC", price: 2000, stock: 80, categoryId: catIds[1], barcode: null },
    { name: "Beras 5kg", price: 75000, stock: 10, categoryId: catIds[2], barcode: null },
    { name: "Gula Pasir 1kg", price: 18000, stock: 15, categoryId: catIds[2], barcode: null },
    { name: "Minyak Goreng 1L", price: 22000, stock: 12, categoryId: catIds[2], barcode: null },
    { name: "Sampoerna Mild", price: 36000, stock: 30, categoryId: catIds[3], barcode: null },
    { name: "Buku Tulis", price: 5000, stock: 40, categoryId: catIds[4], barcode: null },
    { name: "Pulpen", price: 3000, stock: 50, categoryId: catIds[4], barcode: null },
  ]
  for (const p of products)
    insertProduct.run(generateId(), p.name, p.price, p.stock, p.categoryId, null, p.barcode, now)

  const insertDebt = db.prepare(
    "INSERT INTO debts (id, customer_name, description, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
  const debts = [
    { customerName: "Bu Sari", description: "Beras 5kg + Minyak Goreng", amount: 93000 },
    { customerName: "Pak RT", description: "Sembako bulanan", amount: 245000 },
    { customerName: "Mbak Dewi", description: "Indomie 10 + Telur 1kg", amount: 52000, status: "paid" },
    { customerName: "Mas Toni", description: "Rokok Sampoerna 2 slop", amount: 72000 },
  ]
  const debtIds: string[] = []
  for (const d of debts) {
    const id = generateId()
    debtIds.push(id)
    insertDebt.run(id, d.customerName, d.description, d.amount, d.status || "pending", new Date(Date.now() - 86400000 * 2).toISOString())
  }

  const insertPayment = db.prepare(
    "INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)"
  )
  insertPayment.run(generateId(), debtIds[2], 52000, "Pelunasan", new Date(Date.now() - 86400000).toISOString())

  const insertReminder = db.prepare(
    "INSERT INTO reminders (id, date, title, product_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const reminders = [
    { date: tomorrow.toISOString().split("T")[0], title: "Restok Indomie", notes: "Indomie Goreng & Rebus masing-masing 1 dus" },
    { date: nextWeek.toISOString().split("T")[0], title: "Restok Beras", notes: "Beras 5kg minimal 10 karung" },
    { date: nextWeek.toISOString().split("T")[0], title: "Restok Minyak Goreng", notes: "Minyak goreng 1L 24 pcs" },
    { date: nextMonth.toISOString().split("T")[0], title: "Restok Sembako Bulanan", notes: "Gula, tepung, telur, susu kental manis" },
    { date: today.toISOString().split("T")[0], title: "Cek stok Rokok", notes: "Sampoerna Mild tinggal 3 bungkus" },
  ]
  for (const r of reminders) insertReminder.run(generateId(), r.date, r.title, null, r.notes, now)
}

export { seed }
