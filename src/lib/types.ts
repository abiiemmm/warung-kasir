export type UserRole = "owner" | "cashier"

export interface AuthUser {
  id: string
  name: string
  role: UserRole
}

export interface User extends AuthUser {
  active: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  price: number
  /** Harga modal, dipakai menghitung laba kotor. */
  costPrice: number
  stock: number
  /** Ambang peringatan stok menipis; 0 = pakai ambang global. */
  minStock: number
  categoryId: string
  image?: string
  barcode?: string
  createdAt: string
}

export interface CartItem {
  productId: string
  name: string
  price: number
  costPrice: number
  qty: number
  image?: string
}

export type PaymentMethod = "cash" | "qris" | "transfer"

export interface Transaction {
  id: string
  items: CartItem[]
  total: number
  payment: number
  change: number
  paymentMethod: PaymentMethod
  discount: number
  costTotal: number
  userId: string
  userName: string
  shiftId?: string
  voidedAt?: string
  voidReason: string
  createdAt: string
}

export type DebtStatus = "pending" | "paid"

export interface Debt {
  id: string
  customerName: string
  description: string
  amount: number
  remaining: number
  status: DebtStatus
  createdAt: string
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  note: string
  createdAt: string
}

export interface LogEntry {
  id: string
  action: string
  entity: string
  entityId: string
  entityName: string
  details: string
  userId: string
  userName: string
  timestamp: string
}

export interface Shift {
  id: string
  userId: string
  userName: string
  openingCash: number
  closingCash?: number
  expectedCash?: number
  difference?: number
  note: string
  openedAt: string
  closedAt?: string
}

export interface ShiftDetail extends Shift {
  byMethod: Record<string, { count: number; revenue: number }>
  transactionCount: number
  revenue: number
  voidedCount: number
}

export type StockAdjustmentType = "restock" | "opname" | "void" | "correction"

export interface StockAdjustment {
  id: string
  productId: string
  productName: string
  type: StockAdjustmentType
  qtyBefore: number
  qtyAfter: number
  delta: number
  reason: string
  userId: string
  userName: string
  createdAt: string
}

export interface StockReminder {
  id: string
  date: string
  title: string
  productId?: string
  notes: string
  createdAt: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface ReportSummary {
  count: number
  totalRevenue: number
  totalDiscount: number
  totalCost: number
  grossProfit: number
  itemCount: number
  avgPerTx: number
  byMethod: Record<string, number>
  daily: { date: string; count: number; revenue: number; profit: number }[]
  voidedCount: number
  voidedTotal: number
}

export interface ProductReportRow {
  productId: string
  name: string
  qty: number
  revenue: number
  profit: number
}

export interface CategoryReportRow {
  categoryId: string
  name: string
  qty: number
  revenue: number
  profit: number
}

export interface UserReportRow {
  userId: string
  name: string
  count: number
  revenue: number
  profit: number
}
