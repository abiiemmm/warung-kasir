"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Transaction } from "@/lib/types"
import { formatRupiah } from "@/lib/utils"

function getMonthDays(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return { label: `${i + 1}`, full: d.toISOString().split("T")[0], day: i + 1 }
  })
}

export default function RevenueChart({ transactions }: { transactions: Transaction[] }) {
  const now = new Date()
  const monthDays = getMonthDays(now.getFullYear(), now.getMonth())

  const dailyRevenue: Record<string, number> = {}
  transactions.forEach((tx) => {
    const date = tx.createdAt.split("T")[0]
    dailyRevenue[date] = (dailyRevenue[date] || 0) + tx.total
  })

  const data = monthDays.map((d) => ({
    name: d.label,
    revenue: dailyRevenue[d.full] || 0,
  }))

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const totalMonth = data.reduce((s, d) => s + d.revenue, 0)

  return (
    <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold text-[#1c1917]">Pendapatan Bulan Ini</h2>
        </div>
        <span className="text-sm font-bold text-[#1c1917]">{formatRupiah(totalMonth)}</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efef" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} domain={[0, maxRevenue * 1.15]} />
            <Tooltip
              formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
              labelFormatter={(label) => `Tanggal ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            />
            <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
