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

  function handleDelete(id: string) {
    if (confirm("Yakin hapus kategori ini?")) deleteCategory(id)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Kategori</h1>
        <p className="text-sm text-[#78716c] mt-1">Kelola kategori produk</p>
      </div>

      <form onSubmit={editing ? handleUpdate : handleSubmit} className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={editing ? "Ubah nama kategori..." : "Nama kategori baru..."}
              className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
              value={editing ? editing.name : name}
              onChange={(e) => {
                setError("")
                if (editing) setEditing({ ...editing, name: e.target.value })
                else setName(e.target.value)
              }}
            />
            {error && <p className="text-xs text-red-500 mt-1.5 ml-1">{error}</p>}
          </div>
          <button type="submit" className="px-5 py-2.5 bg-[#1c1917] text-white rounded-lg text-sm font-medium hover:bg-[#292524] transition-colors whitespace-nowrap">
            {editing ? "Simpan" : "Tambah"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setError("") }} className="px-4 py-2.5 border border-[#e7e5e4] rounded-lg text-sm text-[#78716c] hover:bg-[#f5f5f4] transition-colors">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-8 text-sm text-[#78716c] text-center">Belum ada kategori</p>
        ) : (
          <div className="divide-y divide-[#f5f5f4]">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[#fafaf9] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f5f4] flex items-center justify-center text-sm">📁</div>
                  <span className="text-sm font-medium text-[#44403c]">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({ id: cat.id, name: cat.name })} className="text-xs px-3 py-1.5 rounded-lg text-[#78716c] hover:bg-[#f5f5f4] hover:text-[#1c1917] transition-colors font-medium">
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
