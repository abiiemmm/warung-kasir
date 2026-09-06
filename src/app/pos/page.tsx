"use client"

/* eslint-disable @next/next/no-img-element -- gambar produk berupa data-URL, next/image tidak mendukungnya */

import { useState, useMemo } from "react"
import { useStore } from "@/context/StoreContext"
import Icon, { type IconName } from "@/components/Icon"
import { formatRupiah } from "@/lib/utils"
import type { Transaction, PaymentMethod } from "@/lib/types"

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: "cash", label: "Tunai", icon: "wallet" },
  { value: "qris", label: "QRIS", icon: "qr" },
  { value: "transfer", label: "Transfer", icon: "shop" },
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
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
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
    if (!payment || pay < total || busy) return
    setBusy(true)
    setCheckoutError("")
    try {
      const tx = await checkout(pay, paymentMethod, discountNum)
      if (tx) { setReceipt(tx); setPayment(""); setDiscount("") }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Pembayaran gagal. Silakan coba lagi.")
    } finally { setBusy(false) }
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
            <svg className="w-7 h-7 text-[var(--green)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">Transaksi Berhasil!</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Pembayaran telah diterima</p>
        </div>

        <PreviewReceipt receipt={receipt} />

        <div className="flex gap-3 justify-center mt-6">
          <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 bg-[var(--ink)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Kembali ke Kasir
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-[var(--green)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            Cetak Struk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pos-page page-container">
      <div className="page-eyebrow"><span>MEJA KASIR</span><span>Pilih barang · Periksa belanja · Terima pembayaran</span></div>
      <header className="page-heading"><div><h1>Ada yang mau belanja?</h1><p>Cari barangnya, catat belanjanya.</p></div><a href="#cart-panel" className="cart-jump"><Icon name="cart" size={18} />{cart.reduce((sum, item) => sum + item.qty, 0)} barang di keranjang</a></header>
      <div className="pos-layout">
        <section className="product-catalog" aria-label="Daftar produk">
          <div className="catalog-search"><Icon name="search" size={21} /><input type="search" aria-label="Cari nama produk atau barcode" placeholder="Cari nama barang atau scan barcode…" value={search} onChange={e => setSearch(e.target.value)} /><span>{products.length} produk</span></div>
          <div className="category-tabs" aria-label="Filter kategori"><button aria-pressed={!catFilter} onClick={() => setCatFilter("")}>Semua barang</button>{categories.map(cat => <button key={cat.id} aria-pressed={catFilter === cat.id} onClick={() => setCatFilter(cat.id)}>{cat.name}</button>)}</div>
          <div className="catalog-caption"><span>{filtered.length} barang ditampilkan</span><span>Harga per satuan</span></div>
          {filtered.length === 0 ? <div className="catalog-empty"><Icon name="search" size={32} /><h2>{products.length ? "Barang belum ketemu" : "Rak masih kosong"}</h2><p>{products.length ? "Coba nama lain atau pilih kategori yang berbeda." : "Tambahkan produk di menu Produk & stok untuk mulai berjualan."}</p>{products.length > 0 && <button className="text-link" onClick={() => { setSearch(""); setCatFilter("") }}>Tampilkan semua barang <Icon name="arrow" size={16} /></button>}</div> : <div className="product-grid">
            {filtered.map(p => {
              const inCart = cart.find(item => item.productId === p.id)?.qty || 0
              return <button key={p.id} onClick={() => handleAdd(p)} disabled={p.stock <= inCart || busy} className={`product-tile ${inCart ? "in-cart" : ""}`} aria-label={`Tambah ${p.name}, ${formatRupiah(p.price)}, stok ${p.stock}`}>
                <div className="product-visual">{p.image ? <img src={p.image} alt={p.name} /> : <div className="product-monogram"><span>{categories.find(cat => cat.id === p.categoryId)?.name || "WARUNG"}</span><strong>{p.name.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join("")}</strong><Icon name="box" size={18} /></div>}{inCart > 0 && <span className="cart-quantity">{inCart} di keranjang</span>}</div>
                <span className="product-category">{categories.find(cat => cat.id === p.categoryId)?.name || "Lainnya"}</span><h2>{p.name}</h2>
                <div className="product-price"><strong>{formatRupiah(p.price)}</strong><span className="add-product"><Icon name="plus" size={16} /></span></div>
                <span className={`product-stock ${p.stock <= 5 ? "stock-low" : ""}`}>{p.stock === 0 ? "Stok habis" : `Stok ${p.stock}${inCart >= p.stock ? " · Semua di keranjang" : ""}`}</span>
              </button>
            })}
          </div>}
        </section>
        <aside id="cart-panel" className="checkout-panel" aria-label="Keranjang belanja">
          <div className="checkout-heading"><span className="eyebrow">CATATAN BELANJA</span><div><h2>Keranjang</h2><span>{cart.reduce((sum, item) => sum + item.qty, 0)} barang</span></div></div>
          {cart.length === 0 ? <div className="cart-empty"><span className="empty-bag"><Icon name="cart" size={35} /></span><h3>Menunggu belanja pertama</h3><p>Ketuk barang untuk<br />menambahkannya ke keranjang.</p><div className="empty-receipt-lines"><i /><i /><i /></div></div> : <>
            <ul className="cart-items">{cart.map((item, idx) => <li key={item.productId}>
              <div className="cart-item-title"><strong>{item.name}</strong><button onClick={() => removeFromCart(idx)} disabled={busy} aria-label={`Hapus ${item.name}`}><Icon name="close" size={16} /></button></div>
              <div className="cart-item-detail"><span>{formatRupiah(item.price)}</span><div className="quantity-control"><button disabled={busy} aria-label={`Kurangi ${item.name}`} onClick={() => item.qty === 1 ? removeFromCart(idx) : updateCartQty(idx, item.qty - 1)}>−</button><span>{item.qty}</span><button disabled={busy || item.qty >= (products.find(p => p.id === item.productId)?.stock || 0)} aria-label={`Tambah ${item.name}`} onClick={() => updateCartQty(idx, item.qty + 1)}>+</button></div><strong>{formatRupiah(item.price * item.qty)}</strong></div>
            </li>)}</ul>
            <div className="checkout-totals"><div><span>Subtotal</span><strong>{formatRupiah(subtotal)}</strong></div><label htmlFor="discount"><span>Diskon <small>(Rp)</small></span><input id="discount" type="text" inputMode="numeric" placeholder="0" value={discount === "" ? "" : discountNum.toLocaleString("id-ID")} onChange={e => setDiscount(e.target.value.replace(/\D/g, ""))} disabled={busy} /></label><div className="grand-total"><span>Total belanja</span><strong>{formatRupiah(total)}</strong></div></div>
            <div className="payment-section"><span className="payment-label">Metode pembayaran</span><div className="payment-methods">{PAYMENT_METHODS.map(m => <button key={m.value} disabled={busy} aria-pressed={paymentMethod === m.value} onClick={() => setPaymentMethod(m.value)}><Icon name={m.icon} size={19} />{m.label}</button>)}</div>
              <label className="payment-label" htmlFor="payment">{paymentMethod === "cash" ? "Uang diterima" : "Nominal diterima"}</label><div className="payment-input"><span>Rp</span><input id="payment" type="text" inputMode="numeric" placeholder="0" disabled={busy} value={payment === "" ? "" : Number(payment).toLocaleString("id-ID")} onChange={e => setPayment(e.target.value.replace(/\D/g, ""))} /></div>
              <div className="quick-payment"><button disabled={busy} onClick={() => setPayment(String(total))}>Uang pas</button>{paymentMethod === "cash" && [20000, 50000, 100000].filter(value => value > total).map(value => <button key={value} disabled={busy} onClick={() => setPayment(String(value))}>{value / 1000} ribu</button>)}</div>
              {payment !== "" && <div className={`change-due ${Number(payment) < total ? "payment-short" : ""}`} aria-live="polite"><span>{Number(payment) < total ? "Masih kurang" : "Kembalian"}</span><strong>{formatRupiah(Math.abs(Number(payment) - total))}</strong></div>}
              {checkoutError && <p role="alert" className="login-error">{checkoutError}</p>}
              <button className="button-primary pay-button" onClick={handleCheckout} disabled={busy || payment === "" || Number(payment) < total}>{busy ? "Menyimpan transaksi…" : "Selesaikan pembayaran"}<Icon name="arrow" size={18} /></button>
              <button className="clear-cart" disabled={busy} onClick={clearCart}>Kosongkan keranjang</button>
            </div>
          </>}
          <div className="receipt-edge" aria-hidden="true" />
        </aside>
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
      <div className="w-[340px] bg-[var(--surface)] rounded-md border-2 border-[var(--line)] shadow-lg p-6 font-mono text-xs leading-relaxed">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
          <p className="text-sm font-bold tracking-tight text-[var(--ink)]">WARUNG KASIR</p>
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
            <div key={idx} className="flex justify-between text-[11px] text-[#45533f]">
              <span className="w-[38%] truncate">{item.name}</span>
              <span className="w-[16%] text-center">{item.qty}</span>
              <span className="w-[22%] text-right">{formatRupiah(item.price)}</span>
              <span className="w-[24%] text-right font-semibold">{formatRupiah(item.price * item.qty)}</span>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-2 space-y-1">
          <div className="flex justify-between text-[11px] text-[#45533f]">
            <span className="font-semibold">Subtotal</span>
            <span className="text-[#45533f]">{formatRupiah(receipt.total + receipt.discount)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-[11px] text-[#45533f]">
              <span>Diskon</span>
              <span>−{formatRupiah(receipt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] text-[#45533f]">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-sm text-[var(--ink)]">{formatRupiah(receipt.total)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#45533f]">
            <span>{PAYMENT_LABELS[receipt.paymentMethod] || "Tunai"}</span>
            <span>{formatRupiah(receipt.payment)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Kembali</span>
            <span className="font-semibold text-[var(--green)]">{formatRupiah(receipt.change)}</span>
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
