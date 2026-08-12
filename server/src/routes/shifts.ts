import { Router } from "express"
import { db, generateId } from "../db"
import { shiftOpenSchema, shiftCloseSchema } from "../validation"
import { HttpError, paginate, parsePagination } from "../utils"
import { requireOwner } from "../auth"
import { writeLog } from "../audit"
import type { Shift } from "../types"

const router = Router()

const selectColumns = `
  id, user_id as userId, user_name as userName, opening_cash as openingCash,
  closing_cash as closingCash, expected_cash as expectedCash, difference,
  note, opened_at as openedAt, closed_at as closedAt
`

export function findOpenShift(userId: string): Shift | undefined {
  return db
    .prepare(`SELECT ${selectColumns} FROM shifts WHERE user_id = ? AND closed_at IS NULL`)
    .get(userId) as Shift | undefined
}

/** Modal awal + seluruh penjualan tunai yang belum dibatalkan pada shift ini. */
function expectedCashFor(shift: Shift): number {
  const row = db
    .prepare(
      `SELECT IFNULL(SUM(total), 0) as sum FROM transactions
       WHERE shift_id = ? AND payment_method = 'cash' AND voided_at IS NULL`
    )
    .get(shift.id) as { sum: number }
  return shift.openingCash + row.sum
}

/** Shift yang sedang berjalan milik pengguna yang login. */
router.get("/current", (req, res) => {
  const shift = findOpenShift(req.user!.id)
  if (!shift) return res.json(null)
  res.json({ ...shift, expectedCash: expectedCashFor(shift) })
})

router.get("/", (req, res) => {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined
  // Kasir hanya boleh melihat shift miliknya sendiri; pemilik melihat semua.
  const mine = req.user!.role !== "owner"
  const whereSql = mine ? " WHERE user_id = ?" : ""
  const values = mine ? [req.user!.id] : []

  if (hasPagination) {
    const { page, limit, offset } = parsePagination(req.query)
    const total = db.prepare(`SELECT COUNT(*) as c FROM shifts${whereSql}`).get(...values) as { c: number }
    const rows = db
      .prepare(`SELECT ${selectColumns} FROM shifts${whereSql} ORDER BY opened_at DESC LIMIT ? OFFSET ?`)
      .all(...values, limit, offset)
    return res.json(paginate(rows, total.c, page, limit))
  }

  const rows = db.prepare(`SELECT ${selectColumns} FROM shifts${whereSql} ORDER BY opened_at DESC`).all(...values)
  res.json(rows)
})

router.post("/open", (req, res) => {
  const { openingCash } = shiftOpenSchema.parse(req.body)
  if (findOpenShift(req.user!.id)) throw new HttpError(400, "Masih ada shift yang belum ditutup")

  const id = generateId()
  const openedAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO shifts (id, user_id, user_name, opening_cash, note, opened_at) VALUES (?, ?, ?, ?, '', ?)"
  ).run(id, req.user!.id, req.user!.name, openingCash, openedAt)

  writeLog(req, {
    action: "shift_open",
    entity: "shift",
    entityId: id,
    entityName: req.user!.name,
    details: `Shift dibuka dengan modal Rp${openingCash.toLocaleString("id-ID")}`,
  })

  res.json({
    id,
    userId: req.user!.id,
    userName: req.user!.name,
    openingCash,
    expectedCash: openingCash,
    note: "",
    openedAt,
  })
})

router.post("/close", (req, res) => {
  const { closingCash, note } = shiftCloseSchema.parse(req.body)
  const shift = findOpenShift(req.user!.id)
  if (!shift) throw new HttpError(400, "Tidak ada shift yang sedang berjalan")

  const expected = expectedCashFor(shift)
  const difference = closingCash - expected
  const closedAt = new Date().toISOString()

  db.prepare(
    "UPDATE shifts SET closing_cash = ?, expected_cash = ?, difference = ?, note = ?, closed_at = ? WHERE id = ?"
  ).run(closingCash, expected, difference, note || "", closedAt, shift.id)

  const selisih =
    difference === 0
      ? "pas"
      : `${difference > 0 ? "lebih" : "kurang"} Rp${Math.abs(difference).toLocaleString("id-ID")}`
  writeLog(req, {
    action: "shift_close",
    entity: "shift",
    entityId: shift.id,
    entityName: req.user!.name,
    details: `Shift ditutup — laci Rp${closingCash.toLocaleString("id-ID")}, seharusnya Rp${expected.toLocaleString("id-ID")} (${selisih})`,
  })

  res.json({ ...shift, closingCash, expectedCash: expected, difference, note: note || "", closedAt })
})

/** Rekap satu shift: dipakai untuk cetak laporan tutup laci. */
router.get("/:id", (req, res) => {
  const shift = db.prepare(`SELECT ${selectColumns} FROM shifts WHERE id = ?`).get(req.params.id) as Shift | undefined
  if (!shift) throw new HttpError(404, "Shift tidak ditemukan")
  if (req.user!.role !== "owner" && shift.userId !== req.user!.id) {
    throw new HttpError(403, "Tidak boleh melihat shift pengguna lain")
  }

  const totals = db
    .prepare(
      `SELECT payment_method as method, COUNT(*) as count, IFNULL(SUM(total), 0) as revenue
       FROM transactions WHERE shift_id = ? AND voided_at IS NULL GROUP BY payment_method`
    )
    .all(shift.id) as { method: string; count: number; revenue: number }[]

  const voided = db
    .prepare("SELECT COUNT(*) as c FROM transactions WHERE shift_id = ? AND voided_at IS NOT NULL")
    .get(shift.id) as { c: number }

  res.json({
    ...shift,
    expectedCash: shift.closedAt ? shift.expectedCash : expectedCashFor(shift),
    byMethod: Object.fromEntries(totals.map((t) => [t.method, { count: t.count, revenue: t.revenue }])),
    transactionCount: totals.reduce((s, t) => s + t.count, 0),
    revenue: totals.reduce((s, t) => s + t.revenue, 0),
    voidedCount: voided.c,
  })
})

/** Pemilik bisa menutup paksa shift kasir yang lupa tutup. */
router.post("/:id/force-close", requireOwner, (req, res) => {
  const { closingCash, note } = shiftCloseSchema.parse(req.body)
  const shift = db.prepare(`SELECT ${selectColumns} FROM shifts WHERE id = ?`).get(req.params.id) as Shift | undefined
  if (!shift) throw new HttpError(404, "Shift tidak ditemukan")
  if (shift.closedAt) throw new HttpError(400, "Shift sudah ditutup")

  const expected = expectedCashFor(shift)
  const difference = closingCash - expected
  const closedAt = new Date().toISOString()
  db.prepare(
    "UPDATE shifts SET closing_cash = ?, expected_cash = ?, difference = ?, note = ?, closed_at = ? WHERE id = ?"
  ).run(closingCash, expected, difference, note || "Ditutup paksa oleh pemilik", closedAt, shift.id)

  writeLog(req, {
    action: "shift_close",
    entity: "shift",
    entityId: shift.id,
    entityName: shift.userName,
    details: `Shift ${shift.userName} ditutup paksa oleh pemilik`,
  })
  res.json({ ...shift, closingCash, expectedCash: expected, difference, closedAt })
})

export default router
