"use client"

import { useState } from "react"
import { useStore } from "@/context/StoreContext"
import { formatRupiah } from "@/lib/utils"
import type { Debt } from "@/lib/types"

const emptyForm = { customerName: "", description: "", amount: "" }

export default function DebtsPage() {
  const { debts, addDebt, updateDebtStatus, updateDebt, deleteDebt } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)

  const pending = debts.filter((d) => d.status === "pending")
  const paid = debts.filter((d) => d.status === "paid")

  function resetModal() {
    setForm(emptyForm); setEditing(null); setError(""); setShowModal(false)
  }

  function openEdit(debt: Debt) {
    setEditing(debt)
    setForm({ customerName: debt.customerName, description: debt.description, amount: String(debt.amount) })
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.customerName.trim()
    const desc = form.description.trim()
    const amount = Number(form.amount)
    if (!name || !amount || amount <= 0) { setError("Nama dan jumlah harus diisi dengan benar"); return }
    if (editing) {
      updateDebt(editing.id, { customerName: name, description: desc, amount })
    } else {
      addDebt({ customerName: name, description: desc, amount, status: "pending" })
    }
    resetModal()
  }

  function handleDragStart(debt: Debt) {
    setDragId(debt.id)
  }

  function handleDrop(targetStatus: "pending" | "paid") {
    if (!dragId) return
    updateDebtStatus(dragId, targetStatus)
    setDragId(null)
  }

  function handleDelete(id: string) {
    if (confirm("Yakin hapus piutang ini?")) deleteDebt(id)
  }

  const totalPending = pending.reduce((s, d) => s + d.amount, 0)
  const totalPaid = paid.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Piutang</h1>
          <p className="text-sm text-[#78716c] mt-1">Geser kartu untuk mengubah status pembayaran</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Tambah Piutang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KanbanColumn
          title="Belum Dibayar"
          count={pending.length}
          total={totalPending}
          color="red"
          debts={pending}
          onDrop={() => handleDrop("pending")}
          onDragStart={handleDragStart}
          onEdit={openEdit}
          onDelete={handleDelete}
          dragId={dragId}
        />
        <KanbanColumn
          title="Lunas"
          count={paid.length}
          total={totalPaid}
          color="emerald"
          debts={paid}
          onDrop={() => handleDrop("paid")}
          onDragStart={handleDragStart}
          onEdit={openEdit}
          onDelete={handleDelete}
          dragId={dragId}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={resetModal}>
          <div className="bg-white rounded-2xl shadow-xl border border-[#e7e5e4] p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[#1c1917] mb-5">{editing ? "Edit Piutang" : "Tambah Piutang"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Nama Pelanggan</label>
                <input
                  type="text"
                  placeholder="Cth: Bu Sari"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={form.customerName}
                  onChange={(e) => { setError(""); setForm({ ...form, customerName: e.target.value }) }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Deskripsi (opsional)</label>
                <input
                  type="text"
                  placeholder="Cth: Beras 5kg + Minyak"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Jumlah (Rp)</label>
                <input
                  type="number"
                  placeholder="50000"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={form.amount}
                  onChange={(e) => { setError(""); setForm({ ...form, amount: e.target.value }) }}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 px-5 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] transition-colors">
                  {editing ? "Simpan" : "Tambah"}
                </button>
                <button type="button" onClick={resetModal} className="px-5 py-2.5 border border-[#e7e5e4] rounded-xl text-sm text-[#78716c] hover:bg-[#f5f5f4] transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function KanbanColumn({
  title, count, total, color, debts, onDrop, onDragStart, onEdit, onDelete, dragId,
}: {
  title: string
  count: number
  total: number
  color: "red" | "emerald"
  debts: Debt[]
  onDrop: () => void
  onDragStart: (debt: Debt) => void
  onEdit: (debt: Debt) => void
  onDelete: (id: string) => void
  dragId: string | null
}) {
  const [dragOver, setDragOver] = useState(false)
  const isRed = color === "red"
  const colorClass = isRed ? "bg-red-500" : "bg-emerald-500"
  const lightClass = isRed ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"

  return (
    <div
      className={`flex-1 min-w-[300px] bg-[#fafaf9] rounded-xl border transition-all duration-200 ${
        dragOver ? "border-[#1c1917] ring-2 ring-[#1c1917]/10" : "border-[#e7e5e4]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop() }}
    >
      <div className="p-4 border-b border-[#e7e5e4]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
            <h3 className="text-sm font-semibold text-[#1c1917]">{title}</h3>
            <span className="text-xs font-medium text-[#78716c] bg-white border border-[#e7e5e4] px-2 py-0.5 rounded-md">{count}</span>
          </div>
          <span className="text-sm font-bold text-[#1c1917]">{formatRupiah(total)}</span>
        </div>
      </div>

      <div className="p-3 space-y-3 min-h-[200px]">
        {debts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#a8a29e]">Belum ada data</p>
          </div>
        ) : (
          debts.map((debt) => (
            <div
              key={debt.id}
              draggable
              onDragStart={() => onDragStart(debt)}
              onClick={() => onEdit(debt)}
              className={`bg-white rounded-xl border p-4 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:border-[#d6d3d1] ${
                dragId === debt.id ? "opacity-40 scale-[0.97]" : ""
              } ${!isRed ? "border-emerald-200" : "border-[#e7e5e4]"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${isRed ? "bg-red-50" : "bg-emerald-50"}`}>
                    👤
                  </div>
                  <span className="text-sm font-semibold text-[#1c1917] truncate">{debt.customerName}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(debt.id) }}
                  className="text-[#d6d3d1] hover:text-red-400 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              {debt.description && (
                <p className="text-xs text-[#78716c] mb-2.5 ml-9">{debt.description}</p>
              )}

              <div className="flex items-center justify-between ml-9">
                <span className={`text-sm font-bold ${isRed ? "text-red-600" : "text-emerald-600"}`}>
                  {formatRupiah(debt.amount)}
                </span>
                <span className="text-[10px] text-[#a8a29e]">
                  {new Date(debt.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              </div>

              {!isRed && (
                <div className={`mt-2.5 ml-9 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${lightClass}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Lunas
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
