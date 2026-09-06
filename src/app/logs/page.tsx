"use client"

import { useState, useEffect, useCallback } from "react"
import { getLogsPaginated } from "@/lib/api"
import type { LogEntry } from "@/lib/types"

const actionColors: Record<string, string> = {
  created: "bg-emerald-50 text-[var(--green)] border-emerald-200",
  updated: "bg-blue-50 text-blue-600 border-blue-200",
  deleted: "bg-red-50 text-red-600 border-red-200",
  checkout: "bg-violet-50 text-violet-600 border-violet-200",
  paid: "bg-amber-50 text-amber-600 border-amber-200",
}

const actionLabels: Record<string, string> = {
  created: "Dibuat",
  updated: "Diubah",
  deleted: "Dihapus",
  checkout: "Transaksi",
  paid: "Lunas",
}

const entityLabels: Record<string, string> = {
  product: "Produk",
  category: "Kategori",
  transaction: "Transaksi",
  debt: "Piutang",
  reminder: "Pengingat",
}

const PAGE_SIZE = 50

export default function LogsPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  const [page, setPage] = useState(1)
  const [data, setData] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (p: number, entity: string, action: string, q: string) => {
    setLoading(true)
    const res = await getLogsPaginated(p, PAGE_SIZE, { entity, action, q })
    setData(res.data)
    setTotal(res.total)
    setPages(res.pages)
    setPage(res.page)
    setLoading(false)
  }, [])

  useEffect(() => {
    load(1, entityFilter, actionFilter, debouncedSearch)
  }, [debouncedSearch, entityFilter, actionFilter, load])

  function goPage(p: number) {
    if (p < 1 || p > pages || p === page) return
    load(p, entityFilter, actionFilter, debouncedSearch)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">Log Aktivitas</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Riwayat semua perubahan yang terjadi di sistem</p>
      </div>

      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858a7b]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Cari log..."
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">Semua Entitas</option>
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Semua Aksi</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm text-[var(--muted)] text-center">Memuat...</p>
        ) : data.length === 0 ? (
          <p className="p-8 text-sm text-[var(--muted)] text-center">
            {total === 0 ? "Belum ada log aktivitas" : "Tidak ada log yang cocok"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--paper)]">
                  <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Waktu</th>
                  <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Aksi</th>
                  <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Entitas</th>
                  <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.map((log) => (
                  <tr key={log.id} onClick={() => setSelectedLog(log)} className="border-b border-[var(--paper)] hover:bg-[#fafaf9] transition-colors cursor-pointer">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[#45533f] font-medium text-xs">
                          {new Date(log.timestamp).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[#858a7b] text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${actionColors[log.action] || "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[#45533f] font-medium text-xs">{entityLabels[log.entity] || log.entity}</span>
                        <span className="text-[#858a7b] text-[11px] truncate max-w-[120px] sm:max-w-[140px]">{log.entityName}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-[var(--muted)] text-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            Hal {page} dari {pages} • {total} log
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

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--line)] w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${actionColors[selectedLog.action] || "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"}`}>
                  {actionLabels[selectedLog.action] || selectedLog.action}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]">
                  {entityLabels[selectedLog.entity] || selectedLog.entity}
                </span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg hover:bg-[var(--paper)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Waktu</label>
                <p className="text-sm text-[var(--ink)]">
                  {new Date(selectedLog.timestamp).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Nama Entitas</label>
                <p className="text-sm text-[var(--ink)] font-medium">{selectedLog.entityName}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Detail</label>
                <p className="text-sm text-[var(--ink)] leading-relaxed">{selectedLog.details}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">ID Log</label>
                <p className="text-xs text-[#858a7b] font-mono">{selectedLog.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
