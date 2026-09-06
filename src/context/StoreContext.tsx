"use client"

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from "react"
import { Category, Product, Transaction, CartItem, Debt, DebtStatus, StockReminder, PaymentMethod } from "@/lib/types"
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getTransactions,
  addTransaction,
  getDebts,
  addDebt,
  updateDebtStatus,
  updateDebt,
  deleteDebt,
  addDebtPayment,
  getReminders,
  addReminder,
  updateReminder,
  deleteReminder,
} from "@/lib/api"

interface State {
  categories: Category[]
  products: Product[]
  transactions: Transaction[]
  debts: Debt[]
  reminders: StockReminder[]
  cart: CartItem[]
}

type Action =
  | { type: "SET_DATA"; payload: { categories: Category[]; products: Product[]; transactions: Transaction[]; debts: Debt[]; reminders: StockReminder[] } }
  | { type: "SET_CATEGORIES"; payload: Category[] }
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "SET_TRANSACTIONS"; payload: Transaction[] }
  | { type: "SET_DEBTS"; payload: Debt[] }
  | { type: "SET_REMINDERS"; payload: StockReminder[] }
  | { type: "ADD_TO_CART"; payload: CartItem }
  | { type: "REMOVE_FROM_CART"; payload: number }
  | { type: "UPDATE_CART_QTY"; payload: { index: number; qty: number } }
  | { type: "CLEAR_CART" }

const initialState: State = {
  categories: [],
  products: [],
  transactions: [],
  debts: [],
  reminders: [],
  cart: [],
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DATA":
      return { ...state, ...action.payload }
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload }
    case "SET_PRODUCTS":
      return { ...state, products: action.payload }
    case "SET_TRANSACTIONS":
      return { ...state, transactions: action.payload }
    case "SET_DEBTS":
      return { ...state, debts: action.payload }
    case "SET_REMINDERS":
      return { ...state, reminders: action.payload }
    case "ADD_TO_CART": {
      const existing = state.cart.find((item) => item.productId === action.payload.productId)
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.productId === action.payload.productId ? { ...item, qty: item.qty + action.payload.qty } : item
          ),
        }
      }
      return { ...state, cart: [...state.cart, action.payload] }
    }
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((_, i) => i !== action.payload) }
    case "UPDATE_CART_QTY":
      return {
        ...state,
        cart: state.cart.map((item, i) =>
          i === action.payload.index ? { ...item, qty: action.payload.qty } : item
        ),
      }
    case "CLEAR_CART":
      return { ...state, cart: [] }
    default:
      return state
  }
}

interface StoreContextType extends State {
  refreshData: () => void
  addCategory: (name: string) => Promise<Category>
  updateCategory: (id: string, name: string) => Promise<Category | null>
  deleteCategory: (id: string) => Promise<boolean>
  addProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<Product>
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => Promise<Product | null>
  deleteProduct: (id: string) => Promise<boolean>
  updateStock: (id: string, qty: number) => Promise<boolean>
  addToCart: (item: CartItem) => void
  removeFromCart: (index: number) => void
  updateCartQty: (index: number, qty: number) => void
  clearCart: () => void
  checkout: (payment: number, paymentMethod: PaymentMethod, discount: number) => Promise<Transaction | null>
  addDebt: (debt: { customerName: string; description: string; amount: number; status: DebtStatus }) => Promise<Debt>
  updateDebtStatus: (id: string, status: DebtStatus) => Promise<Debt | null>
  updateDebt: (id: string, data: Partial<Omit<Debt, "id" | "createdAt">>) => Promise<Debt | null>
  deleteDebt: (id: string) => Promise<boolean>
  payDebt: (id: string, amount: number, note: string) => Promise<Debt | null>
  addReminder: (reminder: Omit<StockReminder, "id" | "createdAt">) => Promise<StockReminder>
  updateReminder: (id: string, data: Partial<Omit<StockReminder, "id" | "createdAt">>) => Promise<StockReminder | null>
  deleteReminder: (id: string) => Promise<boolean>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const refreshData = useCallback(async () => {
    const [categories, products, transactions, debts, reminders] = await Promise.all([
      getCategories(),
      getProducts(),
      getTransactions(),
      getDebts(),
      getReminders(),
    ])
    dispatch({ type: "SET_DATA", payload: { categories, products, transactions, debts, reminders } })
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const addCategoryFn = useCallback(async (name: string) => {
    const cat = await addCategory(name)
    const categories = await getCategories()
    dispatch({ type: "SET_CATEGORIES", payload: categories })
    return cat
  }, [])

  const updateCategoryFn = useCallback(async (id: string, name: string) => {
    const result = await updateCategory(id, name)
    const categories = await getCategories()
    dispatch({ type: "SET_CATEGORIES", payload: categories })
    return result
  }, [])

  const deleteCategoryFn = useCallback(async (id: string) => {
    let result = false
    try {
      result = await deleteCategory(id)
    } catch { /* kategori masih dipakai produk */ }
    const categories = await getCategories()
    dispatch({ type: "SET_CATEGORIES", payload: categories })
    return result
  }, [])

  const addProductFn = useCallback(async (product: Omit<Product, "id" | "createdAt">) => {    const result = await addProduct(product)
    const products = await getProducts()
    dispatch({ type: "SET_PRODUCTS", payload: products })
    return result
  }, [])

  const updateProductFn = useCallback(async (id: string, data: Partial<Omit<Product, "id" | "createdAt">>) => {
    const prev = state.products.find((p) => p.id === id)
    const result = await updateProduct(id, data)
    const products = await getProducts()
    dispatch({ type: "SET_PRODUCTS", payload: products })
    if (result && prev) {
      const changes: string[] = []
      if (data.name && data.name !== prev.name) changes.push(`nama: "${prev.name}" → "${data.name}"`)
      if (data.price !== undefined && data.price !== prev.price) changes.push(`harga: ${prev.price} → ${data.price}`)
      if (data.stock !== undefined && data.stock !== prev.stock) changes.push(`stok: ${prev.stock} → ${data.stock}`)
    }
    return result
  }, [state.products])

  const deleteProductFn = useCallback(async (id: string) => {
    const result = await deleteProduct(id)
    const products = await getProducts()
    dispatch({ type: "SET_PRODUCTS", payload: products })
    return result
  }, [])

  const updateStockFn = useCallback(async (id: string, qty: number) => {
    const ok = await updateProductStock(id, qty)
    if (!ok) return false
    const products = await getProducts()
    dispatch({ type: "SET_PRODUCTS", payload: products })
    return true
  }, [])

  const addToCart = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_TO_CART", payload: item })
  }, [])

  const removeFromCart = useCallback((index: number) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: index })
  }, [])

  const updateCartQty = useCallback((index: number, qty: number) => {
    if (qty < 1) return
    dispatch({ type: "UPDATE_CART_QTY", payload: { index, qty } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" })
  }, [])

  const checkout = useCallback(
    async (payment: number, paymentMethod: PaymentMethod = "cash", discount = 0) => {
      if (state.cart.length === 0) return null
      const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0)
      const total = Math.max(0, subtotal - discount)
      if (payment < total) return null

      const transaction = {
        items: state.cart.map((item) => ({ productId: item.productId, qty: item.qty })),
        payment,
        paymentMethod,
        discount,
        // Kunci sekali pakai per checkout: kalau tombol Bayar tertekan dua kali
        // (atau jaringan lambat lalu di-retry), server mengembalikan transaksi
        // yang sama alih-alih memotong stok dua kali.
        idempotencyKey: crypto.randomUUID(),
      }

      const result = await addTransaction(transaction)
      const [transactions, products] = await Promise.all([getTransactions(), getProducts()])
      dispatch({ type: "SET_TRANSACTIONS", payload: transactions })
      dispatch({ type: "SET_PRODUCTS", payload: products })
      dispatch({ type: "CLEAR_CART" })
      return result
    },
    [state.cart]
  )

  const addDebtFn = useCallback(async (debt: { customerName: string; description: string; amount: number; status: DebtStatus }) => {
    const result = await addDebt(debt)
    const debts = await getDebts()
    dispatch({ type: "SET_DEBTS", payload: debts })
    return result
  }, [])

  const updateDebtStatusFn = useCallback(async (id: string, status: DebtStatus) => {
    const result = await updateDebtStatus(id, status)
    const debts = await getDebts()
    dispatch({ type: "SET_DEBTS", payload: debts })
    return result
  }, [])

  const updateDebtFn = useCallback(async (id: string, data: Partial<Omit<Debt, "id" | "createdAt">>) => {
    const result = await updateDebt(id, data)
    const debts = await getDebts()
    dispatch({ type: "SET_DEBTS", payload: debts })
    return result
  }, [])

  const deleteDebtFn = useCallback(async (id: string) => {
    const result = await deleteDebt(id)
    const debts = await getDebts()
    dispatch({ type: "SET_DEBTS", payload: debts })
    return result
  }, [])

  const payDebtFn = useCallback(async (id: string, amount: number, note: string) => {
    const result = await addDebtPayment(id, amount, note)
    const debts = await getDebts()
    dispatch({ type: "SET_DEBTS", payload: debts })
    return result
  }, [])

  const addReminderFn = useCallback(async (reminder: Omit<StockReminder, "id" | "createdAt">) => {
    const result = await addReminder(reminder)
    const reminders = await getReminders()
    dispatch({ type: "SET_REMINDERS", payload: reminders })
    return result
  }, [])

  const updateReminderFn = useCallback(async (id: string, data: Partial<Omit<StockReminder, "id" | "createdAt">>) => {
    const result = await updateReminder(id, data)
    const reminders = await getReminders()
    dispatch({ type: "SET_REMINDERS", payload: reminders })
    return result
  }, [])

  const deleteReminderFn = useCallback(async (id: string) => {
    const result = await deleteReminder(id)
    const reminders = await getReminders()
    dispatch({ type: "SET_REMINDERS", payload: reminders })
    return result
  }, [])

  return (
    <StoreContext.Provider
      value={{
        ...state,
        refreshData,
        addCategory: addCategoryFn,
        updateCategory: updateCategoryFn,
        deleteCategory: deleteCategoryFn,
        addProduct: addProductFn,
        updateProduct: updateProductFn,
        deleteProduct: deleteProductFn,
        updateStock: updateStockFn,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        checkout,
        addDebt: addDebtFn,
        updateDebtStatus: updateDebtStatusFn,
        updateDebt: updateDebtFn,
        deleteDebt: deleteDebtFn,
        payDebt: payDebtFn,
        addReminder: addReminderFn,
        updateReminder: updateReminderFn,
        deleteReminder: deleteReminderFn,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
