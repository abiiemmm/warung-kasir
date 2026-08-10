export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  categoryId: string
  image?: string
  barcode?: string
  createdAt: string
}

export interface CartItem {
  productId: string
  name: string
  price: number
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
  timestamp: string
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
  itemCount: number
  avgPerTx: number
  byMethod: Record<string, number>
  daily: { date: string; count: number; revenue: number }[]
}

export interface ProductReportRow {
  productId: string
  name: string
  qty: number
  revenue: number
}

export interface CategoryReportRow {
  categoryId: string
  name: string
  qty: number
  revenue: number
}
