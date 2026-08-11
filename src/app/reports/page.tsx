"use client"

import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { formatRupiah, today, toLocalDateString } from "@/lib/utils"
import { getReportSummary, getReportByProduct, getReportByCategory } from "@/lib/api"
import { exportCsv, exportPdf, exportDocx } from "@/lib/export"
import type { ReportSummary, ProductReportRow, CategoryReportRow } from "@/lib/types"

function defaultRange(): { from: string; to: string } {
  const to = today()
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return { from: toLocalDateString(d), to }
}

export default function ReportsPage() {
  const [{ from, to }, setRange] = useState(defaultRange())
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [byProduct, setByProduct] = useState<ProductReportRow[]>([])
  const [byCategory, setByCategory] = useState<CategoryReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<"csv" | "pdf" | "docx" | null>(null)

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true)
    const [s, p, c] = await Promise.all([
      getReportSummary(f, t),
      getReportByProduct(f, t),
      getReportByCategory(f, t),
    ])
    setSummary(s)
    setByProduct(p.data)
    setByCategory(c.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load(from, to)
  }, [from, to, load])

  function handleExport(kind: "csv" | "pdf" | "docx") {
    if (!summary || exporting) return
    const data = { from, to, summary, byProduct, byCategory }
    setExporting(kind)
    try {
      if (kind === "csv") exportCsv(data)
      else if (kind === "pdf") exportPdf(data)
      else void exportDocx(data)
    } finally {
      setExporting(null)
    }
  }

  const dailyChart = (summary?.daily || []).map((d) => ({ name: d.date.slice(5), pendapatan: d.revenue }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Laporan</h1>
          <p className="text-sm text-[#78716c] mt-1">Rekap penjualan berdasarkan rentang tanggal</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
              className="px-3 py-2.5 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 transition-all"
            />
            <span className="text-xs text-[#a8a29e]">s/d</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
              className="px-3 py-2.5 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("pdf")}
              disabled={!summary || exporting !== null}
              className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {exporting === "pdf" ? "Menyiapkan..." : "⬇ PDF"}
            </button>
            <button
              onClick={() => handleExport("docx")}
              disabled={!summary || exporting !== null}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {exporting === "docx" ? "Menyiapkan..." : "⬇ Word"}
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={!summary || exporting !== null}
              className="px-4 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] disabled:opacity-50 transition-colors"
            >
              ⬇ CSV
            </button>
          </div>
        </div>
      </div>

      {loading || !summary ? (
        <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-12 text-center">
          <p className="text-sm text-[#a8a29e]">Memuat laporan...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Pendapatan", value: formatRupiah(summary.totalRevenue), icon: "💰", highlight: true },
              { label: "Transaksi", value: String(summary.count), icon: "🧾" },
              { label: "Item Terjual", value: String(summary.itemCount), icon: "📦" },
              { label: "Rata-rata / Transaksi", value: formatRupiah(summary.avgPerTx), icon: "📊" },
            ].map((s) => (
              <div key={s.label} className={`bg-white rounded-xl border shadow-sm p-5 ${s.highlight ? "border-emerald-100" : "border-[#e7e5e4]"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg">{s.icon}</span>
                  {s.highlight && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{summary.count} tx</span>}
                </div>
                <p className="text-xl font-semibold text-[#1c1917] tracking-tight">{s.value}</p>
                <p className="text-xs text-[#78716c] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {summary.totalDiscount > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6">
              Total diskon diberikan: −{formatRupiah(summary.totalDiscount)}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-[#1c1917]">Pendapatan Harian</h2>
              </div>
              {dailyChart.length === 0 ? (
                <p className="text-sm text-[#a8a29e] py-10 text-center">Belum ada data</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChart} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0efef" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                      <YAxis tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
                        labelFormatter={(label) => `Tanggal ${label}`}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      />
                      <Bar dataKey="pendapatan" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <h2 className="text-sm font-semibold text-[#1c1917]">Pembagian Metode Bayar</h2>
              </div>
              {Object.keys(summary.byMethod).length === 0 ? (
                <p className="text-sm text-[#a8a29e] py-10 text-center">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary.byMethod).map(([method, revenue]) => {
                    const pct = summary.totalRevenue ? Math.round((revenue / summary.totalRevenue) * 100) : 0
                    const labels: Record<string, string> = { cash: "Tunai", qris: "QRIS", transfer: "Transfer" }
                    const colors: Record<string, string> = { cash: "bg-emerald-500", qris: "bg-blue-500", transfer: "bg-amber-500" }
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[#44403c]">{labels[method] || method}</span>
                          <span className="text-[#78716c]">{formatRupiah(revenue)} <span className="text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-[#f5f5f4] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colors[method] || "bg-stone-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e7e5e4]">
                <h2 className="text-sm font-semibold text-[#1c1917]">Per Kategori</h2>
              </div>
              {byCategory.length === 0 ? (
                <p className="text-sm text-[#a8a29e] p-8 text-center">Belum ada data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f5f5f4]">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Kategori</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Qty</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.map((c) => (
                      <tr key={c.categoryId} className="border-b border-[#f5f5f4] last:border-0">
                        <td className="px-6 py-3 font-medium text-[#44403c]">{c.name}</td>
                        <td className="px-6 py-3 text-right text-[#78716c]">{c.qty}</td>
                        <td className="px-6 py-3 text-right font-semibold text-[#1c1917]">{formatRupiah(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e7e5e4]">
                <h2 className="text-sm font-semibold text-[#1c1917]">Produk Terlaris</h2>
              </div>
              {byProduct.length === 0 ? (
                <p className="text-sm text-[#a8a29e] p-8 text-center">Belum ada data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f5f5f4]">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Produk</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Qty</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProduct.map((p) => (
                      <tr key={p.productId} className="border-b border-[#f5f5f4] last:border-0">
                        <td className="px-6 py-3 font-medium text-[#44403c] truncate max-w-[200px]">{p.name}</td>
                        <td className="px-6 py-3 text-right text-[#78716c]">{p.qty}</td>
                        <td className="px-6 py-3 text-right font-semibold text-[#1c1917]">{formatRupiah(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
