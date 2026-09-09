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
        <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">Riwayat Transaksi</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Lihat semua transaksi yang telah terjadi</p>
      </div>

      <div className="flex justify-end mb-6">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setFilter("all"); setFilterDate("") }} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${filter === "all" ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10" : "bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper)] hover:border-[#cdd2c2]"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
            Semua
          </button>
          <button onClick={() => { setFilter("today"); setFilterDate("") }} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${filter === "today" ? "bg-[var(--ink)] text-white shadow-lg shadow-black/10" : "bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper)] hover:border-[#cdd2c2]"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            Hari Ini
          </button>
          <div className="relative">
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border transition-all whitespace-nowrap ${filter === "date" ? "bg-[var(--ink)] text-white border-[var(--ink)] shadow-lg shadow-black/10" : "bg-[var(--surface)] border-[var(--line)] text-[var(--muted)]"}`}>
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
          <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-12 text-center">
            <p className="text-sm text-[#858a7b]">Memuat...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm text-[#858a7b]">Belum ada transaksi</p>
          </div>
        ) : (
          data.map((tx) => (
            <div key={tx.id} className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none overflow-hidden transition-all duration-200 hover:shadow-md">
              <button onClick={() => setSelectedTx(tx)} className="w-full flex items-center justify-between p-5 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-[var(--paper)] flex items-center justify-center text-sm">🧾</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#45533f] truncate">
                      {tx.items.length} item<span className="text-[#858a7b] font-normal"> — </span>
                      {tx.items.map((i) => i.name).slice(0, 2).join(", ")}
                      {tx.items.length > 2 && <span className="text-[#858a7b]"> +{tx.items.length - 2} lainnya</span>}
                    </p>
                    <p className="text-xs text-[#858a7b] mt-0.5">
                      {new Date(tx.createdAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-base font-bold text-[var(--ink)]">{formatRupiah(tx.total)}</p>
                    <p className="text-xs text-[#858a7b]">{PAYMENT_LABELS[tx.paymentMethod] || tx.paymentMethod} • {formatRupiah(tx.payment)}</p>
                  </div>
                  <svg className="w-4 h-4 text-[#858a7b]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
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
            className="px-4 py-2 rounded-md border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--muted)] hover:bg-[var(--paper)] disabled:opacity-40 transition-colors"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-[var(--muted)] px-2">
            Hal {page} dari {pages} • {total} transaksi
          </span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= pages}
            className="px-4 py-2 rounded-md border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--muted)] hover:bg-[var(--paper)] disabled:opacity-40 transition-colors"
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
      <div className="receipt-print-area hidden print:block print:fixed print:inset-0 print:z-50 print:bg-[var(--surface)]">
        <div className="w-[80mm] mx-auto bg-[var(--surface)] p-4 font-mono text-xs leading-relaxed">
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
            <p className="text-sm font-bold tracking-tight text-[var(--ink)]">WARUNG KASIR</p>
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
              <div key={idx} className="flex justify-between text-[11px] text-[#45533f]">
                <span className="w-[38%] truncate">{item.name}</span>
                <span className="w-[16%] text-center">{item.qty}</span>
                <span className="w-[22%] text-right">{formatRupiah(item.price)}</span>
                <span className="w-[24%] text-right font-semibold">{formatRupiah(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-dashed border-gray-300 pt-2 space-y-1">
            <div className="flex justify-between text-[11px] text-[#45533f]"><span className="font-semibold">Subtotal</span><span>{formatRupiah(tx.total + tx.discount)}</span></div>
            {tx.discount > 0 && (
              <div className="flex justify-between text-[11px] text-[#45533f]"><span>Diskon</span><span>−{formatRupiah(tx.discount)}</span></div>
            )}
            <div className="flex justify-between text-[11px] text-[#45533f]"><span className="font-semibold">Total</span><span className="font-bold text-sm text-[var(--ink)]">{formatRupiah(tx.total)}</span></div>
            <div className="flex justify-between text-[11px] text-[#45533f]"><span>{PAYMENT_LABELS[tx.paymentMethod] || "Tunai"}</span><span>{formatRupiah(tx.payment)}</span></div>
            <div className="flex justify-between text-[11px]"><span>Kembali</span><span className="font-semibold text-[var(--green)]">{formatRupiah(tx.change)}</span></div>
          </div>
          <div className="border-t-2 border-dashed border-gray-300 mt-3 pt-3 text-center text-[10px] text-gray-400">
            <p>Terima kasih telah berbelanja</p>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--line)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[var(--paper)] flex items-center justify-center text-sm">🧾</div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--ink)]">Detail Transaksi</h2>
                <p className="text-xs text-[#858a7b]">#{tx.id.slice(-8).toUpperCase()}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--paper)] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="p-5">
            <div className="flex justify-between text-xs text-[var(--muted)] mb-4">
              <span>{dateStr}</span>
              <span>{timeStr}</span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="text-left py-2.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Produk</th>
                  <th className="text-center py-2.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Qty</th>
                  <th className="text-right py-2.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Harga</th>
                  <th className="text-right py-2.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {tx.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[var(--paper)]">
                    <td className="py-2.5 text-sm font-medium text-[#45533f]">{item.name}</td>
                    <td className="py-2.5 text-center text-sm text-[var(--muted)]">{item.qty}</td>
                    <td className="py-2.5 text-right text-sm text-[var(--muted)]">{formatRupiah(item.price)}</td>
                    <td className="py-2.5 text-right text-sm font-semibold text-[#45533f]">{formatRupiah(item.price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-[var(--line)] mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Subtotal</span><span className="text-[#45533f]">{formatRupiah(tx.total + tx.discount)}</span></div>
              {tx.discount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Diskon</span><span className="text-amber-600">−{formatRupiah(tx.discount)}</span></div>
              )}
              <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Total</span><span className="font-bold text-[var(--ink)]">{formatRupiah(tx.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Metode</span><span className="font-medium text-[#45533f]">{PAYMENT_LABELS[tx.paymentMethod] || tx.paymentMethod}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Bayar</span><span className="font-medium text-[#45533f]">{formatRupiah(tx.payment)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Kembali</span><span className="font-semibold text-[var(--green)]">{formatRupiah(tx.change)}</span></div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[var(--ink)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Cetak Struk
              </button>
              <button onClick={onClose} className="flex-1 px-5 py-3 border border-[var(--line)] rounded-md text-sm text-[var(--muted)] hover:bg-[var(--paper)] transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
