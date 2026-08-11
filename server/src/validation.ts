import { z } from "zod"

export const PAYMENT_METHODS = ["cash", "qris", "transfer"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
})

export const categoryUpdateSchema = categorySchema

export const productSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(200),
  price: z.number().int("Harga harus bilangan bulat").nonnegative("Harga tidak boleh negatif"),
  stock: z.number().int("Stok harus bilangan bulat").nonnegative("Stok tidak boleh negatif"),
  categoryId: z.string().min(1, "Kategori wajib diisi"),
  image: z.string().nullable().optional(),
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
