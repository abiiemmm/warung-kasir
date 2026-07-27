import type { Category, Product, Transaction, Debt, DebtStatus, StockReminder, LogEntry, CartItem } from "./types"

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

function get<T>(path: string): Promise<T> { return request("GET", path) }
function post<T>(path: string, body: unknown): Promise<T> { return request("POST", path, body) }
function put<T>(path: string, body: unknown): Promise<T> { return request("PUT", path, body) }
function patch<T>(path: string, body: unknown): Promise<T> { return request("PATCH", path, body) }
function del<T>(path: string): Promise<T> { return request("DELETE", path) }

export async function getCategories(): Promise<Category[]> { return get("/categories") }

export async function addCategory(name: string): Promise<Category> { return post("/categories", { name }) }

export async function updateCategory(id: string, name: string): Promise<Category | null> {
  try { return put(`/categories/${id}`, { name }) } catch { return null }
}

export async function deleteCategory(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/categories/${id}`)
  return res.success
}

export async function getProducts(): Promise<Product[]> { return get("/products") }

export async function addProduct(product: Omit<Product, "id" | "createdAt">): Promise<Product> { return post("/products", product) }

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

export async function getTransactions(): Promise<Transaction[]> { return get("/transactions") }

export async function addTransaction(transaction: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> { return post("/transactions", transaction) }

export async function getDebts(): Promise<Debt[]> { return get("/debts") }

export async function addDebt(debt: Omit<Debt, "id" | "createdAt">): Promise<Debt> { return post("/debts", debt) }

export async function updateDebtStatus(id: string, status: DebtStatus): Promise<Debt | null> {
  try { return patch<Debt>(`/debts/${id}/status`, { status }) } catch { return null }
}

export async function updateDebt(id: string, data: Partial<Omit<Debt, "id" | "createdAt">>): Promise<Debt | null> {
  try { return put(`/debts/${id}`, data) } catch { return null }
}

export async function deleteDebt(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/debts/${id}`)
  return res.success
}

export async function getReminders(): Promise<StockReminder[]> { return get("/reminders") }

export async function addReminder(reminder: Omit<StockReminder, "id" | "createdAt">): Promise<StockReminder> { return post("/reminders", reminder) }

export async function updateReminder(id: string, data: Partial<Omit<StockReminder, "id" | "createdAt">>): Promise<StockReminder | null> {
  try { return put(`/reminders/${id}`, data) } catch { return null }
}

export async function deleteReminder(id: string): Promise<boolean> {
  const res = await del<{ success: boolean }>(`/reminders/${id}`)
  return res.success
}

export async function getLogs(): Promise<LogEntry[]> { return get("/logs") }

export async function addLogEntry(log: Omit<LogEntry, "id" | "timestamp">): Promise<LogEntry> { return post("/logs", log) }
