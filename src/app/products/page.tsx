"use client"

import { useState } from "react"
import { useStore } from "@/context/StoreContext"
import { formatRupiah, compressImage } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductForm {
  name: string
  price: string
  stock: string
  categoryId: string
}

const emptyForm: ProductForm = { name: "", price: "", stock: "", categoryId: "" }

export default function ProductsPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useStore()
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [formImage, setFormImage] = useState<string>("")
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [error, setError] = useState("")
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm)
  const [editImage, setEditImage] = useState<string>("")
  const [editError, setEditError] = useState("")

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || p.categoryId === catFilter
    return matchSearch && matchCat
  })

  function resetForm() { setForm(emptyForm); setFormImage(""); setError("") }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    const price = Number(form.price)
    const stock = Number(form.stock)
    if (!name || !form.categoryId) { setError("Nama dan kategori harus diisi"); return }
    if (price < 0 || stock < 0) { setError("Harga dan stok tidak boleh negatif"); return }
    addProduct({ name, price, stock, categoryId: form.categoryId, image: formImage || undefined })
    resetForm()
  }

  function openEdit(p: Product) {
    setEditForm({ name: p.name, price: String(p.price), stock: String(p.stock), categoryId: p.categoryId })
    setEditImage(p.image || "")
    setEditError("")
    setEditTarget(p)
  }

  function saveEdit() {
    if (!editTarget) return
    const name = editForm.name.trim()
    const price = Number(editForm.price)
    const stock = Number(editForm.stock)
    if (!name || !editForm.categoryId) { setEditError("Nama dan kategori harus diisi"); return }
    if (price < 0 || stock < 0) { setEditError("Harga dan stok tidak boleh negatif"); return }
    const data: Partial<Omit<Product, "id" | "createdAt">> = { name, price, stock, categoryId: editForm.categoryId }
    if (editImage !== (editTarget.image || "")) data.image = editImage || undefined
    updateProduct(editTarget.id, data)
    setEditTarget(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Yakin hapus produk ini?")) await deleteProduct(id)
  }

  async function handleFormImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setFormImage(await compressImage(file))
  }

  async function handleEditImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setEditImage(await compressImage(file))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Produk</h1>
        <p className="text-sm text-[#78716c] mt-1">Kelola daftar produk warung</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6 mb-6">
        <p className="text-sm font-semibold text-[#1c1917] mb-4">Tambah Produk Baru</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Nama produk"
            className="px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Harga"
            className="px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            type="number"
            placeholder="Stok"
            className="px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <select
            className="px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Pilih kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-[#f5f5f4] border border-dashed border-[#e7e5e4] rounded-lg text-sm text-[#a8a29e] hover:text-[#78716c] hover:border-[#d6d3d1] cursor-pointer transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {formImage ? "Ganti Gambar" : "Upload Gambar"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFormImage} />
          </label>
        </div>
        {formImage && (
          <div className="mt-3 flex items-center gap-3">
            <img src={formImage} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-[#e7e5e4]" />
            <button type="button" onClick={() => setFormImage("")} className="text-xs text-red-500 hover:text-red-600">Hapus</button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button type="submit" className="px-5 py-2 bg-[#1c1917] text-white rounded-lg text-sm font-medium hover:bg-[#292524] transition-colors">Tambah Produk</button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-4 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a29e]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Cari produk..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="">Semua kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-sm text-[#78716c] text-center">Tidak ada produk</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f5f5f4]">
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Gambar</th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Nama</th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Kategori</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Harga</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Stok</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[#78716c] uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId)
                return (
                  <tr key={p.id} className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors">
                    <td className="px-3 sm:px-6 py-3.5">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-[#e7e5e4]" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#f5f5f4] flex items-center justify-center text-sm">📦</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3.5">
                      <span className="font-medium text-[#44403c]">{p.name}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f5f5f4] text-[#78716c]">
                        {cat?.name ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3.5 text-right font-semibold text-[#44403c]">{formatRupiah(p.price)}</td>
                    <td className="px-3 sm:px-6 py-3.5 text-right">
                      <span className={`font-semibold ${p.stock <= 5 ? "text-red-500" : "text-[#44403c]"}`}>{p.stock}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3.5 text-right">
                      <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg text-[#78716c] hover:bg-[#f5f5f4] hover:text-[#1c1917] transition-colors font-medium mr-1.5">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                        Hapus
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-[#e7e5e4] w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#e7e5e4]">
              <h2 className="text-sm font-semibold text-[#1c1917]">Edit Produk</h2>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-[#f5f5f4] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Nama Produk</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Harga</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Stok</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Kategori</label>
                <select
                  className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716c] mb-1.5">Gambar</label>
                <div className="flex items-center gap-3">
                  {editImage ? (
                    <img src={editImage} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-[#e7e5e4]" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#f5f5f4] flex items-center justify-center text-lg border border-[#e7e5e4]">📦</div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f4] border border-dashed border-[#e7e5e4] rounded-lg text-sm text-[#a8a29e] hover:text-[#78716c] hover:border-[#d6d3d1] cursor-pointer transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    {editImage ? "Ganti" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditImage} />
                  </label>
                  {editImage && (
                    <button type="button" onClick={() => setEditImage("")} className="text-xs text-red-500 hover:text-red-600">Hapus</button>
                  )}
                </div>
              </div>
              {editError && <p className="text-xs text-red-500">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit} className="flex-1 px-5 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] transition-colors">Simpan</button>
                <button onClick={() => setEditTarget(null)} className="flex-1 px-5 py-2.5 border border-[#e7e5e4] rounded-xl text-sm text-[#78716c] hover:bg-[#f5f5f4] transition-colors">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
