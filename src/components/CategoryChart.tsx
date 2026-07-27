"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Transaction, Category, Product } from "@/lib/types"
import { formatRupiah } from "@/lib/utils"

const COLORS = ["#059669", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export default function CategoryChart({ transactions, products, categories }: { transactions: Transaction[]; products: Product[]; categories: Category[] }) {
  const categoryRevenue: Record<string, number> = {}

  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      const catName = product ? categories.find((c) => c.id === product.categoryId)?.name || "Lainnya" : "Lainnya"
      categoryRevenue[catName] = (categoryRevenue[catName] || 0) + item.price * item.qty
    })
  })

  const data = Object.entries(categoryRevenue)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <h2 className="text-sm font-semibold text-[#1c1917]">Penjualan per Kategori</h2>
        </div>
        <p className="text-sm text-[#78716c] py-10 text-center">Belum ada data penjualan</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        <h2 className="text-sm font-semibold text-[#1c1917]">Penjualan per Kategori</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7e5e4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((d, idx) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="text-[#78716c] flex-1 truncate">{d.name}</span>
              <span className="font-medium text-[#44403c]">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
