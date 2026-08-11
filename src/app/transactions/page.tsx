"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { formatRupiah, today } from "@/lib/utils"
import { getTransactionsPaginated } from "@/lib/api"
import type { Transaction, PaymentMethod } from "@/lib/types"

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
}

const PAGE_SIZE = 50

export default function TransactionsPage() {
  const [filter, setFilter] = useState<"all" | "today" | "date">("all")
  const [filterDate, setFilterDate] = useState("")
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [data, setData] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: number, f: "all" | "today" | "date", date: string) => {
    setLoading(true)
    const from = f === "all" ? undefined : date || today()
    const to = from
    const res = await getTransactionsPaginated(p, PAGE_SIZE, { from, to })
    setData(res.data)
    setTotal(res.total)
    setPages(res.pages)
    setPage(res.page)
    setLoading(false)
  }, [])

  useEffect(() => {
    load(1, filter, filterDate)
  }, [filter, filterDate, load])

  function goPage(p: number) {
    if (p < 1 || p > pages || p === page) return
    load(p, filter, filterDate)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Riwayat Transaksi</h1>
        <p className="text-sm text-[#78716c] mt-1">Lihat semua transaksi yang telah terjadi</p>
      </div>

      <div className="flex justify-end mb-6">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setFilter("all"); setFilterDate("") }} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === "all" ? "bg-[#1c1917] text-white shadow-lg shadow-black/10" : "bg-white border border-[#e7e5e4] text-[#78716c] hover:bg-[#f5f5f4] hover:border-[#d6d3d1]"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
            Semua
          </button>
          <button onClick={() => { setFilter("today"); setFilterDate("") }} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === "today" ? "bg-[#1c1917] text-white shadow-lg shadow-black/10" : "bg-white border border-[#e7e5e4] text-[#78716c] hover:bg-[#f5f5f4] hover:border-[#d6d3d1]"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            Hari Ini
          </button>
          <div className="relative">
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${filter === "date" ? "bg-[#1c1917] text-white border-[#1c1917] shadow-lg shadow-black/10" : "bg-white border-[#e7e5e4] text-[#78716c]"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
              <span>{filterDate ? new Date(filterDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Pilih Tanggal"}</span>
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setFilter("date") }}
              className="absolute inset-0 opacity-0 cursor-pointer"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-12 text-center">
            <p className="text-sm text-[#a8a29e]">Memuat...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm text-[#a8a29e]">Belum ada transaksi</p>
          </div>
        ) : (
          data.map((tx) => (
            <div key={tx.id} className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
              <button onClick={() => setSelectedTx(tx)} className="w-full flex items-center justify-between p-5 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f5f5f4] flex items-center justify-center text-sm">🧾</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#44403c] truncate">
                      {tx.items.length} item<span className="text-[#a8a29e] font-normal"> — </span>
                      {tx.items.map((i) => i.name).slice(0, 2).join(", ")}
                      {tx.items.length > 2 && <span className="text-[#a8a29e]"> +{tx.items.length - 2} lainnya</span>}
                    </p>
                    <p className="text-xs text-[#a8a29e] mt-0.5">
                      {new Date(tx.createdAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-base font-bold text-[#1c1917]">{formatRupiah(tx.total)}</p>
                    <p className="text-xs text-[#a8a29e]">{PAYMENT_LABELS[tx.paymentMethod] || tx.paymentMethod} • {formatRupiah(tx.payment)}</p>
                  </div>
                  <svg className="w-4 h-4 text-[#a8a29e]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            </div>
          ))
        )}
      </div>

      {!loading && pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-[#e7e5e4] bg-white text-sm text-[#78716c] hover:bg-[#f5f5f4] disabled:opacity-40 transition-colors"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-[#78716c] px-2">
            Hal {page} dari {pages} • {total} transaksi
          </span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= pages}
            className="px-4 py-2 rounded-xl border border-[#e7e5e4] bg-white text-sm text-[#78716c] hover:bg-[#f5f5f4] disabled:opacity-40 transition-colors"
          >
            Berikutnya
          </button>
        </div>
      )}

      {selectedTx && <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  )
}

function DetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const now = new Date(tx.createdAt)
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  function handlePrint() {
    window.print()
  }

  return (
    <>
      <div className="receipt-print-area hidden print:block print:fixed print:inset-0 print:z-50 print:bg-white">
        <div className="w-[80mm] mx-auto bg-white p-4 font-mono text-xs leading-relaxed">
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
            <p className="text-sm font-bold tracking-tight text-[#1c1917]">WARUNG KASIR</p>
            <p className="text-[10px] text-gray-400">Jl. Contoh No. 123, Kota</p>
            <p className="text-[10px] text-gray-400">Telp: 0812-3456-7890</p>
          </div>
          <div className="text-[10px] text-gray-500 mb-3 flex justify-between">
            <span>No: #{tx.id.slice(-8).toUpperCase()}</span>
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
            {tx.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] text-[#44403c]">
                <span className="w-[38%] truncate">{item.name}</span>
                <span className="w-[16%] text-center">{item.qty}</span>
                <span className="w-[22%] text-right">{formatRupiah(item.price)}</span>
                <span className="w-[24%] text-right font-semibold">{formatRupiah(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 pt-2 space-y-1">
            <div className="flex justify-between text-[11px] text-[#44403c]"><span className="font-semibold">Subtotal</span><span>{formatRupiah(tx.total + tx.discount)}</span></div>
            {tx.discount > 0 && (
              <div className="flex justify-between text-[11px] text-[#44403c]"><span>Diskon</span><span>−{formatRupiah(tx.discount)}</span></div>
            )}
            <div className="flex justify-between text-[11px] text-[#44403c]"><span className="font-semibold">Total</span><span className="font-bold text-sm text-[#1c1917]">{formatRupiah(tx.total)}</span></div>
            <div className="flex justify-between text-[11px] text-[#44403c]"><span>{PAYMENT_LABELS[tx.paymentMethod] || "Tunai"}</span><span>{formatRupiah(tx.payment)}</span></div>
            <div className="flex justify-between text-[11px]"><span>Kembali</span><span className="font-semibold text-emerald-600">{formatRupiah(tx.change)}</span></div>
          </div>
          <div className="border-t-2 border-dashed border-gray-300 mt-3 pt-3 text-center text-[10px] text-gray-400">
            <p>Terima kasih telah berbelanja</p>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl border border-[#e7e5e4] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-[#e7e5e4]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f5f5f4] flex items-center justify-center text-sm">🧾</div>
              <div>
                <h2 className="text-sm font-semibold text-[#1c1917]">Detail Transaksi</h2>
                <p className="text-xs text-[#a8a29e]">#{tx.id.slice(-8).toUpperCase()}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f4] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="p-5">
            <div className="flex justify-between text-xs text-[#78716c] mb-4">
              <span>{dateStr}</span>
              <span>{timeStr}</span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7e5e4]">
                  <th className="text-left py-2.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Produk</th>
                  <th className="text-center py-2.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Qty</th>
                  <th className="text-right py-2.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Harga</th>
                  <th className="text-right py-2.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {tx.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#f5f5f4]">
                    <td className="py-2.5 text-sm font-medium text-[#44403c]">{item.name}</td>
                    <td className="py-2.5 text-center text-sm text-[#78716c]">{item.qty}</td>
                    <td className="py-2.5 text-right text-sm text-[#78716c]">{formatRupiah(item.price)}</td>
                    <td className="py-2.5 text-right text-sm font-semibold text-[#44403c]">{formatRupiah(item.price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-[#e7e5e4] mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[#78716c]">Subtotal</span><span className="text-[#44403c]">{formatRupiah(tx.total + tx.discount)}</span></div>
              {tx.discount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-[#78716c]">Diskon</span><span className="text-amber-600">−{formatRupiah(tx.discount)}</span></div>
              )}
              <div className="flex justify-between text-sm"><span className="text-[#78716c]">Total</span><span className="font-bold text-[#1c1917]">{formatRupiah(tx.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#78716c]">Metode</span><span className="font-medium text-[#44403c]">{PAYMENT_LABELS[tx.paymentMethod] || tx.paymentMethod}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#78716c]">Bayar</span><span className="font-medium text-[#44403c]">{formatRupiah(tx.payment)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#78716c]">Kembali</span><span className="font-semibold text-emerald-600">{formatRupiah(tx.change)}</span></div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Cetak Struk
              </button>
              <button onClick={onClose} className="flex-1 px-5 py-3 border border-[#e7e5e4] rounded-xl text-sm text-[#78716c] hover:bg-[#f5f5f4] transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
