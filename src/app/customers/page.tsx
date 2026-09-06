"use client"

import Link from "next/link"
import { useStore } from "@/context/StoreContext"
import { formatRupiah } from "@/lib/utils"
import type { Debt } from "@/lib/types"

export default function CustomersPage() {
  const { debts } = useStore()

  const byName = new Map<string, { name: string; total: number; remaining: number; count: number; pending: number }>()
  for (const d of debts as Debt[]) {
    const cur = byName.get(d.customerName) || { name: d.customerName, total: 0, remaining: 0, count: 0, pending: 0 }
    cur.total += d.amount
    cur.remaining += d.remaining
    cur.count += 1
    if (d.status === "pending") cur.pending += 1
    byName.set(d.customerName, cur)
  }

  const rows = Array.from(byName.values()).sort((a, b) => b.remaining - a.remaining)
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">Pelanggan</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Rekap piutang per pelanggan — total tagihan dan sisa</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-5">
          <p className="text-lg">👥</p>
          <p className="text-xl font-semibold text-[var(--ink)] mt-2">{rows.length}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">Pelanggan tercatat</p>
        </div>
        <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-5">
          <p className="text-lg">📝</p>
          <p className="text-xl font-semibold text-red-600 mt-2">{formatRupiah(totalRemaining)}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">Total piutang berjalan</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-12 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-sm text-[#858a7b]">Belum ada pelanggan</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--paper)]">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Nama</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Tagihan Aktif</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Total Riwayat</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Sisa</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--paper)] hover:bg-[#fafaf9] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--paper)] flex items-center justify-center text-sm">👤</div>
                        <div>
                          <p className="font-medium text-[#45533f]">{r.name}</p>
                          <p className="text-[11px] text-[#858a7b]">{r.count} tagihan{r.pending > 0 && <span className="text-amber-500"> • {r.pending} aktif</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--muted)]">{r.pending}</td>
                    <td className="px-6 py-4 text-right font-medium text-[#45533f]">{formatRupiah(r.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${r.remaining > 0 ? "text-red-600" : "text-[var(--green)]"}`}>
                        {formatRupiah(r.remaining)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href="/debts" className="text-xs px-3 py-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)] transition-colors font-medium">
                        Lihat Piutang
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
