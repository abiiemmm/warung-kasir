"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Transaction } from "@/lib/types"
import { formatRupiah } from "@/lib/utils"

export default function TopProductsChart({ transactions }: { transactions: Transaction[] }) {
  const productSales: Record<string, { qty: number; revenue: number }> = {}
  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 }
      productSales[item.name].qty += item.qty
      productSales[item.name].revenue += item.price * item.qty
    })
  })

  const data = Object.entries(productSales)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)

  const maxQty = Math.max(...data.map((d) => d.qty), 1)

  if (data.length === 0) {
    return (
      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#8b9c70]" />
          <h2 className="text-sm font-semibold text-[var(--ink)]">Produk Terlaris</h2>
        </div>
        <p className="text-sm text-[var(--muted)] py-10 text-center">Belum ada data penjualan</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#8b9c70]" />
        <h2 className="text-sm font-semibold text-[var(--ink)]">Produk Terlaris</h2>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: -4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ebdf" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#858a7b" }} axisLine={false} tickLine={false} domain={[0, maxQty * 1.2]} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#45533f" }} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              formatter={(value, name) => { const v = Number(value); return [name === "qty" ? `${v} terjual` : formatRupiah(v), name === "qty" ? "Jumlah" : "Pendapatan"] }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            />
            <Bar dataKey="qty" fill="#8b9c70" radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
