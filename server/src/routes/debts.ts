import { Router } from "express"
import { db, generateId } from "../db"
import { debtSchema, debtUpdateSchema, debtStatusSchema, debtPaymentSchema } from "../validation"
import { HttpError } from "../utils"
import { writeLog } from "../audit"
import type { Debt } from "../types"

const router = Router()

const selectColumns = `
  id, customer_name as customerName, description, amount,
  amount - IFNULL((SELECT SUM(amount) FROM debt_payments WHERE debt_id = debts.id), 0) AS remaining,
  CASE WHEN amount - IFNULL((SELECT SUM(amount) FROM debt_payments WHERE debt_id = debts.id), 0) <= 0 THEN 'paid' ELSE 'pending' END AS status,
  created_at as createdAt
`

function getDebt(id: string): Debt | undefined {
  return db.prepare(`SELECT ${selectColumns} FROM debts WHERE id = ?`).get(id) as Debt | undefined
}

/** Kolom status disimpan sekadar cache; sumber kebenarannya adalah sisa piutang. */
function syncStatus(id: string): Debt {
  const debt = getDebt(id)!
  db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(debt.status, id)
  return debt
}

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`

router.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT ${selectColumns} FROM debts ORDER BY created_at DESC`).all()
  res.json(rows)
})

router.get("/:id", (req, res) => {
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  res.json(debt)
})

router.get("/:id/payments", (req, res) => {
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  const rows = db
    .prepare(
      "SELECT id, debt_id as debtId, amount, note, created_at as createdAt FROM debt_payments WHERE debt_id = ? ORDER BY created_at DESC"
    )
    .all(req.params.id)
  res.json(rows)
})

router.post("/", (req, res) => {
  const data = debtSchema.parse(req.body)
  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO debts (id, customer_name, description, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, data.customerName, data.description || "", data.amount, "pending", createdAt)

  // status:"paid" saat pembuatan berarti piutang langsung lunas — catat sebagai pembayaran
  // supaya sisa piutang tetap konsisten dengan riwayat.
  if (data.status === "paid") {
    db.prepare("INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)").run(
      generateId(),
      id,
      data.amount,
      "Lunas saat dicatat",
      createdAt
    )
  }
  const debt = syncStatus(id)

  writeLog(req, {
    action: "created",
    entity: "debt",
    entityId: id,
    entityName: data.customerName,
    details: `Piutang ${data.customerName} — ${rupiah(data.amount)}`,
  })
  res.json(debt)
})

router.put("/:id", (req, res) => {
  const data = debtUpdateSchema.parse(req.body)
  const existing = getDebt(req.params.id)
  if (!existing) throw new HttpError(404, "Piutang tidak ditemukan")

  const paid = existing.amount - existing.remaining
  if (data.amount !== undefined && data.amount < paid) {
    throw new HttpError(400, `Jumlah piutang tidak boleh kurang dari yang sudah dibayar (${rupiah(paid)})`)
  }

  const fields: string[] = []
  const values: unknown[] = []
  if (data.customerName !== undefined) { fields.push("customer_name = ?"); values.push(data.customerName) }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description) }
  if (data.amount !== undefined) { fields.push("amount = ?"); values.push(data.amount) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE debts SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  const debt = syncStatus(req.params.id)
  writeLog(req, {
    action: "updated",
    entity: "debt",
    entityId: debt.id,
    entityName: debt.customerName,
    details: `Piutang "${existing.customerName}" diperbarui`,
  })
  res.json(debt)
})

router.patch("/:id/status", (req, res) => {
  const { status } = debtStatusSchema.parse(req.body)
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")

  if (status === "paid") {
    if (debt.remaining > 0) {
      db.prepare("INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)").run(
        generateId(),
        debt.id,
        debt.remaining,
        "Pelunasan",
        new Date().toISOString()
      )
      writeLog(req, {
        action: "paid",
        entity: "debt",
        entityId: debt.id,
        entityName: debt.customerName,
        details: `Piutang ${debt.customerName} dilunasi (${rupiah(debt.remaining)})`,
      })
    }
  } else if (debt.remaining <= 0) {
    // Membalikkan status ke "pending" hanya masuk akal bila pembayarannya dibatalkan.
    // Tanpa ini, permintaan diam-diam tidak berefek karena status dihitung dari sisa piutang.
    throw new HttpError(
      400,
      "Piutang ini sudah lunas. Hapus riwayat pembayarannya dulu jika ingin dikembalikan ke belum lunas."
    )
  }

  res.json(syncStatus(req.params.id))
})

router.post("/:id/payments", (req, res) => {
  const data = debtPaymentSchema.parse(req.body)
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  if (data.amount > debt.remaining) throw new HttpError(400, `Pembayaran melebihi sisa piutang (${debt.remaining})`)

  db.prepare("INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)").run(
    generateId(),
    req.params.id,
    data.amount,
    data.note || "",
    new Date().toISOString()
  )

  const updated = syncStatus(req.params.id)
  writeLog(req, {
    action: "paid",
    entity: "debt",
    entityId: updated.id,
    entityName: updated.customerName,
    details: `Pembayaran piutang ${updated.customerName} ${rupiah(data.amount)}${
      updated.remaining > 0 ? ` — sisa ${rupiah(updated.remaining)}` : " — Lunas"
    }`,
  })
  res.json(updated)
})

/** Menghapus satu cicilan, mis. salah catat. Sisa piutang otomatis naik lagi. */
router.delete("/:id/payments/:paymentId", (req, res) => {
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")
  const payment = db
    .prepare("SELECT id, amount FROM debt_payments WHERE id = ? AND debt_id = ?")
    .get(req.params.paymentId, req.params.id) as { id: string; amount: number } | undefined
  if (!payment) throw new HttpError(404, "Pembayaran tidak ditemukan")

  db.prepare("DELETE FROM debt_payments WHERE id = ?").run(payment.id)
  const updated = syncStatus(req.params.id)
  writeLog(req, {
    action: "deleted",
    entity: "debt",
    entityId: debt.id,
    entityName: debt.customerName,
    details: `Pembayaran ${rupiah(payment.amount)} pada piutang ${debt.customerName} dibatalkan`,
  })
  res.json(updated)
})

router.delete("/:id", (req, res) => {
  const debt = getDebt(req.params.id)
  if (!debt) throw new HttpError(404, "Piutang tidak ditemukan")

  db.prepare("DELETE FROM debt_payments WHERE debt_id = ?").run(req.params.id)
  db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id)
  writeLog(req, {
    action: "deleted",
    entity: "debt",
    entityId: debt.id,
    entityName: debt.customerName,
    details: `Piutang "${debt.customerName}" dihapus`,
  })
  res.json({ success: true })
})

export default router
