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
  createdAt: string
}

export interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
  image?: string
}

export interface Transaction {
  id: string
  items: CartItem[]
  total: number
  payment: number
  change: number
  createdAt: string
}

export type DebtStatus = "pending" | "paid"

export interface Debt {
  id: string
  customerName: string
  description: string
  amount: number
  status: DebtStatus
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
