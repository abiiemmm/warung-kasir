"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Transaction } from "@/lib/types"

function getMonthDays(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(year, month, i + 1)
    return { label: `${i + 1}`, full: d.toISOString().split("T")[0] }
  })
}

export default function TransactionsChart({ transactions }: { transactions: Transaction[] }) {
  const now = new Date()
  const monthDays = getMonthDays(now.getFullYear(), now.getMonth())

  const dailyCount: Record<string, number> = {}
  transactions.forEach((tx) => {
    const date = tx.createdAt.split("T")[0]
    dailyCount[date] = (dailyCount[date] || 0) + 1
  })

  const data = monthDays.map((d) => ({
    name: d.label,
    count: dailyCount[d.full] || 0,
  }))

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const totalMonth = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <h2 className="text-sm font-semibold text-[#1c1917]">Transaksi Bulan Ini</h2>
        </div>
        <span className="text-sm font-bold text-[#1c1917]">{totalMonth} transaksi</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efef" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, maxCount * 1.15]} />
            <Tooltip
              formatter={(value: any) => [Number(value), "Transaksi"]}
              labelFormatter={(label: any) => `Tanggal ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            />
            <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 2, fill: "#f97316" }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
