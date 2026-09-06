"use client"

import { useState } from "react"
import { useStore } from "@/context/StoreContext"

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore()
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError("Nama kategori harus diisi"); return }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) { setError("Kategori sudah ada"); return }
    addCategory(trimmed)
    setName("")
    setError("")
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const trimmed = editing.name.trim()
    if (!trimmed) { setError("Nama kategori harus diisi"); return }
    updateCategory(editing.id, trimmed)
    setEditing(null)
    setError("")
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin hapus kategori ini?")) return
    const ok = await deleteCategory(id)
    if (!ok) setError("Kategori masih dipakai oleh produk sehingga tidak bisa dihapus.")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">Kategori</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Kelola kategori produk</p>
      </div>

      <form onSubmit={editing ? handleUpdate : handleSubmit} className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-6 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={editing ? "Ubah nama kategori..." : "Nama kategori baru..."}
              className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
              value={editing ? editing.name : name}
              onChange={(e) => {
                setError("")
                if (editing) setEditing({ ...editing, name: e.target.value })
                else setName(e.target.value)
              }}
            />
            {error && <p className="text-xs text-red-500 mt-1.5 ml-1">{error}</p>}
          </div>
          <button type="submit" className="px-5 py-2.5 bg-[var(--ink)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-dark)] transition-colors whitespace-nowrap">
            {editing ? "Simpan" : "Tambah"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setError("") }} className="px-4 py-2.5 border border-[var(--line)] rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--paper)] transition-colors">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-8 text-sm text-[var(--muted)] text-center">Belum ada kategori</p>
        ) : (
          <div className="divide-y divide-[var(--paper)]">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[#fafaf9] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--paper)] flex items-center justify-center text-sm">📁</div>
                  <span className="text-sm font-medium text-[#45533f]">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({ id: cat.id, name: cat.name })} className="text-xs px-3 py-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)] transition-colors font-medium">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
