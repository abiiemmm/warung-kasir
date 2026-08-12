import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync } from "fs"
import os from "os"
import path from "path"
import request from "supertest"

/** Agen supertest yang menyimpan cookie antar-request. */
type Agent = ReturnType<typeof request.agent>

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "warung-test-"))
process.env.DB_PATH = path.join(tmpDir, "test.db")
process.env.CORS_ORIGINS = "http://localhost:3000"

const { createApp } = await import("../app")
const { closeDb } = await import("../db")
const app = createApp()

const RESET_CONFIRM = "HAPUS SEMUA DATA"

/** Agen yang menyimpan cookie sesi, seperti browser. */
let owner: Agent
let productId = ""
let categoryId = ""

async function login(name: string, pin: string) {
  const agent = request.agent(app)
  const res = await agent.post("/api/auth/login").send({ name, pin })
  expect(res.status).toBe(200)
  return agent
}

beforeAll(async () => {
  owner = await login("Pemilik", "111111")

  const c = await owner.post("/api/categories").send({ name: "Test" })
  categoryId = c.body.id

  const p = await owner
    .post("/api/products")
    .send({ name: "Produk Test", price: 5000, costPrice: 3000, stock: 50, categoryId, barcode: "888888" })
  productId = p.body.id
})

afterAll(() => {
  closeDb()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe("autentikasi", () => {
  it("menolak akses tanpa login", async () => {
    const res = await request(app).get("/api/products")
    expect(res.status).toBe(401)
  })

  it("menolak PIN salah", async () => {
    const res = await request(app).post("/api/auth/login").send({ name: "Pemilik", pin: "999999" })
    expect(res.status).toBe(401)
  })

  it("mengembalikan identitas pengguna yang login", async () => {
    const res = await owner.get("/api/auth/me")
    expect(res.status).toBe(200)
    expect(res.body.name).toBe("Pemilik")
    expect(res.body.role).toBe("owner")
  })

  it("cookie sesi bersifat HttpOnly dan SameSite=Strict", async () => {
    const res = await request(app).post("/api/auth/login").send({ name: "Pemilik", pin: "111111" })
    const cookie = String(res.headers["set-cookie"])
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Strict")
  })

  it("logout membatalkan sesi", async () => {
    const agent = await login("Pemilik", "111111")
    await agent.post("/api/auth/logout").send({})
    const after = await agent.get("/api/products")
    expect(after.status).toBe(401)
  })

  it("mengunci akun setelah 5 PIN salah berturut-turut", async () => {
    const nama = "AkunUjiKunci"
    await owner.post("/api/users").send({ name: nama, pin: "123456", role: "cashier" })
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").send({ name: nama, pin: "000000" })
    }
    // PIN yang benar pun ditolak selama masa penguncian.
    const res = await request(app).post("/api/auth/login").send({ name: nama, pin: "123456" })
    expect(res.status).toBe(429)
  })
})

describe("regresi CSRF", () => {
  it("menolak POST reset dari pihak yang tidak login", async () => {
    // Inilah bentuk serangan yang dulu berhasil menghapus seluruh database:
    // POST lintas situs tanpa preflight karena Content-Type text/plain.
    const res = await request(app).post("/api/reset").set("Content-Type", "text/plain").send("x")
    expect(res.status).toBe(401)
  })

  it("menolak Content-Type text/plain walau sudah login", async () => {
    // Lapis kedua: seandainya cookie sesi ikut terkirim, request tetap ditolak
    // karena bukan application/json — sehingga tidak bisa lagi jadi simple request.
    const res = await owner.post("/api/reset").set("Content-Type", "text/plain").send("x")
    expect(res.status).toBe(415)
  })

  it("menolak request dari Origin asing", async () => {
    const res = await owner
      .post("/api/categories")
      .set("Origin", "https://situs-jahat.example")
      .send({ name: "Dari situs jahat" })
    expect(res.status).toBe(403)
  })

  it("reset butuh konfirmasi eksplisit", async () => {
    const res = await owner.post("/api/reset").send({ seed: false })
    expect(res.status).toBe(400)
  })

  it("restore menolak content-type selain octet-stream", async () => {
    const res = await request(app).post("/api/restore").set("Content-Type", "text/plain").send("x")
    // Ditolak sebelum sempat menyentuh database (401 karena belum login, bukan 200).
    expect(res.status).not.toBe(200)
  })
})

describe("hak akses", () => {
  let cashier: Agent

  beforeAll(async () => {
    await owner.post("/api/users").send({ name: "Kasir Uji", pin: "222222", role: "cashier" })
    cashier = await login("Kasir Uji", "222222")
  })

  it("kasir tidak boleh mengunduh backup", async () => {
    const res = await cashier.get("/api/backup")
    expect(res.status).toBe(403)
  })

  it("kasir tidak boleh reset data", async () => {
    const res = await cashier.post("/api/reset").send({ seed: false, confirm: RESET_CONFIRM })
    expect(res.status).toBe(403)
  })

  it("kasir tidak boleh menghapus produk", async () => {
    const res = await cashier.delete(`/api/products/${productId}`)
    expect(res.status).toBe(403)
  })

  it("kasir tidak boleh mengelola pengguna", async () => {
    const res = await cashier.get("/api/users")
    expect(res.status).toBe(403)
  })

  it("kasir tetap bisa berjualan", async () => {
    const res = await cashier.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 5000 })
    expect(res.status).toBe(200)
  })
})

describe("categories", () => {
  it("menolak nama kosong", async () => {
    const res = await owner.post("/api/categories").send({ name: "" })
    expect(res.status).toBe(400)
  })

  it("menolak hapus kategori yang masih dipakai produk", async () => {
    const res = await owner.delete(`/api/categories/${categoryId}`)
    expect(res.status).toBe(400)
  })

  it("404 saat menghapus kategori tidak ada", async () => {
    const res = await owner.delete("/api/categories/tidak-ada")
    expect(res.status).toBe(404)
  })

  it("membuat kategori baru", async () => {
    const res = await owner.post("/api/categories").send({ name: "Test Cat" })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe("Test Cat")
  })
})

describe("products", () => {
  it("menolak harga negatif", async () => {
    const res = await owner.post("/api/products").send({ name: "X", price: -5, stock: 1, categoryId })
    expect(res.status).toBe(400)
  })

  it("menolak stok non-integer", async () => {
    const res = await owner.post("/api/products").send({ name: "X", price: 1000, stock: 1.5, categoryId })
    expect(res.status).toBe(400)
  })

  it("menolak kategori yang tidak ada dengan 400, bukan 500", async () => {
    const res = await owner.post("/api/products").send({ name: "X", price: 1000, stock: 1, categoryId: "tidak-ada" })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain("Kategori")
  })

  it("menolak gambar yang bukan data URL", async () => {
    const res = await owner
      .post("/api/products")
      .send({ name: "X", price: 1000, stock: 1, categoryId, image: "A".repeat(5000) })
    expect(res.status).toBe(400)
  })

  it("menolak gambar melebihi batas ukuran", async () => {
    const res = await owner
      .post("/api/products")
      .send({ name: "X", price: 1000, stock: 1, categoryId, image: `data:image/png;base64,${"A".repeat(500_000)}` })
    expect(res.status).toBe(400)
  })

  it("menerima gambar data URL yang wajar", async () => {
    const res = await owner
      .post("/api/products")
      .send({ name: "Produk Bergambar", price: 1000, stock: 1, categoryId, image: "data:image/png;base64,iVBORw0KGgo=" })
    expect(res.status).toBe(200)
  })

  it("membuat produk dengan barcode", async () => {
    const res = await owner
      .post("/api/products")
      .send({ name: "Barang Test", price: 5000, stock: 10, categoryId, barcode: "1234567890" })
    expect(res.status).toBe(200)
    expect(res.body.barcode).toBe("1234567890")
  })

  it("menolak qty stock = 0", async () => {
    const res = await owner.patch(`/api/products/${productId}/stock`).send({ qty: 0 })
    expect(res.status).toBe(400)
  })

  it("menambah stok dengan qty positif dan mencatat riwayatnya", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    const res = await owner.patch(`/api/products/${productId}/stock`).send({ qty: 5, reason: "Kulakan" })
    expect(res.status).toBe(200)
    expect(res.body.stock).toBe(before.body.stock + 5)

    const riwayat = await owner.get(`/api/products/${productId}/adjustments`)
    expect(riwayat.body[0].type).toBe("restock")
    expect(riwayat.body[0].reason).toBe("Kulakan")
  })

  it("stok opname mencatat selisih fisik vs sistem", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    const res = await owner.post(`/api/products/${productId}/opname`).send({ counted: before.body.stock - 3, reason: "Rusak" })
    expect(res.status).toBe(200)
    expect(res.body.delta).toBe(-3)
    expect(res.body.stock).toBe(before.body.stock - 3)
  })

  it("filter lowStock hanya mengembalikan produk menipis", async () => {
    const p = await owner.post("/api/products").send({ name: "Hampir Habis", price: 1000, stock: 2, minStock: 5, categoryId })
    const res = await owner.get("/api/products?lowStock=true")
    expect(res.status).toBe(200)
    expect(res.body.some((x: { id: string }) => x.id === p.body.id)).toBe(true)
  })
})

describe("transactions (checkout atomik)", () => {
  it("menolak produk tidak ditemukan", async () => {
    const res = await owner.post("/api/transactions").send({ items: [{ productId: "nonexistent", qty: 1 }], payment: 10000 })
    expect(res.status).toBe(400)
  })

  it("menolak qty non-positif", async () => {
    const res = await owner.post("/api/transactions").send({ items: [{ productId, qty: 0 }], payment: 10000 })
    expect(res.status).toBe(400)
  })

  it("menolak stok tidak cukup", async () => {
    const res = await owner.post("/api/transactions").send({ items: [{ productId, qty: 999999 }], payment: 99999999 })
    expect(res.status).toBe(400)
  })

  it("menolak pembayaran kurang dari total", async () => {
    const res = await owner.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 1 })
    expect(res.status).toBe(400)
  })

  it("menghitung total dari harga server & memotong stok atomik", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    const target = before.body

    const res = await owner
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 2 }], payment: 999999, paymentMethod: "qris", discount: 0 })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(target.price * 2)
    expect(res.body.paymentMethod).toBe("qris")
    expect(res.body.change).toBe(999999 - target.price * 2)
    expect(res.body.costTotal).toBe(target.costPrice * 2)

    const after = await owner.get(`/api/products/${productId}`)
    expect(after.body.stock).toBe(target.stock - 2)
  })

  it("mencatat siapa kasirnya", async () => {
    const res = await owner.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 999999 })
    expect(res.body.userName).toBe("Pemilik")
  })

  it("tidak memotong stok saat transaksi ditolak (rollback)", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    await owner
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 1 }, { productId: "nonexistent", qty: 1 }], payment: 999999 })
    const after = await owner.get(`/api/products/${productId}`)
    expect(after.body.stock).toBe(before.body.stock)
  })

  it("menjumlahkan qty untuk produk yang sama agar stok tidak jebol", async () => {
    const p = await owner.post("/api/products").send({ name: "Stok Tipis", price: 1000, stock: 3, categoryId })
    const res = await owner
      .post("/api/transactions")
      .send({ items: [{ productId: p.body.id, qty: 2 }, { productId: p.body.id, qty: 2 }], payment: 999999 })
    expect(res.status).toBe(400)
    const after = await owner.get(`/api/products/${p.body.id}`)
    expect(after.body.stock).toBe(3)
  })

  it("idempotency key mencegah transaksi dobel", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    const key = "kunci-uji-dobel-tap-123"

    const a = await owner.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 999999, idempotencyKey: key })
    const b = await owner.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 999999, idempotencyKey: key })

    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(b.body.id).toBe(a.body.id)

    const after = await owner.get(`/api/products/${productId}`)
    expect(after.body.stock).toBe(before.body.stock - 1)
  })

  it("menerapkan diskon", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    const res = await owner
      .post("/api/transactions")
      .send({ items: [{ productId, qty: 1 }], payment: 999999, discount: before.body.price - 100 })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(100)
  })

  it("membatalkan transaksi mengembalikan stok", async () => {
    const before = await owner.get(`/api/products/${productId}`)
    const tx = await owner.post("/api/transactions").send({ items: [{ productId, qty: 2 }], payment: 999999 })
    expect((await owner.get(`/api/products/${productId}`)).body.stock).toBe(before.body.stock - 2)

    const res = await owner.post(`/api/transactions/${tx.body.id}/void`).send({ reason: "Salah input" })
    expect(res.status).toBe(200)
    expect((await owner.get(`/api/products/${productId}`)).body.stock).toBe(before.body.stock)
  })

  it("menolak pembatalan ganda", async () => {
    const tx = await owner.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 999999 })
    await owner.post(`/api/transactions/${tx.body.id}/void`).send({ reason: "Batal" })
    const res = await owner.post(`/api/transactions/${tx.body.id}/void`).send({ reason: "Batal lagi" })
    expect(res.status).toBe(400)
  })

  it("transaksi batal tidak ikut dihitung di laporan", async () => {
    const sebelum = await owner.get("/api/reports/summary")
    const tx = await owner.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 999999 })
    const sesudahJual = await owner.get("/api/reports/summary")
    expect(sesudahJual.body.totalRevenue).toBeGreaterThan(sebelum.body.totalRevenue)

    await owner.post(`/api/transactions/${tx.body.id}/void`).send({ reason: "Uji laporan" })
    const sesudahBatal = await owner.get("/api/reports/summary")
    expect(sesudahBatal.body.totalRevenue).toBe(sebelum.body.totalRevenue)
    expect(sesudahBatal.body.voidedCount).toBeGreaterThan(0)
  })
})

describe("shift kasir", () => {
  let kasir: Agent

  beforeAll(async () => {
    await owner.post("/api/users").send({ name: "Kasir Shift", pin: "333333", role: "cashier" })
    kasir = await login("Kasir Shift", "333333")
  })

  it("belum ada shift berjalan di awal", async () => {
    const res = await kasir.get("/api/shifts/current")
    expect(res.body).toBeNull()
  })

  it("membuka shift dengan modal awal", async () => {
    const res = await kasir.post("/api/shifts/open").send({ openingCash: 100000 })
    expect(res.status).toBe(200)
    expect(res.body.openingCash).toBe(100000)
  })

  it("menolak membuka shift dua kali", async () => {
    const res = await kasir.post("/api/shifts/open").send({ openingCash: 50000 })
    expect(res.status).toBe(400)
  })

  it("menghitung uang laci seharusnya dari penjualan tunai", async () => {
    await kasir.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 5000, paymentMethod: "cash" })
    await kasir.post("/api/transactions").send({ items: [{ productId, qty: 1 }], payment: 5000, paymentMethod: "qris" })

    const res = await kasir.get("/api/shifts/current")
    // Modal 100.000 + satu penjualan tunai 5.000; yang QRIS tidak masuk laci.
    expect(res.body.expectedCash).toBe(105000)
  })

  it("menutup shift dan mencatat selisih", async () => {
    const res = await kasir.post("/api/shifts/close").send({ closingCash: 104000, note: "Kurang seribu" })
    expect(res.status).toBe(200)
    expect(res.body.expectedCash).toBe(105000)
    expect(res.body.difference).toBe(-1000)
  })

  it("kasir tidak bisa melihat shift kasir lain", async () => {
    const shiftPemilik = await owner.post("/api/shifts/open").send({ openingCash: 1000 })
    const res = await kasir.get(`/api/shifts/${shiftPemilik.body.id}`)
    expect(res.status).toBe(403)
    await owner.post("/api/shifts/close").send({ closingCash: 1000 })
  })
})

describe("pagination", () => {
  it("transactions mendukung pagination & full list", async () => {
    const res = await owner.get("/api/transactions?page=1&limit=2")
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
    expect(res.body.total).toBeGreaterThan(0)

    const full = await owner.get("/api/transactions")
    expect(Array.isArray(full.body)).toBe(true)
  })

  it("logs mendukung pagination", async () => {
    const res = await owner.get("/api/logs?page=1&limit=5")
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThan(0)
  })
})

describe("audit log", () => {
  it("dicatat server, lengkap dengan pelakunya", async () => {
    await owner.post("/api/categories").send({ name: "Kategori Terlacak" })
    const res = await owner.get("/api/logs?q=Kategori Terlacak")
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0].userName).toBe("Pemilik")
  })

  it("tidak bisa dipalsukan lewat API", async () => {
    const res = await owner.post("/api/logs").send({ action: "palsu", entity: "product" })
    expect(res.status).toBe(404)
  })
})

describe("debts", () => {
  let debtId = ""

  it("membuat piutang dengan remaining penuh", async () => {
    const res = await owner
      .post("/api/debts")
      .send({ customerName: "Test Pelanggan", description: "Test", amount: 50000, status: "pending" })
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBe(50000)
    debtId = res.body.id
  })

  it("mencatat pembayaran parsial", async () => {
    const res = await owner.post(`/api/debts/${debtId}/payments`).send({ amount: 20000, note: "Cicilan 1" })
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBe(30000)
    expect(res.body.status).toBe("pending")
  })

  it("menolak pembayaran melebihi sisa", async () => {
    const res = await owner.post(`/api/debts/${debtId}/payments`).send({ amount: 999999 })
    expect(res.status).toBe(400)
  })

  it("menolak menurunkan jumlah di bawah yang sudah dibayar", async () => {
    const res = await owner.put(`/api/debts/${debtId}`).send({ amount: 1000 })
    expect(res.status).toBe(400)
  })

  it("status lunas saat remaining habis", async () => {
    const res = await owner.post(`/api/debts/${debtId}/payments`).send({ amount: 30000 })
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBe(0)
    expect(res.body.status).toBe("paid")
  })

  it("menolak mengembalikan status lunas ke pending secara diam-diam", async () => {
    const res = await owner.patch(`/api/debts/${debtId}/status`).send({ status: "pending" })
    expect(res.status).toBe(400)
  })

  it("menghapus satu cicilan mengembalikan sisa piutang", async () => {
    const payments = await owner.get(`/api/debts/${debtId}/payments`)
    const res = await owner.delete(`/api/debts/${debtId}/payments/${payments.body[0].id}`)
    expect(res.status).toBe(200)
    expect(res.body.remaining).toBeGreaterThan(0)
    expect(res.body.status).toBe("pending")
  })

  it("menghapus piutang beserta pembayarannya", async () => {
    const res = await owner.delete(`/api/debts/${debtId}`)
    expect(res.status).toBe(200)
    const list = await owner.get(`/api/debts/${debtId}/payments`)
    expect(list.status).toBe(404)
  })
})

describe("reports", () => {
  it("summary mengembalikan agregasi termasuk laba kotor", async () => {
    const res = await owner.get("/api/reports/summary")
    expect(res.status).toBe(200)
    expect(res.body.totalRevenue).toBeGreaterThan(0)
    expect(res.body.grossProfit).toBe(res.body.totalRevenue - res.body.totalCost)
  })

  it("by-product, by-category, by-user bekerja", async () => {
    const p = await owner.get("/api/reports/by-product")
    const c = await owner.get("/api/reports/by-category")
    const u = await owner.get("/api/reports/by-user")
    expect(p.body.data.length).toBeGreaterThan(0)
    expect(c.status).toBe(200)
    expect(u.body.data.length).toBeGreaterThan(0)
  })
})

describe("backup & export", () => {
  it("backup menghasilkan file db", async () => {
    const res = await owner.get("/api/backup")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toContain("application/octet-stream")
    expect(res.body.length).toBeGreaterThan(0)
  })

  it("export menghasilkan json", async () => {
    const res = await owner.get("/api/export")
    expect(res.status).toBe(200)
    const data = JSON.parse(res.text)
    expect(data.categories).toBeDefined()
    expect(data.products).toBeDefined()
  })
})

describe("restore", () => {
  it("menolak file yang bukan database", async () => {
    const res = await owner
      .post("/api/restore")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("ini bukan database sqlite"))
    expect(res.status).toBe(400)
  })

  it("mengembalikan data dari backup", async () => {
    const before = await owner.get("/api/products")
    const back = await owner.get("/api/backup")

    await owner.post("/api/products").send({ name: "Produk Sementara", price: 1, stock: 1, categoryId })
    const afterAdd = await owner.get("/api/products")
    expect(afterAdd.body.length).toBe(before.body.length + 1)

    const res = await owner.post("/api/restore").set("Content-Type", "application/octet-stream").send(back.body)
    expect(res.status).toBe(200)

    const afterRestore = await owner.get("/api/products")
    expect(afterRestore.body.length).toBe(before.body.length)
  })
})

describe("keamanan & error handling", () => {
  it("404 untuk route tidak dikenal", async () => {
    const res = await owner.get("/api/does-not-exist")
    expect(res.status).toBe(404)
  })

  it("validasi zod error dengan format benar", async () => {
    const res = await owner.post("/api/products").send({ name: "", price: -1, stock: 0, categoryId: "" })
    expect(res.status).toBe(400)
    expect(res.body.details.length).toBeGreaterThan(0)
  })

  it("health check tidak butuh login", async () => {
    const res = await request(app).get("/api/health")
    expect(res.status).toBe(200)
  })
})

describe("reset", () => {
  it("menghapus semua data tanpa seed", async () => {
    expect((await owner.get("/api/products")).body.length).toBeGreaterThan(0)

    const res = await owner.post("/api/reset").send({ seed: false, confirm: RESET_CONFIRM })
    expect(res.status).toBe(200)

    expect((await owner.get("/api/products")).body.length).toBe(0)
    expect((await owner.get("/api/categories")).body.length).toBe(0)
    expect((await owner.get("/api/transactions")).body.length).toBe(0)
  })

  it("tidak menghapus akun pengguna (tetap bisa login)", async () => {
    const res = await owner.get("/api/auth/me")
    expect(res.status).toBe(200)
  })

  it("menghapus lalu mengisi ulang data contoh", async () => {
    const res = await owner.post("/api/reset").send({ seed: true, confirm: RESET_CONFIRM })
    expect(res.status).toBe(200)

    const prods = await owner.get("/api/products")
    expect(prods.body.length).toBeGreaterThan(0)
    expect(prods.body[0].costPrice).toBeGreaterThan(0)
  })
})
