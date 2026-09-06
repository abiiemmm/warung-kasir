"use client"

import Link from "next/link"
import { useStore } from "@/context/StoreContext"
import { useAuth } from "@/context/AuthContext"
import { formatRupiah, todayTransactions, today, isLowStock } from "@/lib/utils"
import RevenueChart from "@/components/RevenueChart"
import TopProductsChart from "@/components/TopProductsChart"
import CategoryChart from "@/components/CategoryChart"
import TransactionsChart from "@/components/TransactionsChart"
import Icon from "@/components/Icon"

export default function Dashboard() {
  const { products, categories, transactions, debts, reminders } = useStore()
  const { user } = useAuth()
  const validTransactions = transactions.filter(tx => !tx.voidedAt)
  const todayTx = todayTransactions(validTransactions)
  const todayRevenue = todayTx.reduce((sum, tx) => sum + tx.total, 0)
  const lowStock = products.filter(isLowStock).sort((a, b) => a.stock - b.stock)
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const pendingDebts = debts.filter(d => d.status === "pending")
  const totalPiutang = pendingDebts.reduce((sum, d) => sum + d.remaining, 0)
  const todayReminders = reminders.filter(r => r.date === today())
  const date = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="dashboard page-container">
      <div className="page-eyebrow"><span>BUKU HARIAN WARUNG</span><span>{date}</span></div>
      <header className="page-heading">
        <div><h1>Selamat berjualan, {user?.name.split(" ")[0]}.</h1><p>Semua catatan warung, dalam satu tempat.</p></div>
        <Link href="/pos" className="button-primary"><Icon name="plus" size={18} /> Transaksi baru <Icon name="arrow" size={18} /></Link>
      </header>

      <section className="daily-summary" aria-label="Ringkasan warung">
        <div className="revenue-stat"><span className="stat-caption">PENJUALAN HARI INI</span><strong>{formatRupiah(todayRevenue)}</strong><span className="stat-foot"><Icon name="receipt" size={16} /> Dari {todayTx.length} transaksi hari ini</span><Icon name="shop" size={108} className="stat-watermark" /></div>
        <div className="summary-stat"><span className="stat-caption">TRANSAKSI HARI INI</span><strong>{todayTx.length}<small> transaksi</small></strong><span className="stat-foot">Rata-rata {formatRupiah(todayTx.length ? todayRevenue / todayTx.length : 0)}</span></div>
        <Link href="/products" className="summary-stat"><span className="stat-caption">ISI RAK WARUNG <Icon name="arrow" size={16} /></span><strong>{products.length}<small> produk</small></strong><span className="stat-foot">{totalStock} stok · {categories.length} kategori</span></Link>
        <Link href="/debts" className="summary-stat"><span className="stat-caption">PIUTANG TERSISA <Icon name="arrow" size={16} /></span><strong className="debt-value">{formatRupiah(totalPiutang)}</strong><span className="stat-foot">{pendingDebts.length} catatan belum lunas</span></Link>
      </section>

      <div className="dashboard-main">
        <div className="dashboard-charts">
          <div className="section-heading"><div><span className="section-number">01 /</span><h2>Catatan penjualan</h2></div><span>Bulan berjalan</span></div>
          <RevenueChart transactions={validTransactions} />
          <div className="secondary-charts"><TopProductsChart transactions={validTransactions} /><TransactionsChart transactions={validTransactions} /></div>
        </div>
        <aside className="attention-panel">
          <div className="section-heading"><div><span className="section-number">02 /</span><h2>Perlu dilihat</h2></div><Icon name="alert" size={18} /></div>
          <section className="stock-note">
            <div className="note-title"><Icon name="box" size={20} /><h3>Waktunya isi rak</h3><span>{lowStock.length}</span></div>
            <p>Produk yang sudah mencapai batas stok minimum.</p>
            {lowStock.length === 0 ? <div className="quiet-state"><Icon name="check" /><span>Stok masih aman. Siap melayani!</span></div> : <div className="stock-list">{lowStock.slice(0, 5).map(p => <Link href="/products" key={p.id}><span>{p.name}</span><strong className={p.stock === 0 ? "out-of-stock" : ""}>{p.stock === 0 ? "Habis" : p.stock + " tersisa"}</strong></Link>)}</div>}
            <Link href="/products" className="text-link">Kelola stok produk <Icon name="arrow" size={16} /></Link>
          </section>
          <section className="reminder-note">
            <div className="note-title"><Icon name="calendar" size={20} /><h3>Agenda hari ini</h3></div>
            {todayReminders.length ? todayReminders.map(r => <div className="reminder-entry" key={r.id}><strong>{r.title}</strong>{r.notes && <p>{r.notes}</p>}</div>) : <p>Belum ada pengingat hari ini. Catat jadwal belanja agar tidak terlewat.</p>}
            <Link href="/calendar" className="text-link">Buka pengingat <Icon name="arrow" size={16} /></Link>
          </section>
          <Link href="/shift" className="shift-link"><Icon name="wallet" size={22} /><span><strong>Uang laci sudah cocok?</strong><small>Periksa catatan shift kasir</small></span><Icon name="arrow" size={18} /></Link>
        </aside>
      </div>

      <div className="dashboard-bottom">
        <section className="recent-section">
          <div className="section-heading"><div><span className="section-number">03 /</span><h2>Transaksi terakhir</h2></div><Link href="/transactions" className="text-link">Lihat semua <Icon name="arrow" size={16} /></Link></div>
          <div className="ledger-table">
            {transactions.length === 0 ? <div className="empty-ledger"><Icon name="receipt" size={32} /><h3>Halaman pertama masih kosong.</h3><p>Transaksi yang selesai akan tercatat di sini.</p><Link href="/pos" className="text-link">Mulai transaksi <Icon name="arrow" size={16} /></Link></div> : transactions.slice(0, 5).map(tx => <Link href="/transactions" className="ledger-row" key={tx.id}><span className="ledger-icon"><Icon name="receipt" size={18} /></span><div><strong>{tx.items.map(i => i.name).slice(0, 2).join(", ")}{tx.items.length > 2 ? " +" + (tx.items.length - 2) : ""}</strong><small>{new Date(tx.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {tx.userName}</small></div><span className={tx.voidedAt ? "status-void" : "status-paid"}>{tx.voidedAt ? "Dibatalkan" : tx.paymentMethod === "cash" ? "Tunai" : tx.paymentMethod === "qris" ? "QRIS" : "Transfer"}</span><strong>{formatRupiah(tx.total)}</strong></Link>)}
          </div>
        </section>
        <CategoryChart transactions={validTransactions} products={products} categories={categories} />
      </div>
      <footer className="page-footer"><span>warung kasir.</span><span>Jualan lancar. Catatan teratur.</span></footer>
    </div>
  )
}
