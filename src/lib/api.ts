import type {
  Category, Product, Transaction, Debt, DebtStatus, DebtPayment, StockReminder, LogEntry,
  CartItem, Paginated, PaymentMethod, ReportSummary, ProductReportRow, CategoryReportRow,
} from "./types"
import { downloadBlob } from "./utils"

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch { /* ignore */ }
    throw new Error(message)
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
export async function updateProductStock(id: string, qty: number): Promise<boolean> {
  try { await patch<{ stock: number }>(`/products/${id}/stock`, { qty }); return true } catch { return false }
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
  transaction: { items: { productId: string; qty: number }[]; payment: number; paymentMethod: PaymentMethod; discount: number }
): Promise<Transaction> {
  return post("/transactions", transaction)
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

export async function getLogs(): Promise<LogEntry[]> { return get("/logs") }
export async function getLogsPaginated(
  page = 1,
  limit = 50,
  filters: { entity?: string; action?: string; q?: string } = {}
): Promise<Paginated<LogEntry>> {
  return get(`/logs${qs({ page, limit, entity: filters.entity, action: filters.action, q: filters.q })}`)
}
export async function addLogEntry(log: Omit<LogEntry, "id" | "timestamp">): Promise<LogEntry> {
  return post("/logs", log)
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

// ---------- Backup & Export ----------

export async function downloadBackup() {
  const res = await fetch(`${BASE}/backup`)
  if (!res.ok) throw new Error("Gagal membuat backup")
  downloadBlob(await res.blob(), `warung-backup-${Date.now()}.db`)
}

export async function downloadExport() {
  const res = await fetch(`${BASE}/export`)
  if (!res.ok) throw new Error("Gagal ekspor data")
  downloadBlob(await res.blob(), `warung-data-export-${Date.now()}.json`)
}

export async function restoreBackup(file: Blob): Promise<boolean> {
  const res = await fetch(`${BASE}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
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

export async function resetData(seed: boolean): Promise<boolean> {
  const res = await fetch(`${BASE}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed }),
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
