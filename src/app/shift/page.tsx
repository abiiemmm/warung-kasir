"use client"

import { useCallback, useEffect, useState } from "react"
import { getCurrentShift, getShifts, openShift, closeShift, getShiftDetail } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { formatRupiah } from "@/lib/utils"
import type { Shift, ShiftDetail } from "@/lib/types"

function formatDateTime(iso?: string) {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

/** Selisih laci: minus = uang kurang, plus = uang lebih. */
function DifferenceBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600">Pas</span>
  }
  const kurang = value < 0
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium ${kurang ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
      {kurang ? "Kurang" : "Lebih"} {formatRupiah(Math.abs(value))}
    </span>
  )
}

export default function ShiftPage() {
  const { isOwner } = useAuth()
  const [current, setCurrent] = useState<Shift | null>(null)
  const [detail, setDetail] = useState<ShiftDetail | null>(null)
  const [history, setHistory] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [openingCash, setOpeningCash] = useState("")
  const [closingCash, setClosingCash] = useState("")
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      const [cur, list] = await Promise.all([getCurrentShift(), getShifts()])
      setCurrent(cur)
      setHistory(list.filter((s) => s.closedAt))
      setDetail(cur ? await getShiftDetail(cur.id) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data shift")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    try {
      await openShift(Number(openingCash) || 0)
      setOpeningCash("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka shift")
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const counted = Number(closingCash)
    const expected = detail?.expectedCash ?? current?.openingCash ?? 0
    const selisih = counted - expected
    if (selisih !== 0) {
      const konfirmasi = confirm(
        `Uang laci ${formatRupiah(counted)}, seharusnya ${formatRupiah(expected)}.\n` +
        `Selisih ${selisih < 0 ? "KURANG" : "LEBIH"} ${formatRupiah(Math.abs(selisih))}.\n\nTetap tutup shift?`
      )
      if (!konfirmasi) return
    }
    try {
      await closeShift(counted, note)
      setClosingCash(""); setNote("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menutup shift")
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"

  if (loading) {
    return <div className="p-8 text-sm text-[#78716c]">Memuat…</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Shift Kasir</h1>
        <p className="text-sm text-[#78716c] mt-1">Buka laci dengan modal awal, tutup dengan hitung uang fisik</p>
      </div>

      {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-700">{error}</div>}

      {!current ? (
        <form onSubmit={handleOpen} className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg mb-4">🔓</div>
          <h2 className="text-sm font-semibold text-[#1c1917] mb-1">Buka Shift</h2>
          <p className="text-xs text-[#78716c] mb-4">Masukkan jumlah uang tunai yang ada di laci saat mulai berjualan.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="number" placeholder="Modal awal laci (Rp)" className={inputClass}
              value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
            <button type="submit" disabled={openingCash === ""}
              className="px-6 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] disabled:opacity-40 transition-colors whitespace-nowrap">
              Buka Shift
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Sedang berjalan
                </span>
                <h2 className="text-sm font-semibold text-[#1c1917]">Shift {current.userName}</h2>
                <p className="text-xs text-[#78716c] mt-0.5">Dibuka {formatDateTime(current.openedAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wider">Modal Awal</p>
                <p className="text-base font-semibold text-[#1c1917] mt-1">{formatRupiah(current.openingCash)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wider">Transaksi</p>
                <p className="text-base font-semibold text-[#1c1917] mt-1">{detail?.transactionCount ?? 0}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wider">Omzet</p>
                <p className="text-base font-semibold text-[#1c1917] mt-1">{formatRupiah(detail?.revenue ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wider">Laci Seharusnya</p>
                <p className="text-base font-semibold text-emerald-600 mt-1">{formatRupiah(detail?.expectedCash ?? current.openingCash)}</p>
              </div>
            </div>

            {detail && Object.keys(detail.byMethod).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[#f5f5f4]">
                {Object.entries(detail.byMethod).map(([method, v]) => (
                  <span key={method} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f5f5f4] text-xs text-[#57534e]">
                    <span className="font-medium capitalize">{method}</span>
                    <span className="text-[#a8a29e]">·</span>
                    {v.count}× {formatRupiah(v.revenue)}
                  </span>
                ))}
                {detail.voidedCount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-xs text-red-600 font-medium">
                    {detail.voidedCount} transaksi dibatalkan
                  </span>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleClose} className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg mb-4">🔒</div>
            <h2 className="text-sm font-semibold text-[#1c1917] mb-1">Tutup Shift</h2>
            <p className="text-xs text-[#78716c] mb-4">
              Hitung uang fisik di laci, lalu masukkan jumlahnya. Selisih terhadap{" "}
              <span className="font-medium text-[#44403c]">{formatRupiah(detail?.expectedCash ?? current.openingCash)}</span> akan dicatat.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="number" placeholder="Uang fisik di laci (Rp)" className={inputClass}
                value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
              <input type="text" placeholder="Catatan (opsional)" className={`${inputClass} sm:col-span-2`}
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {closingCash !== "" && (
              <p className="text-xs mt-3">
                Selisih:{" "}
                <DifferenceBadge value={Number(closingCash) - (detail?.expectedCash ?? current.openingCash)} />
              </p>
            )}
            <button type="submit" disabled={closingCash === ""}
              className="w-full sm:w-auto mt-4 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 disabled:opacity-40 transition-colors">
              Tutup Shift
            </button>
          </form>
        </>
      )}

      <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f5f5f4]">
          <h2 className="text-sm font-semibold text-[#1c1917]">Riwayat Shift</h2>
          <p className="text-xs text-[#78716c] mt-0.5">{isOwner ? "Semua kasir" : "Shift Anda"}</p>
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-sm text-[#78716c] text-center">Belum ada shift yang ditutup</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f5f5f4]">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Kasir</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Ditutup</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Seharusnya</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Dihitung</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors">
                    <td className="px-6 py-3.5 font-medium text-[#44403c]">{s.userName}</td>
                    <td className="px-6 py-3.5 text-[#78716c] text-xs">{formatDateTime(s.closedAt)}</td>
                    <td className="px-6 py-3.5 text-right text-[#44403c]">{formatRupiah(s.expectedCash ?? 0)}</td>
                    <td className="px-6 py-3.5 text-right text-[#44403c]">{formatRupiah(s.closingCash ?? 0)}</td>
                    <td className="px-6 py-3.5 text-right"><DifferenceBadge value={s.difference ?? 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
