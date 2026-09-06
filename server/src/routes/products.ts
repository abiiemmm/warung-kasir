import { Router } from "express"
import { db, generateId } from "../db"
import { productSchema, productUpdateSchema, stockPatchSchema, stockOpnameSchema } from "../validation"
import { HttpError, paginate, parsePagination } from "../utils"
import { requireOwner } from "../auth"
import { writeLog } from "../audit"
import type { StockAdjustmentType } from "../types"

const router = Router()

const selectColumns = `
  id, name, price, cost_price as costPrice, stock, min_stock as minStock,
  category_id as categoryId, image, barcode, created_at as createdAt
`

function mapProduct(row: Record<string, unknown>) {
  return {
    ...row,
    image: row.image || undefined,
    barcode: row.barcode || undefined,
  }
}

function ensureCategoryExists(categoryId: string): void {
  const cat = db.prepare("SELECT id FROM categories WHERE id = ?").get(categoryId)
  if (!cat) throw new HttpError(400, "Kategori tidak ditemukan")
}

function recordAdjustment(
  req: Parameters<typeof writeLog>[0],
  args: {
    productId: string
    productName: string
    type: StockAdjustmentType
    before: number
    after: number
    reason: string
  }
): void {
  db.prepare(
    `INSERT INTO stock_adjustments
       (id, product_id, product_name, type, qty_before, qty_after, delta, reason, user_id, user_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    generateId(),
    args.productId,
    args.productName,
    args.type,
    args.before,
    args.after,
    args.after - args.before,
    args.reason,
    req.user?.id || "",
    req.user?.name || "Sistem",
    new Date().toISOString()
  )
}

router.get("/", (req, res) => {
  const { search, categoryId, lowStock } = req.query
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined

  const where: string[] = []
  const values: unknown[] = []
  if (search) {
    where.push("(LOWER(name) LIKE ? OR barcode LIKE ?)")
    const like = `%${String(search).toLowerCase()}%`
    values.push(like, like)
  }
  if (categoryId) {
    where.push("category_id = ?")
    values.push(categoryId)
  }
  if (lowStock === "true") {
    // min_stock 0 berarti pakai ambang global 10.
    where.push("stock <= (CASE WHEN min_stock > 0 THEN min_stock ELSE 10 END)")
  }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : ""

  if (hasPagination) {
    const { page, limit, offset } = parsePagination(req.query)
    const total = db.prepare(`SELECT COUNT(*) as c FROM products${whereSql}`).get(...values) as { c: number }
    const rows = db
      .prepare(`SELECT ${selectColumns} FROM products${whereSql} ORDER BY name LIMIT ? OFFSET ?`)
      .all(...values, limit, offset) as Record<string, unknown>[]
    return res.json(paginate(rows.map(mapProduct), total.c, page, limit))
  }

  const rows = db.prepare(`SELECT ${selectColumns} FROM products${whereSql} ORDER BY name`).all(...values) as Record<
    string,
    unknown
  >[]
  res.json(rows.map(mapProduct))
})

router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT ${selectColumns} FROM products WHERE id = ?`).get(req.params.id) as
    | Record<string, unknown>
    | undefined
  if (!row) throw new HttpError(404, "Produk tidak ditemukan")
  res.json(mapProduct(row))
})

/** Riwayat perubahan stok sebuah produk (restok, opname, pembatalan). */
router.get("/:id/adjustments", (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, product_id as productId, product_name as productName, type,
              qty_before as qtyBefore, qty_after as qtyAfter, delta, reason,
              user_id as userId, user_name as userName, created_at as createdAt
       FROM stock_adjustments WHERE product_id = ? ORDER BY created_at DESC LIMIT 100`
    )
    .all(req.params.id)
  res.json(rows)
})

router.post("/", (req, res) => {
  const data = productSchema.parse(req.body)
  ensureCategoryExists(data.categoryId)

  const id = generateId()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO products (id, name, price, cost_price, stock, min_stock, category_id, image, barcode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.price,
    data.costPrice,
    data.stock,
    data.minStock,
    data.categoryId,
    data.image || null,
    data.barcode || null,
    createdAt
  )

  writeLog(req, {
    action: "created",
    entity: "product",
    entityId: id,
    entityName: data.name,
    details: `Produk "${data.name}" ditambahkan`,
  })
  res.json({ ...data, id, createdAt, image: data.image || undefined, barcode: data.barcode || undefined })
})

router.put("/:id", (req, res) => {
  const data = productUpdateSchema.parse(req.body)
  const existing = db
    .prepare("SELECT id, name, price, cost_price as costPrice, stock FROM products WHERE id = ?")
    .get(req.params.id) as { id: string; name: string; price: number; costPrice: number; stock: number } | undefined
  if (!existing) throw new HttpError(404, "Produk tidak ditemukan")
  if (data.categoryId !== undefined) ensureCategoryExists(data.categoryId)

  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name) }
  if (data.price !== undefined) { fields.push("price = ?"); values.push(data.price) }
  if (data.costPrice !== undefined) { fields.push("cost_price = ?"); values.push(data.costPrice) }
  if (data.stock !== undefined) { fields.push("stock = ?"); values.push(data.stock) }
  if (data.minStock !== undefined) { fields.push("min_stock = ?"); values.push(data.minStock) }
  if (data.categoryId !== undefined) { fields.push("category_id = ?"); values.push(data.categoryId) }
  if (data.image !== undefined) { fields.push("image = ?"); values.push(data.image || null) }
  if (data.barcode !== undefined) { fields.push("barcode = ?"); values.push(data.barcode || null) }

  if (fields.length > 0) {
    values.push(req.params.id)
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values)
  }

  // Stok yang diubah lewat form ikut tercatat sebagai koreksi manual.
  if (data.stock !== undefined && data.stock !== existing.stock) {
    recordAdjustment(req, {
      productId: existing.id,
      productName: data.name ?? existing.name,
      type: "correction",
      before: existing.stock,
      after: data.stock,
      reason: "Diubah lewat form produk",
    })
  }

  const changes: string[] = []
  if (data.name && data.name !== existing.name) changes.push(`nama: "${existing.name}" → "${data.name}"`)
  if (data.price !== undefined && data.price !== existing.price) changes.push(`harga: ${existing.price} → ${data.price}`)
  if (data.costPrice !== undefined && data.costPrice !== existing.costPrice) changes.push(`modal: ${existing.costPrice} → ${data.costPrice}`)
  if (data.stock !== undefined && data.stock !== existing.stock) changes.push(`stok: ${existing.stock} → ${data.stock}`)

  const row = db.prepare(`SELECT ${selectColumns} FROM products WHERE id = ?`).get(req.params.id) as Record<string, unknown>
  writeLog(req, {
    action: "updated",
    entity: "product",
    entityId: existing.id,
    entityName: String(row.name),
    details: changes.length ? `Produk "${existing.name}" diubah: ${changes.join(", ")}` : `Produk "${existing.name}" diperbarui`,
  })
  res.json(mapProduct(row))
})

router.delete("/:id", requireOwner, (req, res) => {
  const existing = db.prepare("SELECT id, name FROM products WHERE id = ?").get(req.params.id) as
    | { id: string; name: string }
    | undefined
  if (!existing) throw new HttpError(404, "Produk tidak ditemukan")

  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id)
  writeLog(req, {
    action: "deleted",
    entity: "product",
    entityId: existing.id,
    entityName: existing.name,
    details: `Produk "${existing.name}" dihapus`,
  })
  res.json({ success: true })
})

router.patch("/:id/stock", (req, res) => {
  const { qty, reason } = stockPatchSchema.parse(req.body)
  const existing = db.prepare("SELECT id, name, stock FROM products WHERE id = ?").get(req.params.id) as
    | { id: string; name: string; stock: number }
    | undefined
  if (!existing) throw new HttpError(404, "Produk tidak ditemukan")

  const newStock = Math.max(0, existing.stock + qty)
  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newStock, req.params.id)

  recordAdjustment(req, {
    productId: existing.id,
    productName: existing.name,
    type: "restock",
    before: existing.stock,
    after: newStock,
    reason: reason || (qty > 0 ? "Restok" : "Pengurangan stok"),
  })
  writeLog(req, {
    action: "updated",
    entity: "product",
    entityId: existing.id,
    entityName: existing.name,
    details: `Stok "${existing.name}" ${qty > 0 ? `+${qty}` : qty} → ${newStock}`,
  })

  res.json({ stock: newStock })
})

/** Stok opname: kirim hasil hitung fisik, selisihnya tercatat beserta alasannya. */
router.post("/:id/opname", (req, res) => {
  const { counted, reason } = stockOpnameSchema.parse(req.body)
  const existing = db.prepare("SELECT id, name, stock FROM products WHERE id = ?").get(req.params.id) as
    | { id: string; name: string; stock: number }
    | undefined
  if (!existing) throw new HttpError(404, "Produk tidak ditemukan")

  const delta = counted - existing.stock
  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(counted, req.params.id)

  recordAdjustment(req, {
    productId: existing.id,
    productName: existing.name,
    type: "opname",
    before: existing.stock,
    after: counted,
    reason: reason || "Stok opname",
  })
  writeLog(req, {
    action: "opname",
    entity: "product",
    entityId: existing.id,
    entityName: existing.name,
    details: `Opname "${existing.name}": sistem ${existing.stock}, fisik ${counted} (selisih ${delta > 0 ? "+" : ""}${delta})`,
  })

  res.json({ stock: counted, before: existing.stock, delta })
})

export default router
