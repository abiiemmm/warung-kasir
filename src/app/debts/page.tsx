"use client"

import { useState, useEffect, useCallback } from "react"
import { useStore } from "@/context/StoreContext"
import { formatRupiah } from "@/lib/utils"
import { getDebtPayments } from "@/lib/api"
import type { Debt, DebtPayment } from "@/lib/types"

const emptyForm = { customerName: "", description: "", amount: "" }

export default function DebtsPage() {
  const { debts, addDebt, updateDebtStatus, updateDebt, deleteDebt, payDebt } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<Debt | null>(null)

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

  const totalPending = pending.reduce((s, d) => s + d.remaining, 0)
  const totalPaid = paid.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">Piutang</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Geser kartu untuk ubah status, klik &quot;Bayar&quot; untuk mencatat pembayaran</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ink)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors"
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
          onPay={setPayTarget}
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
          onPay={setPayTarget}
          dragId={dragId}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={resetModal}>
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--line)] p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[var(--ink)] mb-5">{editing ? "Edit Piutang" : "Tambah Piutang"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Nama Pelanggan</label>
                <input
                  type="text"
                  placeholder="Cth: Bu Sari"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={form.customerName}
                  onChange={(e) => { setError(""); setForm({ ...form, customerName: e.target.value }) }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Deskripsi (opsional)</label>
                <input
                  type="text"
                  placeholder="Cth: Beras 5kg + Minyak"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Jumlah (Rp)</label>
                <input
                  type="number"
                  placeholder="50000"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={form.amount}
                  onChange={(e) => { setError(""); setForm({ ...form, amount: e.target.value }) }}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 px-5 py-2.5 bg-[var(--ink)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">
                  {editing ? "Simpan" : "Tambah"}
                </button>
                <button type="button" onClick={resetModal} className="px-5 py-2.5 border border-[var(--line)] rounded-md text-sm text-[var(--muted)] hover:bg-[var(--paper)] transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payTarget && (
        <PayModal debt={payTarget} onClose={() => setPayTarget(null)} onPay={payDebt} />
      )}
    </div>
  )
}

function PayModal({ debt, onClose, onPay }: { debt: Debt; onClose: () => void; onPay: (id: string, amount: number, note: string) => Promise<Debt | null> }) {
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [payments, setPayments] = useState<DebtPayment[]>([])
  const [error, setError] = useState("")

  const loadPayments = useCallback(async () => {
    const rows = await getDebtPayments(debt.id)
    setPayments(rows)
  }, [debt.id])

  useEffect(() => { loadPayments() }, [loadPayments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError("Jumlah pembayaran tidak valid"); return }
    if (amt > debt.remaining) { setError(`Maksimal sisa ${debt.remaining}`); return }
    const result = await onPay(debt.id, amt, note.trim())
    if (result) { onClose() } else { setError("Gagal menyimpan pembayaran") }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--line)] p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-[var(--ink)] mb-1">Bayar Piutang</h2>
        <p className="text-sm text-[var(--muted)] mb-5">{debt.customerName}</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[var(--paper)] rounded-md p-3">
            <p className="text-[11px] text-[var(--muted)]">Total Piutang</p>
            <p className="text-sm font-bold text-[var(--ink)]">{formatRupiah(debt.amount)}</p>
          </div>
          <div className="bg-red-50 rounded-md p-3">
            <p className="text-[11px] text-red-500">Sisa</p>
            <p className="text-sm font-bold text-red-600">{formatRupiah(debt.remaining)}</p>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-medium text-[var(--muted)] mb-2">Riwayat Pembayaran</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--green)]">{formatRupiah(p.amount)}</p>
                    {p.note && <p className="text-[11px] text-[var(--muted)]">{p.note}</p>}
                  </div>
                  <span className="text-[11px] text-[#858a7b]">
                    {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Jumlah Bayar (Rp)</label>
            <input
              type="number"
              placeholder="Ketik nominal"
              className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={amount}
              onChange={(e) => { setError(""); setAmount(e.target.value) }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Catatan (opsional)</label>
            <input
              type="text"
              placeholder="Cth: Bayar sebagian"
              className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 px-5 py-2.5 bg-[var(--green)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">
              Simpan Pembayaran
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[var(--line)] rounded-md text-sm text-[var(--muted)] hover:bg-[var(--paper)] transition-colors">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function KanbanColumn({
  title, count, total, color, debts, onDrop, onDragStart, onEdit, onDelete, onPay, dragId,
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
  onPay: (debt: Debt) => void
  dragId: string | null
}) {
  const [dragOver, setDragOver] = useState(false)
  const isRed = color === "red"
  const colorClass = isRed ? "bg-red-500" : "bg-emerald-500"
  const lightClass = isRed ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"

  return (
    <div
      className={`flex-1 min-w-[300px] bg-[#fafaf9] rounded-md border transition-all duration-200 ${
        dragOver ? "border-[var(--ink)] ring-2 ring-[var(--ink)]/10" : "border-[var(--line)]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop() }}
    >
      <div className="p-4 border-b border-[var(--line)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
            <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
            <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 rounded-md">{count}</span>
          </div>
          <span className="text-sm font-bold text-[var(--ink)]">{formatRupiah(total)}</span>
        </div>
      </div>

      <div className="p-3 space-y-3 min-h-[200px]">
        {debts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#858a7b]">Belum ada data</p>
          </div>
        ) : (
          debts.map((debt) => (
            <div
              key={debt.id}
              draggable
              onDragStart={() => onDragStart(debt)}
              onClick={() => onEdit(debt)}
              className={`bg-[var(--surface)] rounded-md border p-4 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:border-[#cdd2c2] ${
                dragId === debt.id ? "opacity-40 scale-[0.97]" : ""
              } ${!isRed ? "border-emerald-200" : "border-[var(--line)]"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${isRed ? "bg-red-50" : "bg-emerald-50"}`}>
                    👤
                  </div>
                  <span className="text-sm font-semibold text-[var(--ink)] truncate">{debt.customerName}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(debt.id) }}
                  className="text-[#cdd2c2] hover:text-red-400 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              {debt.description && (
                <p className="text-xs text-[var(--muted)] mb-2.5 ml-9">{debt.description}</p>
              )}

              <div className="flex items-center justify-between ml-9">
                <div>
                  <span className={`text-sm font-bold ${isRed ? "text-red-600" : "text-[var(--green)]"}`}>
                    {formatRupiah(debt.remaining)}
                  </span>
                  {debt.remaining !== debt.amount && (
                    <p className="text-[10px] text-[#858a7b]">dari {formatRupiah(debt.amount)}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#858a7b]">
                  {new Date(debt.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              </div>

              <div className="mt-2.5 ml-9 flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onPay(debt) }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[var(--ink)] text-white hover:bg-[var(--green-dark)] transition-colors`}
                >
                  💰 Bayar
                </button>
                {!isRed && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${lightClass}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Lunas
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
