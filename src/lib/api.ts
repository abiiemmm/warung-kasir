import type {
  Category, Product, Transaction, Debt, DebtStatus, DebtPayment, StockReminder, LogEntry,
  CartItem, Paginated, PaymentMethod, ReportSummary, ProductReportRow, CategoryReportRow,
  AuthUser, User, UserRole, Shift, ShiftDetail, StockAdjustment, UserReportRow,
} from "./types"
import { downloadBlob } from "./utils"

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

/** Dipanggil saat server menjawab 401 supaya UI bisa kembali ke halaman login. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Cookie sesi harus ikut terkirim.
    credentials: "same-origin",
  })
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch { /* ignore */ }
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.()
    throw new ApiError(res.status, message)
  }
  return res.json()
}

function get<T>(path: string): Promise<T> { return request("GET", path) }
function post<T>(path: string, body: unknown): Promise<T> { return request("POST", path, body) }
function put<T>(path: string, body: unknown): Promise<T> { return request("PUT", path, body) }
function patch<T>(path: string, body: unknown): Promise<T> { return request("PATCH", path, body) }
function del<T>(path: string): Promise<T> { return request("DELETE", path) }

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

// ---------- Auth ----------

export async function login(name: string, pin: string): Promise<AuthUser> {
  return post("/auth/login", { name, pin })
}
export async function logout(): Promise<void> {
  await post("/auth/logout", {})
}
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await get<AuthUser>("/auth/me")
  } catch {
    return null
  }
}
export async function changePin(currentPin: string, newPin: string): Promise<void> {
  await post("/auth/change-pin", { currentPin, newPin })
}

// ---------- Users (khusus pemilik) ----------

export async function getUsers(): Promise<User[]> { return get("/users") }
export async function addUser(name: string, pin: string, role: UserRole): Promise<User> {
  return post("/users", { name, pin, role })
}
export async function updateUser(
  id: string,
  data: Partial<{ name: string; pin: string; role: UserRole; active: boolean }>
): Promise<User> {
  return put(`/users/${id}`, data)
}
export async function deleteUser(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/users/${id}`)
  return res.success
}

// ---------- Shift ----------

export async function getCurrentShift(): Promise<Shift | null> { return get("/shifts/current") }
export async function getShifts(): Promise<Shift[]> { return get("/shifts") }
export async function getShiftDetail(id: string): Promise<ShiftDetail> { return get(`/shifts/${id}`) }
export async function openShift(openingCash: number): Promise<Shift> {
  return post("/shifts/open", { openingCash })
}
export async function closeShift(closingCash: number, note: string): Promise<Shift> {
  return post("/shifts/close", { closingCash, note })
}

// ---------- Categories ----------

export async function getCategories(): Promise<Category[]> { return get("/categories") }
export async function addCategory(name: string): Promise<Category> { return post("/categories", { name }) }
export async function updateCategory(id: string, name: string): Promise<Category | null> {
  try { return put(`/categories/${id}`, { name }) } catch { return null }
}
export async function deleteCategory(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/categories/${id}`)
  return res.success
}

// ---------- Products ----------

export async function getProducts(): Promise<Product[]> { return get("/products") }
export async function getProduct(id: string): Promise<Product> { return get(`/products/${id}`) }
export async function addProduct(product: Omit<Product, "id" | "createdAt">): Promise<Product> {
  return post("/products", product)
}
export async function updateProduct(id: string, data: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product | null> {
  try { return put(`/products/${id}`, data) } catch { return null }
}
export async function deleteProduct(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/products/${id}`)
  return res.success
}
export async function updateProductStock(id: string, qty: number, reason?: string): Promise<boolean> {
  try { await patch<{ stock: number }>(`/products/${id}/stock`, { qty, reason }); return true } catch { return false }
}
export async function opnameProduct(id: string, counted: number, reason: string): Promise<{ stock: number; before: number; delta: number }> {
  return post(`/products/${id}/opname`, { counted, reason })
}
export async function getStockAdjustments(id: string): Promise<StockAdjustment[]> {
  return get(`/products/${id}/adjustments`)
}

// ---------- Transactions ----------

export async function getTransactions(): Promise<Transaction[]> { return get("/transactions") }
export async function getTransactionsPaginated(
  page = 1,
  limit = 50,
  filters: { from?: string; to?: string; paymentMethod?: string } = {}
): Promise<Paginated<Transaction>> {
  return get(`/transactions${qs({ page, limit, from: filters.from, to: filters.to, paymentMethod: filters.paymentMethod })}`)
}
export async function addTransaction(
  transaction: {
    items: { productId: string; qty: number }[]
    payment: number
    paymentMethod: PaymentMethod
    discount: number
    idempotencyKey?: string
  }
): Promise<Transaction> {
  return post("/transactions", transaction)
}
export async function voidTransaction(id: string, reason: string): Promise<Transaction> {
  return post(`/transactions/${id}/void`, { reason })
}

// ---------- Debts ----------

export async function getDebts(): Promise<Debt[]> { return get("/debts") }
export async function addDebt(debt: { customerName: string; description: string; amount: number; status: DebtStatus }): Promise<Debt> {
  return post("/debts", debt)
}
export async function updateDebtStatus(id: string, status: DebtStatus): Promise<Debt | null> {
  try { return patch<Debt>(`/debts/${id}/status`, { status }) } catch { return null }
}
export async function updateDebt(id: string, data: Partial<{ customerName: string; description: string; amount: number }>): Promise<Debt | null> {
  try { return put(`/debts/${id}`, data) } catch { return null }
}
export async function deleteDebt(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/debts/${id}`)
  return res.success
}
export async function getDebtPayments(id: string): Promise<DebtPayment[]> { return get(`/debts/${id}/payments`) }
export async function addDebtPayment(id: string, amount: number, note: string): Promise<Debt | null> {
  try { return post<Debt>(`/debts/${id}/payments`, { amount, note }) } catch { return null }
}

// ---------- Reminders ----------

export async function getReminders(): Promise<StockReminder[]> { return get("/reminders") }
export async function addReminder(reminder: Omit<StockReminder, "id" | "createdAt">): Promise<StockReminder> {
  return post("/reminders", reminder)
}
export async function updateReminder(id: string, data: Partial<Omit<StockReminder, "id" | "createdAt">>): Promise<StockReminder | null> {
  try { return put(`/reminders/${id}`, data) } catch { return null }
}
export async function deleteReminder(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/reminders/${id}`)
  return res.success
}

// ---------- Logs ----------

// Log hanya bisa dibaca — penulisannya dilakukan server (lihat server/src/audit.ts).
export async function getLogs(): Promise<LogEntry[]> { return get("/logs") }
export async function getLogsPaginated(
  page = 1,
  limit = 50,
  filters: { entity?: string; action?: string; q?: string } = {}
): Promise<Paginated<LogEntry>> {
  return get(`/logs${qs({ page, limit, entity: filters.entity, action: filters.action, q: filters.q })}`)
}

// ---------- Reports ----------

export async function getReportSummary(from: string, to: string): Promise<ReportSummary> {
  return get(`/reports/summary${qs({ from, to })}`)
}
export async function getReportByProduct(from: string, to: string): Promise<{ data: ProductReportRow[] }> {
  return get(`/reports/by-product${qs({ from, to })}`)
}
export async function getReportByCategory(from: string, to: string): Promise<{ data: CategoryReportRow[] }> {
  return get(`/reports/by-category${qs({ from, to })}`)
}
export async function getReportByUser(from: string, to: string): Promise<{ data: UserReportRow[] }> {
  return get(`/reports/by-user${qs({ from, to })}`)
}

// ---------- Backup & Export ----------

export async function downloadBackup() {
  const res = await fetch(`${BASE}/backup`, { credentials: "same-origin" })
  if (!res.ok) throw new Error("Gagal membuat backup")
  downloadBlob(await res.blob(), `warung-backup-${Date.now()}.db`)
}

export async function downloadExport() {
  const res = await fetch(`${BASE}/export`, { credentials: "same-origin" })
  if (!res.ok) throw new Error("Gagal ekspor data")
  downloadBlob(await res.blob(), `warung-data-export-${Date.now()}.json`)
}

export async function restoreBackup(file: Blob): Promise<boolean> {
  const res = await fetch(`${BASE}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
    credentials: "same-origin",
  })
  if (!res.ok) {
    let message = `Gagal restore (${res.status})`
    try {
      const d = await res.json()
      if (d?.error) message = d.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return true
}

/** Konfirmasi harus persis seperti ini, dicek ulang oleh server. */
export const RESET_CONFIRM_PHRASE = "HAPUS SEMUA DATA"

export async function resetData(seed: boolean, confirm: string): Promise<boolean> {
  const res = await fetch(`${BASE}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed, confirm }),
    credentials: "same-origin",
  })
  if (!res.ok) {
    let message = `Gagal reset (${res.status})`
    try {
      const d = await res.json()
      if (d?.error) message = d.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return true
}

export type { CartItem }
