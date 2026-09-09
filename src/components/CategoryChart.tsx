"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Transaction, Category, Product } from "@/lib/types"
import { formatRupiah } from "@/lib/utils"

const COLORS = ["#567450", "#8b9c70", "#c7a465", "#ba7859", "#7a8876", "#baa184", "#4b776a", "#b38a50"]

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
      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#7a8876]" />
          <h2 className="text-sm font-semibold text-[var(--ink)]">Penjualan per Kategori</h2>
        </div>
        <p className="text-sm text-[var(--muted)] py-10 text-center">Belum ada data penjualan</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#7a8876]" />
        <h2 className="text-sm font-semibold text-[var(--ink)]">Penjualan per Kategori</h2>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-28 flex-1 space-y-1.5">
          {data.map((d, idx) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="text-[var(--muted)] flex-1 truncate">{d.name}</span>
              <span className="font-medium text-[#45533f]">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
