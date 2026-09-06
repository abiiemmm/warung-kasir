"use client"

/* eslint-disable @next/next/no-img-element -- gambar produk berupa data-URL, next/image tidak mendukungnya */

import { useState, useMemo } from "react"
import { useStore } from "@/context/StoreContext"
import { formatRupiah } from "@/lib/utils"
import type { Transaction, PaymentMethod } from "@/lib/types"

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "cash", label: "Tunai", icon: "💵" },
  { value: "qris", label: "QRIS", icon: "📱" },
  { value: "transfer", label: "Transfer", icon: "🏦" },
]

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
}

export default function PosPage() {
  const { products, categories, cart, addToCart, removeFromCart, updateCartQty, clearCart, checkout } = useStore()
  const [payment, setPayment] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [discount, setDiscount] = useState("")
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [receipt, setReceipt] = useState<Transaction | null>(null)


  const filtered = useMemo(
    () => products.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch = p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q)
      const matchCat = !catFilter || p.categoryId === catFilter
      return matchSearch && matchCat
    }),
    [products, search, catFilter]
  )

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const discountNum = Math.min(Number(discount) || 0, subtotal)
  const total = Math.max(0, subtotal - discountNum)

  function handleAdd(product: typeof products[0]) {
    if (product.stock > 0) {
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        qty: 1,
        image: product.image,
      })
    }
  }

  async function handleCheckout() {
    const pay = Number(payment)
    if (!pay || pay < total) return
    const tx = await checkout(pay, paymentMethod, discountNum)
    if (tx) { setReceipt(tx); setPayment(""); setDiscount("") }
  }

  function handlePrint() {
    window.print()
  }

  function goBack() {
    setReceipt(null)
  }

  if (receipt) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1c1917]">Transaksi Berhasil!</h2>
          <p className="text-sm text-[#78716c] mt-0.5">Pembayaran telah diterima</p>
        </div>

        <PreviewReceipt receipt={receipt} />

        <div className="flex gap-3 justify-center mt-6">
          <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Kembali ke Kasir
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            Cetak Struk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Kasir</h1>
        <p className="text-sm text-[#78716c] mt-1">Point of Sale — pilih produk lalu bayar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-4 mb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a29e]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  type="text"
                  placeholder="Cari produk..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">Semua</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAdd(p)}
                disabled={p.stock === 0}
                className={`text-left p-3 rounded-xl border transition-all duration-150 ${
                  p.stock === 0
                    ? "border-[#e7e5e4] bg-[#f5f5f4] opacity-40 cursor-not-allowed"
                    : "border-[#e7e5e4] bg-white hover:border-[#1c1917]/20 hover:shadow-md cursor-pointer active:scale-[0.98]"
                }`}
              >
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full aspect-square rounded-lg object-cover mb-2.5 bg-[#f5f5f4]" />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-[#f5f5f4] flex items-center justify-center mb-2.5 text-2xl">📦</div>
                )}
                <p className="text-sm font-semibold text-[#1c1917] truncate leading-tight">{p.name}</p>
                <p className="text-sm font-bold text-emerald-600 mt-1.5">{formatRupiah(p.price)}</p>
                <p className={`text-xs mt-0.5 ${p.stock <= 5 ? "text-red-500" : "text-[#a8a29e]"}`}>
                  {p.stock === 0 ? "Habis" : `Stok: ${p.stock}`}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-5 flex flex-col h-fit sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#1c1917]">🛒 Keranjang</h2>
              {cart.length > 0 && (
                <span className="text-xs font-medium text-[#78716c] bg-[#f5f5f4] px-2 py-0.5 rounded-md">{cart.length} item</span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">🛍️</p>
                <p className="text-sm text-[#a8a29e]">Keranjang kosong</p>
                <p className="text-xs text-[#d6d3d1] mt-0.5">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              <>
                <ul className="space-y-2 mb-4 max-h-[340px] overflow-y-auto flex-1 pr-1">
                  {cart.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 bg-[#f5f5f4] rounded-lg p-2.5 group">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-9 h-9 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-sm shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1c1917] truncate">{item.name}</p>
                        <p className="text-xs text-[#a8a29e]">{formatRupiah(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCartQty(idx, item.qty - 1)} className="w-6 h-6 rounded-md bg-white border border-[#e7e5e4] text-xs font-medium text-[#78716c] hover:bg-[#f5f5f4] transition-colors">−</button>
                        <span className="w-7 text-center text-sm font-semibold text-[#1c1917]">{item.qty}</span>
                        <button onClick={() => updateCartQty(idx, item.qty + 1)} className="w-6 h-6 rounded-md bg-white border border-[#e7e5e4] text-xs font-medium text-[#78716c] hover:bg-[#f5f5f4] transition-colors">+</button>
                      </div>
                      <p className="text-sm font-semibold text-[#1c1917] w-16 text-right">{formatRupiah(item.price * item.qty)}</p>
                      <button onClick={() => removeFromCart(idx)} className="text-[#d6d3d1] hover:text-red-400 text-sm transition-colors opacity-0 group-hover:opacity-100">✕</button>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[#e7e5e4] pt-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-[#78716c]">Subtotal</span>
                    <span className="text-lg font-bold text-[#1c1917]">{formatRupiah(subtotal)}</span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#a8a29e] font-medium">−</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Diskon (Rp)"
                      className="w-full pl-8 pr-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                      value={discount === "" ? "" : discountNum.toLocaleString("id-ID")}
                      onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  {discountNum > 0 && (
                    <div className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-amber-600 font-medium">Diskon</span>
                      <span className="text-sm font-bold text-amber-600">−{formatRupiah(discountNum)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-[#78716c]">Total</span>
                    <span className="text-xl font-bold text-[#1c1917]">{formatRupiah(total)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMethod === m.value
                            ? "border-[#1c1917] bg-[#1c1917] text-white shadow-sm"
                            : "border-[#e7e5e4] bg-[#f5f5f4] text-[#78716c] hover:bg-white"
                        }`}
                      >
                        <span className="text-base">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#a8a29e] font-medium">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Jumlah bayar"
                      className="w-full pl-8 pr-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={payment === "" ? "" : Number(payment).toLocaleString("id-ID")}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "")
                        setPayment(raw)
                      }}
                    />
                  </div>

                  {payment && Number(payment) >= total && (
                    <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-emerald-600 font-medium">Kembali</span>
                      <span className="text-sm font-bold text-emerald-600">{formatRupiah(Number(payment) - total)}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={!payment || Number(payment) < total || cart.length === 0}
                    className="w-full px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 disabled:bg-[#d6d3d1] disabled:cursor-not-allowed transition-colors"
                  >
                    Bayar • {formatRupiah(total)}
                  </button>

                  <button onClick={clearCart} className="w-full px-5 py-2.5 border border-[#e7e5e4] rounded-xl text-sm text-[#78716c] hover:bg-[#f5f5f4] transition-colors">
                    Kosongkan Keranjang
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const PreviewReceipt = ({ receipt }: { receipt: Transaction }) => {
  const now = new Date(receipt.createdAt)
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="receipt-print-area flex justify-center">
      <div className="w-[340px] bg-white rounded-xl border-2 border-[#e7e5e4] shadow-lg p-6 font-mono text-xs leading-relaxed">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
          <p className="text-sm font-bold tracking-tight text-[#1c1917]">WARUNG KASIR</p>
          <p className="text-[10px] text-gray-400">Jl. Contoh No. 123, Kota</p>
          <p className="text-[10px] text-gray-400">Telp: 0812-3456-7890</p>
        </div>

        <div className="text-[10px] text-gray-500 mb-3 flex justify-between">
          <span>No: #{receipt.id.slice(-8).toUpperCase()}</span>
          <span>{dateStr} {timeStr}</span>
        </div>

        <div className="border-t-2 border-b-2 border-dashed border-gray-300 py-1.5 mb-2">
          <div className="flex justify-between text-[10px] font-semibold text-gray-400">
            <span className="w-[38%]">Item</span>
            <span className="w-[16%] text-center">Qty</span>
            <span className="w-[22%] text-right">Harga</span>
            <span className="w-[24%] text-right">Subtotal</span>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-[11px] text-[#44403c]">
              <span className="w-[38%] truncate">{item.name}</span>
              <span className="w-[16%] text-center">{item.qty}</span>
              <span className="w-[22%] text-right">{formatRupiah(item.price)}</span>
              <span className="w-[24%] text-right font-semibold">{formatRupiah(item.price * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-2 space-y-1">
          <div className="flex justify-between text-[11px] text-[#44403c]">
            <span className="font-semibold">Subtotal</span>
            <span className="text-[#44403c]">{formatRupiah(receipt.total + receipt.discount)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-[11px] text-[#44403c]">
              <span>Diskon</span>
              <span>−{formatRupiah(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] text-[#44403c]">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-sm text-[#1c1917]">{formatRupiah(receipt.total)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#44403c]">
            <span>{PAYMENT_LABELS[receipt.paymentMethod] || "Tunai"}</span>
            <span>{formatRupiah(receipt.payment)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Kembali</span>
            <span className="font-semibold text-emerald-600">{formatRupiah(receipt.change)}</span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-gray-300 mt-3 pt-3 text-center text-[10px] text-gray-400">
          <p>Terima kasih telah berbelanja</p>
          <p className="mt-0.5">Barang yang sudah dibeli tidak dapat</p>
          <p>ditukar atau dikembalikan</p>
          <div className="mt-2 text-[8px] text-gray-300 tracking-[0.2em]">— STRUK INI DICETAK OTOMATIS —</div>
        </div>
      </div>
    </div>
  )
}
