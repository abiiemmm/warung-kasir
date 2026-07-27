"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/context/StoreContext"
import { formatRupiah } from "@/lib/utils"
import type { StockReminder } from "@/lib/types"

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

const emptyForm = { title: "", notes: "", productId: "" }

export default function CalendarPage() {
  const { reminders, products, addReminder, updateReminder, deleteReminder } = useStore()
  const [today] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StockReminder | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")

  const remindersByDate = useMemo(() => {
    const map: Record<string, StockReminder[]> = {}
    reminders.forEach((r) => {
      if (!map[r.date]) map[r.date] = []
      map[r.date].push(r)
    })
    return map
  }, [reminders])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [viewMonth, viewYear])

  function dateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  function isToday(day: number) {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
  }

  function openAdd(dateStr: string) {
    setSelectedDate(dateStr)
    setEditing(null)
    setForm(emptyForm)
    setError("")
    setShowModal(true)
  }

  function openEdit(reminder: StockReminder) {
    setEditing(reminder)
    setSelectedDate(reminder.date)
    setForm({ title: reminder.title, notes: reminder.notes, productId: reminder.productId || "" })
    setError("")
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title || !selectedDate) { setError("Judul harus diisi"); return }
    if (editing) {
      updateReminder(editing.id, { date: selectedDate, title, notes: form.notes.trim(), productId: form.productId || undefined })
    } else {
      addReminder({ date: selectedDate, title, notes: form.notes.trim(), productId: form.productId || undefined })
    }
    setShowModal(false)
  }

  function handleDelete(id: string) {
    if (confirm("Yakin hapus pengingat ini?")) deleteReminder(id)
  }

  const selectedReminders = selectedDate ? remindersByDate[selectedDate] || [] : []

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Kalender Stok</h1>
        <p className="text-sm text-[#78716c] mt-1">Atur jadwal restok barang</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e5e4]">
              <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1) }} className="p-2 rounded-lg hover:bg-[#f5f5f4] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="text-base font-semibold text-[#1c1917]">{MONTHS[viewMonth]} {viewYear}</h2>
              <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1) }} className="p-2 rounded-lg hover:bg-[#f5f5f4] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="grid grid-cols-7 min-w-[490px] sm:min-w-0">
              {DAYS.map((d) => (
                <div key={d} className="px-1 sm:px-2 py-2.5 text-center text-xs font-semibold text-[#78716c] uppercase tracking-wider border-b border-[#f5f5f4]">
                  {d}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="min-h-[60px] sm:min-h-[90px] bg-[#fafaf9]" />
                const key = dateKey(viewYear, viewMonth, day)
                const dayReminders = remindersByDate[key] || []
                return (
                  <button
                    key={key}
                    onClick={() => openAdd(key)}
                    className={`min-h-[60px] sm:min-h-[90px] p-1 sm:p-2 border-b border-r border-[#f5f5f4] text-left transition-colors hover:bg-[#fafaf9] relative ${
                      selectedDate === key ? "bg-[#f5f5f4]" : ""
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-medium ${
                      isToday(day) ? "bg-[#1c1917] text-white" : "text-[#44403c]"
                    }`}>
                      {day}
                    </span>
                    <div className="mt-0.5 sm:mt-1 space-y-0.5 hidden sm:block">
                      {dayReminders.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(r) }}
                          className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate bg-amber-50 text-amber-700 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                        >
                          {r.title}
                        </div>
                      ))}
                      {dayReminders.length > 3 && (
                        <div className="text-[10px] text-[#a8a29e] px-1">+{dayReminders.length - 3} lainnya</div>
                      )}
                    </div>
                    {dayReminders.length > 0 && (
                      <div className="sm:hidden flex justify-center mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-5 sticky top-8">
            <h2 className="text-sm font-semibold text-[#1c1917] mb-1">
              {selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Pilih Tanggal"}
            </h2>
            <p className="text-xs text-[#a8a29e] mb-4">
              {selectedDate ? `${selectedReminders.length} pengingat` : "Klik tanggal untuk menambah"}
            </p>

            {selectedDate && selectedReminders.length === 0 && (
              <p className="text-sm text-[#78716c] py-4 text-center">Belum ada pengingat</p>
            )}

            <div className="space-y-2 mb-4">
              {selectedReminders.map((r) => (
                <div key={r.id} className="bg-[#fafaf9] rounded-lg border border-[#e7e5e4] p-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-[#1c1917] truncate">{r.title}</span>
                      </div>
                      {r.notes && <p className="text-xs text-[#78716c] mt-1 ml-3">{r.notes}</p>}
                      {r.productId && (() => {
                        const prod = products.find((p) => p.id === r.productId)
                        return prod ? <p className="text-xs text-[#a8a29e] mt-0.5 ml-3">📦 {prod.name}</p> : null
                      })()}
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="text-[#d6d3d1] hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {selectedDate && (
              <button
                onClick={() => openAdd(selectedDate)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#d6d3d1] rounded-xl text-sm text-[#78716c] hover:text-[#1c1917] hover:border-[#1c1917] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Tambah Pengingat
              </button>
            )}

            <div className="border-t border-[#e7e5e4] mt-5 pt-4">
              <h3 className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-3">Bulan Ini</h3>
              {reminders.filter((r) => r.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)).length === 0 ? (
                <p className="text-xs text-[#a8a29e]">Tidak ada jadwal</p>
              ) : (
                <div className="space-y-1.5">
                  {reminders
                    .filter((r) => r.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`))
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="text-[#a8a29e] w-6 shrink-0">{new Date(r.date + "T00:00:00").getDate()}</span>
                        <button onClick={() => openEdit(r)} className="text-[#44403c] hover:text-[#1c1917] truncate text-left">{r.title}</button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-[#e7e5e4] p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-sm">📅</div>
              <div>
                <h2 className="text-lg font-semibold text-[#1c1917]">{editing ? "Edit Pengingat" : "Tambah Pengingat"}</h2>
                <p className="text-xs text-[#78716c]">{selectedDate && new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Judul Pengingat</label>
                <input
                  type="text"
                  placeholder="Cth: Restok Indomie"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={form.title}
                  onChange={(e) => { setError(""); setForm({ ...form, title: e.target.value }) }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Produk Terkait (opsional)</label>
                <select
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="">Tidak ada</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({formatRupiah(p.price)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Catatan (opsional)</label>
                <textarea
                  placeholder="Cth: Ambil 1 dus @ 40 pcs"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 px-5 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] transition-colors">
                  {editing ? "Simpan" : "Tambah"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-[#e7e5e4] rounded-xl text-sm text-[#78716c] hover:bg-[#f5f5f4] transition-colors">
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
