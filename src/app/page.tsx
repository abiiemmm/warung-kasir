"use client"

import { useStore } from "@/context/StoreContext"
import { formatRupiah, todayTransactions } from "@/lib/utils"
import RevenueChart from "@/components/RevenueChart"
import TopProductsChart from "@/components/TopProductsChart"
import CategoryChart from "@/components/CategoryChart"
import TransactionsChart from "@/components/TransactionsChart"

export default function Dashboard() {
  const { products, categories, transactions, debts, reminders } = useStore()
  const todayTx = todayTransactions(transactions)
  const todayRevenue = todayTx.reduce((sum, tx) => sum + tx.total, 0)
  const lowStock = products.filter((p) => p.stock <= 5)
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const pendingDebts = debts.filter((d) => d.status === "pending")
  const totalPiutang = pendingDebts.reduce((sum, d) => sum + d.amount, 0)
  const todayStr = new Date().toISOString().split("T")[0]
  const todayReminders = reminders.filter((r) => r.date === todayStr)

  const stats = [
    { label: "Total Produk", value: products.length, icon: "📦" },
    { label: "Total Kategori", value: categories.length, icon: "📁" },
    { label: "Transaksi Hari Ini", value: todayTx.length, icon: "🧾" },
    { label: "Pendapatan Hari Ini", value: formatRupiah(todayRevenue), icon: "💰", highlight: true },
    { label: "Total Stok", value: totalStock, icon: "📊" },
    { label: "Piutang", value: formatRupiah(totalPiutang), icon: "📝" },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#78716c] mt-1">Ringkasan bisnis warung Anda</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:border-[#d6d3d1]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">{stat.icon}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.highlight ? "bg-emerald-50 text-emerald-600" : "bg-[#f5f5f4] text-[#78716c]"}`}>
                {stat.highlight ? "Hari ini" : "Total"}
              </span>
            </div>
            <p className="text-[28px] font-semibold text-[#1c1917] tracking-tight">{stat.value}</p>
            <p className="text-xs text-[#78716c] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RevenueChart transactions={transactions} />
        <TransactionsChart transactions={transactions} />
        <TopProductsChart transactions={transactions} />
        <CategoryChart transactions={transactions} products={products} categories={categories} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {todayReminders.length > 0 && (
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold text-[#1c1917]">Pengingat Hari Ini</h2>
            </div>
            <div className="space-y-2.5">
              {todayReminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <span className="text-sm font-medium text-[#44403c]">{r.title}</span>
                    {r.notes && <p className="text-xs text-[#78716c]">{r.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lowStock.length > 0 && (
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold text-[#1c1917]">Stok Menipis</h2>
            </div>
            <div className="space-y-2.5">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-sm font-medium text-[#44403c]">{p.name}</span>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">Sisa {p.stock}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingDebts.length > 0 && (
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="text-sm font-semibold text-[#1c1917]">Piutang Belum Dibayar</h2>
            </div>
            <div className="space-y-2.5">
              {pendingDebts.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <span className="text-sm font-medium text-[#44403c]">{d.customerName}</span>
                    <p className="text-xs text-[#78716c]">{d.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md whitespace-nowrap">{formatRupiah(d.amount)}</span>
                </div>
              ))}
              {pendingDebts.length > 4 && (
                <a href="/debts" className="block text-center text-xs font-medium text-[#78716c] hover:text-[#1c1917] transition-colors pt-1">
                  Lihat semua ({pendingDebts.length})
                </a>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold text-[#1c1917]">Transaksi Terakhir</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-[#78716c] py-6 text-center">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2.5">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-[#f5f5f4] last:border-0">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-sm font-medium text-[#44403c] truncate">
                      {tx.items.map((i) => i.name).slice(0, 2).join(", ")}
                      {tx.items.length > 2 && <span className="text-[#78716c]"> +{tx.items.length - 2} lagi</span>}
                    </p>
                    <p className="text-xs text-[#a8a29e] mt-0.5">
                      {new Date(tx.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#1c1917] whitespace-nowrap">{formatRupiah(tx.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
