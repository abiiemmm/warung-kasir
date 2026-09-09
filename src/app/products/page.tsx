"use client"

/* eslint-disable @next/next/no-img-element -- gambar produk berupa data-URL, next/image tidak mendukungnya */

import { useState } from "react"
import { useStore } from "@/context/StoreContext"
import { useAuth } from "@/context/AuthContext"
import { opnameProduct } from "@/lib/api"
import { formatRupiah, compressImage, isLowStock } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductForm {
  name: string
  price: string
  costPrice: string
  stock: string
  minStock: string
  categoryId: string
  barcode: string
}

const emptyForm: ProductForm = { name: "", price: "", costPrice: "", stock: "", minStock: "", categoryId: "", barcode: "" }

export default function ProductsPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct, updateStock, refreshData } = useStore()
  const { isOwner } = useAuth()
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
    const costPrice = Number(form.costPrice) || 0
    const stock = Number(form.stock)
    const minStock = Number(form.minStock) || 0
    if (!name || !form.categoryId) { setError("Nama dan kategori harus diisi"); return }
    if (price < 0 || stock < 0 || costPrice < 0) { setError("Harga dan stok tidak boleh negatif"); return }
    addProduct({
      name,
      price,
      costPrice,
      stock,
      minStock,
      categoryId: form.categoryId,
      image: formImage || undefined,
      barcode: form.barcode.trim() || undefined,
    })
    resetForm()
  }

  function openEdit(p: Product) {
    setEditForm({
      name: p.name,
      price: String(p.price),
      costPrice: String(p.costPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
      categoryId: p.categoryId,
      barcode: p.barcode || "",
    })
    setEditImage(p.image || "")
    setEditError("")
    setEditTarget(p)
  }

  function saveEdit() {
    if (!editTarget) return
    const name = editForm.name.trim()
    const price = Number(editForm.price)
    const costPrice = Number(editForm.costPrice) || 0
    const stock = Number(editForm.stock)
    const minStock = Number(editForm.minStock) || 0
    if (!name || !editForm.categoryId) { setEditError("Nama dan kategori harus diisi"); return }
    if (price < 0 || stock < 0 || costPrice < 0) { setEditError("Harga dan stok tidak boleh negatif"); return }
    const data: Partial<Omit<Product, "id" | "createdAt">> = {
      name,
      price,
      costPrice,
      stock,
      minStock,
      categoryId: editForm.categoryId,
      barcode: editForm.barcode.trim() || undefined,
    }
    if (editImage !== (editTarget.image || "")) data.image = editImage || undefined
    updateProduct(editTarget.id, data)
    setEditTarget(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Yakin hapus produk ini?")) await deleteProduct(id)
  }

  function handleRestock(p: Product) {
    const input = prompt(`Restok "${p.name}" — tambah berapa pcs?`, "10")
    if (input === null) return
    const qty = Number(input)
    if (!Number.isInteger(qty) || qty <= 0) { alert("Jumlah harus bilangan bulat positif"); return }
    updateStock(p.id, qty)
  }

  /** Stok opname: masukkan hasil hitung fisik, server yang menghitung selisihnya. */
  async function handleOpname(p: Product) {
    const input = prompt(`Stok opname "${p.name}"\nSistem mencatat ${p.stock} pcs.\nBerapa hasil hitung fisiknya?`, String(p.stock))
    if (input === null) return
    const counted = Number(input)
    if (!Number.isInteger(counted) || counted < 0) { alert("Jumlah harus bilangan bulat ≥ 0"); return }
    if (counted === p.stock) { alert("Stok sudah cocok, tidak ada perubahan."); return }

    const reason = prompt("Alasan selisih (mis. rusak, hilang, salah catat):", "") ?? ""
    try {
      const res = await opnameProduct(p.id, counted, reason)
      await refreshData()
      alert(`Stok "${p.name}" disesuaikan: ${res.before} → ${res.stock} (selisih ${res.delta > 0 ? "+" : ""}${res.delta})`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan opname")
    }
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
        <h1 className="text-[22px] font-semibold text-[var(--ink)] tracking-tight">Produk</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Kelola daftar produk warung</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-6 mb-6">
        <p className="text-sm font-semibold text-[var(--ink)] mb-4">Tambah Produk Baru</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Nama produk"
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Harga"
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            type="number"
            placeholder="Stok"
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <select
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Pilih kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-[var(--paper)] border border-dashed border-[var(--line)] rounded-lg text-sm text-[#858a7b] hover:text-[var(--muted)] hover:border-[#cdd2c2] cursor-pointer transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            {formImage ? "Ganti Gambar" : "Upload Gambar"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFormImage} />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <input
            type="number"
            placeholder="Harga modal (untuk hitung laba)"
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
          />
          <input
            type="number"
            placeholder="Stok minimum (peringatan)"
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
          />
          <input
            type="text"
            placeholder="Barcode (opsional)"
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          {formImage && (
            <div className="flex items-center gap-3 sm:col-span-2">
              <img src={formImage} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-[var(--line)]" />
              <button type="button" onClick={() => setFormImage("")} className="text-xs text-red-500 hover:text-red-600">Hapus</button>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button type="submit" className="px-5 py-2 bg-[var(--ink)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">Tambah Produk</button>
        </div>
      </form>

      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none p-4 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858a7b]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Cari produk..."
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
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

      <div className="bg-[var(--surface)] rounded-md border border-[var(--line)] shadow-none overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-sm text-[var(--muted)] text-center">Tidak ada produk</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--paper)]">
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Gambar</th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Nama</th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Kategori</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Harga</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Laba/pcs</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Stok</th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId)
                return (
                  <tr key={p.id} className="border-b border-[var(--paper)] hover:bg-[#fafaf9] transition-colors">
                    <td className="px-3 sm:px-6 py-3.5">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-[var(--line)]" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[var(--paper)] flex items-center justify-center text-sm">📦</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3.5">
                      <div className="font-medium text-[#45533f]">{p.name}</div>
                      {p.barcode && <div className="text-[11px] text-[#858a7b] font-mono">{p.barcode}</div>}
                    </td>
                    <td className="px-3 sm:px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--muted)]">
                        {cat?.name ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3.5 text-right font-semibold text-[#45533f]">{formatRupiah(p.price)}</td>
                    <td className="px-3 sm:px-6 py-3.5 text-right">
                      {p.costPrice > 0 ? (
                        <span className={p.price - p.costPrice > 0 ? "text-[var(--green)] font-medium" : "text-red-500 font-medium"}>
                          {formatRupiah(p.price - p.costPrice)}
                        </span>
                      ) : (
                        <span className="text-[#858a7b] text-xs">belum diisi</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3.5 text-right">
                      <span className={`font-semibold ${isLowStock(p) ? "text-red-500" : "text-[#45533f]"}`}>{p.stock}</span>
                      {isLowStock(p) && <div className="text-[10px] text-red-400">min {p.minStock || 10}</div>}
                    </td>
                    <td className="px-3 sm:px-6 py-3.5 text-right whitespace-nowrap">
                      <button onClick={() => handleRestock(p)} className="text-xs px-3 py-1.5 rounded-lg text-[var(--green)] hover:bg-emerald-50 transition-colors font-medium mr-1.5">
                        + Stok
                      </button>
                      <button onClick={() => handleOpname(p)} className="text-xs px-3 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium mr-1.5">
                        Opname
                      </button>
                      <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)] transition-colors font-medium mr-1.5">
                        Edit
                      </button>
                      {isOwner && (
                        <button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                          Hapus
                        </button>
                      )}
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
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--line)] w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Edit Produk</h2>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-[var(--paper)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Nama Produk</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Harga</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Harga Modal</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={editForm.costPrice}
                  onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                />
                <p className="text-[11px] text-[#858a7b] mt-1">Dipakai menghitung laba kotor di laporan.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Stok</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Stok Minimum</label>
                  <input
                    type="number"
                    placeholder="10"
                    className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[#858a7b] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                    value={editForm.minStock}
                    onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Kategori</label>
                <select
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
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
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Barcode (opsional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/10 focus:border-[var(--ink)] transition-all"
                  value={editForm.barcode}
                  onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Gambar</label>
                <div className="flex items-center gap-3">
                  {editImage ? (
                    <img src={editImage} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-[var(--line)]" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[var(--paper)] flex items-center justify-center text-lg border border-[var(--line)]">📦</div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 bg-[var(--paper)] border border-dashed border-[var(--line)] rounded-lg text-sm text-[#858a7b] hover:text-[var(--muted)] hover:border-[#cdd2c2] cursor-pointer transition-all">
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
                <button onClick={saveEdit} className="flex-1 px-5 py-2.5 bg-[var(--ink)] text-white rounded-md text-sm font-medium hover:bg-[var(--green-dark)] transition-colors">Simpan</button>
                <button onClick={() => setEditTarget(null)} className="flex-1 px-5 py-2.5 border border-[var(--line)] rounded-md text-sm text-[var(--muted)] hover:bg-[var(--paper)] transition-colors">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
