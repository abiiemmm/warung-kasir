import { z } from "zod"

export const PAYMENT_METHODS = ["cash", "qris", "transfer"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const USER_ROLES = ["owner", "cashier"] as const

/**
 * Gambar hanya boleh berupa data URL bertipe gambar dan dibatasi ukurannya.
 * Tanpa ini, string apa pun sebesar limit body (MB-an) ikut tersimpan dan
 * terbawa di setiap GET /products.
 */
const MAX_IMAGE_CHARS = 400_000 // ~300 KB setelah base64; cukup untuk foto 200px hasil compressImage()

export const imageSchema = z
  .string()
  .max(MAX_IMAGE_CHARS, "Gambar terlalu besar (maksimal ~300 KB)")
  .regex(/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/, "Format gambar tidak valid")
  .nullable()
  .optional()
  .transform((v) => (v === "" ? null : v))

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
})

export const categoryUpdateSchema = categorySchema

export const productSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(200),
  price: z.number().int("Harga harus bilangan bulat").nonnegative("Harga tidak boleh negatif"),
  costPrice: z
    .number()
    .int("Harga modal harus bilangan bulat")
    .nonnegative("Harga modal tidak boleh negatif")
    .default(0),
  stock: z.number().int("Stok harus bilangan bulat").nonnegative("Stok tidak boleh negatif"),
  minStock: z
    .number()
    .int("Stok minimum harus bilangan bulat")
    .nonnegative("Stok minimum tidak boleh negatif")
    .default(0),
  categoryId: z.string().min(1, "Kategori wajib diisi"),
  image: imageSchema,
  barcode: z
    .string()
    .trim()
    .max(64, "Barcode maksimal 64 karakter")
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
})

export const productUpdateSchema = productSchema.partial()

export const stockPatchSchema = z.object({
  qty: z
    .number()
    .int("Qty harus bilangan bulat")
    .refine((v) => v !== 0, "Qty tidak boleh 0"),
  reason: z.string().max(200).optional(),
})

/** Stok opname: kirim hasil hitung fisik, server yang menghitung selisihnya. */
export const stockOpnameSchema = z.object({
  counted: z.number().int("Hasil hitung harus bilangan bulat").nonnegative("Hasil hitung tidak boleh negatif"),
  reason: z.string().max(200).optional(),
})

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int("Qty harus bilangan bulat").positive("Qty harus lebih dari 0"),
})

export const transactionSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Minimal 1 item"),
  payment: z.number().int("Pembayaran harus bilangan bulat").nonnegative(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
  discount: z.number().int("Diskon harus bilangan bulat").nonnegative().default(0),
  /** Kunci anti-dobel: kirim ulang key yang sama akan mengembalikan transaksi yang sudah ada. */
  idempotencyKey: z.string().trim().min(8, "Idempotency key terlalu pendek").max(100).optional(),
})

export const voidSchema = z.object({
  reason: z.string().trim().min(1, "Alasan pembatalan wajib diisi").max(300),
})

export const debtSchema = z.object({
  customerName: z.string().trim().min(1, "Nama pelanggan wajib diisi").max(120),
  description: z.string().max(500).optional(),
  amount: z.number().int().positive("Jumlah harus lebih dari 0"),
  status: z.enum(["pending", "paid"]).optional(),
})

export const debtUpdateSchema = debtSchema.omit({ status: true }).partial()

export const debtStatusSchema = z.object({
  status: z.enum(["pending", "paid"]),
})

export const debtPaymentSchema = z.object({
  amount: z.number().int().positive("Jumlah pembayaran harus lebih dari 0"),
  note: z.string().max(500).optional(),
})

export const reminderSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  productId: z.string().nullable().optional(),
  notes: z.string().max(1000).optional(),
})

export const reminderUpdateSchema = reminderSchema.partial()

export const logSchema = z.object({
  action: z.string().trim().min(1).max(50),
  entity: z.string().trim().min(1).max(50),
  entityId: z.string().max(100).optional(),
  entityName: z.string().max(300).optional(),
  details: z.string().max(2000).optional(),
})

const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, "PIN harus 4-8 digit angka")

export const loginSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  pin: pinSchema,
})

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  pin: pinSchema,
  role: z.enum(USER_ROLES).default("cashier"),
})

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  pin: pinSchema.optional(),
  role: z.enum(USER_ROLES).optional(),
  active: z.boolean().optional(),
})

export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
})

export const shiftOpenSchema = z.object({
  openingCash: z.number().int("Modal awal harus bilangan bulat").nonnegative("Modal awal tidak boleh negatif"),
})

export const shiftCloseSchema = z.object({
  closingCash: z
    .number()
    .int("Uang laci harus bilangan bulat")
    .nonnegative("Uang laci tidak boleh negatif"),
  note: z.string().max(500).optional(),
})

export const resetSchema = z.object({
  seed: z.boolean().optional(),
  /** Konfirmasi eksplisit supaya reset tidak pernah terjadi karena request nyasar. */
  confirm: z.literal("HAPUS SEMUA DATA", {
    message: 'Ketik "HAPUS SEMUA DATA" untuk konfirmasi',
  }),
})
