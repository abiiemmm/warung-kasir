import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync } from "fs"
import os from "os"
import path from "path"
import request from "supertest"

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "warung-test-"))
process.env.DB_PATH = path.join(tmpDir, "test.db")
process.env.CORS_ORIGINS = "http://localhost:3000"

const { createApp } = await import("../app")
const { closeDb } = await import("../db")
const app = createApp()

let productId = ""
let categoryId = ""

beforeAll(async () => {
  const cats = await request(app).get("/api/categories")
  if (cats.body.length === 0) {
    const c = await request(app).post("/api/categories").send({ name: "Test" })
    categoryId = c.body.id
    await request(app).post("/api/products").send({ name: "Produk Test", price: 5000, stock: 50, categoryId, barcode: "888888" })
  } else {
    categoryId = cats.body[0].id
  }

  const prods = await request(app).get("/api/products")
  if (prods.body.length === 0) {
    const p = await request(app).post("/api/products").send({ name: "Produk Test", price: 5000, stock: 50, categoryId, barcode: "888888" })
    productId = p.body.id
  } else {
    productId = prods.body[0].id
  }
})

afterAll(() => {
  closeDb()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("categories", () => {
  it("menolak nama kosong", async () => {
    const res = await request(app).post("/api/categories").send({ name: "" })
    expect(res.status).toBe(400)
  })

  it("menolak hapus kategori yang masih dipakai produk", async () => {
    const res = await request(app).delete(`/api/categories/${categoryId}`)
    expect(res.status).toBe(400)
  })

  it("membuat kategori baru", async () => {
    const res = await request(app).post("/api/categories").send({ name: "Test Cat" })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe("Test Cat")
  })
})

describe("products", () => {
  it("menolak harga negatif", async () => {
    const res = await request(app).post("/api/products").send({ name: "X", price: -5, stock: 1, categoryId })
    expect(res.status).toBe(400)
  })

  it("menolak stok non-integer", async () => {
    const res = await request(app).post("/api/products").send({ name: "X", price: 1000, stock: 1.5, categoryId })
    expect(res.status).toBe(400)
  })

  it("membuat produk dengan barcode", async () => {
    const res = await request(app).post("/api/products").send({ name: "Barang Test", price: 5000, stock: 10, categoryId, barcode: "1234567890" })
    expect(res.status).toBe(200)
    expect(res.body.barcode).toBe("1234567890")
  })

  it("menolak qty stock = 0", async () => {
    const res = await request(app).patch(`/api/products/${productId}/stock`).send({ qty: 0 })
    expect(res.status).toBe(400)
  })

  it("menambah stok dengan qty positif", async () => {
    const before = await request(app).get("/api/products")
    const target = before.body.find((p: { id: string }) => p.id === productId)
    const res = await request(app).patch(`/api/products/${productId}/stock`).send({ qty: 5 })
    expect(res.status).toBe(200)
    expect(res.body.stock).toBe(target.stock + 5)
  })
})

describe("transactions (checkout atomik)", () => {
  it("menolak produk tidak ditemukan", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId: "nonexistent", qty: 1 }], payment: 10000 })
    expect(res.status).toBe(400)
  })

  it("menolak qty non-positif", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 0 }], payment: 10000 })
    expect(res.status).toBe(400)
  })

  it("menolak stok tidak cukup", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 999999 }], payment: 99999999 })
    expect(res.status).toBe(400)
  })

  it("menolak pembayaran kurang dari total", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 1 }], payment: 1 })
    expect(res.status).toBe(400)
  })

  it("menghitung total dari harga server & memotong stok atomik", async () => {
    const before = await request(app).get("/api/products")
    const target = before.body.find((p: { id: string }) => p.id === productId)

    const res = await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 2 }], payment: 999999, paymentMethod: "qris", discount: 0 })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(target.price * 2)
    expect(res.body.paymentMethod).toBe("qris")
    expect(res.body.change).toBe(999999 - target.price * 2)
    expect(res.body.items).toHaveLength(1)

    const after = await request(app).get("/api/products")
    const targetAfter = after.body.find((p: { id: string }) => p.id === productId)
    expect(targetAfter.stock).toBe(target.stock - 2)
  })

  it("tidak memotong stok saat transaksi ditolak (rollback)", async () => {
    const before = await request(app).get("/api/products")
    const target = before.body.find((p: { id: string }) => p.id === productId)

    await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 1 }, { productId: "nonexistent", qty: 1 }], payment: 999999 })

    const after = await request(app).get("/api/products")
    const targetAfter = after.body.find((p: { id: string }) => p.id === productId)
    expect(targetAfter.stock).toBe(target.stock)
  })

  it("menerapkan diskon", async () => {
    const before = await request(app).get("/api/products")
    const target = before.body.find((p: { id: string }) => p.id === productId)
    const res = await request(app)
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 1 }], payment: 999999, discount: target.price - 100 })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(100)
    expect(res.body.discount).toBe(target.price - 100)
  })
})

describe("pagination", () => {
  it("transactions mendukung pagination & full list", async () => {
    const res = await request(app).get("/api/transactions?page=1&limit=2")
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.total).toBeGreaterThan(0)
    expect(res.body.pages).toBeGreaterThanOrEqual(1)
    expect(res.body.data.length).toBeLessThanOrEqual(2)

    const full = await request(app).get("/api/transactions")
    expect(Array.isArray(full.body)).toBe(true)
  })

  it("logs mendukung pagination", async () => {
    const res = await request(app).get("/api/logs?page=1&limit=5")
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.total).toBeGreaterThanOrEqual(0)
  })
})

describe("debts", () => {
  let debtId = ""

  it("membuat piutang dengan remaining penuh", async () => {
    const res = await request(app)
      .post("/api/debts")
      .send({ customerName: "Test Pelanggan", description: "Test", amount: 50000, status: "pending" })
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBe(50000)
    debtId = res.body.id
  })

  it("mencatat pembayaran parsial", async () => {
    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .send({ amount: 20000, note: "Cicilan 1" })
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBe(30000)
    expect(res.body.status).toBe("pending")
  })

  it("menolak pembayaran melebihi sisa", async () => {
    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .send({ amount: 999999 })
    expect(res.status).toBe(400)
  })

  it("status lunas saat remaining habis", async () => {
    const res = await request(app)
      .post(`/api/debts/${debtId}/payments`)
      .send({ amount: 30000 })
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBe(0)
    expect(res.body.status).toBe("paid")
  })

  it("menghapus piutang beserta pembayarannya", async () => {
    const res = await request(app).delete(`/api/debts/${debtId}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const list = await request(app).get(`/api/debts/${debtId}/payments`)
    expect(list.status).toBe(404)
  })
})

describe("reports", () => {
  it("summary mengembalikan agregasi", async () => {
    const res = await request(app).get("/api/reports/summary")
    expect(res.status).toBe(200)
    expect(res.body.totalRevenue).toBeGreaterThan(0)
    expect(res.body.count).toBeGreaterThan(0)
    expect(typeof res.body.byMethod).toBe("object")
  })

  it("by-product dan by-category bekerja", async () => {
    const p = await request(app).get("/api/reports/by-product")
    const c = await request(app).get("/api/reports/by-category")
    expect(p.status).toBe(200)
    expect(c.status).toBe(200)
    expect(p.body.data.length).toBeGreaterThan(0)
  })
})

describe("backup & export", () => {
  it("backup menghasilkan file db", async () => {
    const res = await request(app).get("/api/backup")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toContain("application/octet-stream")
    expect(res.body.length).toBeGreaterThan(0)
  })

  it("export menghasilkan json", async () => {
    const res = await request(app).get("/api/export")
    expect(res.status).toBe(200)
    const data = JSON.parse(res.text)
    expect(data.categories).toBeDefined()
    expect(data.products).toBeDefined()
  })
})

describe("restore", () => {
  it("menolak file yang bukan database", async () => {
    const res = await request(app)
      .post("/api/restore")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("ini bukan database sqlite"))
    expect(res.status).toBe(400)
  })

  it("mengembalikan data dari backup", async () => {
    const before = await request(app).get("/api/products")
    const back = await request(app).get("/api/backup")

    await request(app).post("/api/products").send({ name: "Produk Sementara", price: 1, stock: 1, categoryId })
    const afterAdd = await request(app).get("/api/products")
    expect(afterAdd.body.length).toBe(before.body.length + 1)

    const res = await request(app)
      .post("/api/restore")
      .set("Content-Type", "application/octet-stream")
      .send(back.body)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const afterRestore = await request(app).get("/api/products")
    expect(afterRestore.body.length).toBe(before.body.length)
  })
})

describe("keamanan & error handling", () => {
  it("404 untuk route tidak dikenal", async () => {
    const res = await request(app).get("/api/does-not-exist")
    expect(res.status).toBe(404)
  })

  it("validasi zod error dengan format benar", async () => {
    const res = await request(app).post("/api/products").send({ name: "", price: -1, stock: 0, categoryId: "" })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })
})

describe("reset", () => {
  it("menghapus semua data tanpa seed", async () => {
    expect((await request(app).get("/api/products")).body.length).toBeGreaterThan(0)

    const res = await request(app).post("/api/reset").send({ seed: false })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    expect((await request(app).get("/api/products")).body.length).toBe(0)
    expect((await request(app).get("/api/categories")).body.length).toBe(0)
    expect((await request(app).get("/api/transactions")).body.length).toBe(0)
    expect((await request(app).get("/api/debts")).body.length).toBe(0)
  })

  it("menghapus lalu mengisi ulang data contoh", async () => {
    const res = await request(app).post("/api/reset").send({ seed: true })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const cats = await request(app).get("/api/categories")
    expect(cats.body.length).toBeGreaterThan(0)
    const prods = await request(app).get("/api/products")
    expect(prods.body.length).toBeGreaterThan(0)
    expect(prods.body[0].barcode).toBeDefined()
  })
})
