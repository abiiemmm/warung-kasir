"use client"

import { useState, useRef } from "react"
import { downloadBackup, downloadExport, restoreBackup, resetData } from "@/lib/api"
import { useStore } from "@/context/StoreContext"

export default function SettingsPage() {
  const { refreshData } = useStore()
  const [busy, setBusy] = useState<"backup" | "export" | "restore" | "reset" | null>(null)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmText, setConfirmText] = useState("")
  const [reseed, setReseed] = useState(false)

  async function handleBackup() {
    setBusy("backup"); setMessage(null)
    try {
      await downloadBackup()
      setMessage({ type: "ok", text: "Backup berhasil diunduh." })
    } catch {
      setMessage({ type: "err", text: "Gagal membuat backup. Coba lagi." })
    } finally {
      setBusy(null)
    }
  }

  async function handleExport() {
    setBusy("export"); setMessage(null)
    try {
      await downloadExport()
      setMessage({ type: "ok", text: "Ekspor data berhasil diunduh." })
    } catch {
      setMessage({ type: "err", text: "Gagal mengekspor data. Coba lagi." })
    } finally {
      setBusy(null)
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!confirm("Restore akan MENGGANTI seluruh data saat ini dengan isi file backup. Lanjutkan?")) return

    setBusy("restore"); setMessage(null)
    try {
      await restoreBackup(file)
      await refreshData()
      setMessage({ type: "ok", text: "Restore berhasil. Data sudah dimuat ulang." })
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Gagal restore data." })
    } finally {
      setBusy(null)
    }
  }

  async function handleReset() {
    if (confirmText !== "RESET") return
    setBusy("reset"); setMessage(null)
    try {
      await resetData(reseed)
      await refreshData()
      setConfirmText("")
      setMessage({ type: "ok", text: reseed ? "Data berhasil direset dan diisi ulang dengan data contoh." : "Semua data berhasil dihapus." })
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Gagal reset data." })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[#1c1917] tracking-tight">Pengaturan</h1>
        <p className="text-sm text-[#78716c] mt-1">Backup, restore, reset, dan kelola data warung</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg mb-4">💾</div>
          <h2 className="text-sm font-semibold text-[#1c1917] mb-1">Backup Database</h2>
          <p className="text-xs text-[#78716c] mb-4">Unduh salinan lengkap database (.db). Simpan di tempat aman secara berkala.</p>
          <button
            onClick={handleBackup}
            disabled={busy !== null}
            className="w-full px-5 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] disabled:opacity-50 transition-colors"
          >
            {busy === "backup" ? "Menyiapkan..." : "Unduh Backup"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg mb-4">📄</div>
          <h2 className="text-sm font-semibold text-[#1c1917] mb-1">Ekspor Data (JSON)</h2>
          <p className="text-xs text-[#78716c] mb-4">Unduh semua data dalam format JSON yang mudah dibaca atau dipindahkan.</p>
          <button
            onClick={handleExport}
            disabled={busy !== null}
            className="w-full px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {busy === "export" ? "Menyiapkan..." : "Ekspor JSON"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f4] flex items-center justify-center text-lg mb-4">♻️</div>
          <h2 className="text-sm font-semibold text-[#1c1917] mb-1">Restore Database</h2>
          <p className="text-xs text-[#78716c] mb-4">
            Pulihkan data dari file backup (.db). <span className="text-red-500 font-medium">Seluruh data saat ini akan diganti.</span>
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
            className="w-full px-5 py-2.5 bg-[#1c1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] disabled:opacity-50 transition-colors"
          >
            {busy === "restore" ? "Memulihkan..." : "Pilih File & Restore"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".db,application/octet-stream"
            className="hidden"
            onChange={handleRestoreFile}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-red-50/50 border-2 border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-[11px] font-bold uppercase tracking-wider">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Danger Zone
          </span>
          <h2 className="text-sm font-bold text-[#1c1917]">Reset Semua Data</h2>
        </div>
        <p className="text-xs text-[#78716c] mb-4">
          Menghapus <span className="font-medium text-red-600">secara permanen</span> seluruh produk, kategori,
          transaksi, piutang, pembayaran, pengingat, dan log aktivitas. Tindakan ini <span className="font-medium text-red-600">tidak bisa dibatalkan</span>.
          Disarankan untuk membuat backup terlebih dahulu.
        </p>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reseed}
            onChange={(e) => setReseed(e.target.checked)}
            className="w-4 h-4 accent-red-600"
          />
          <span className="text-sm text-[#44403c]">Isi ulang dengan data contoh setelah reset</span>
        </label>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Ketik RESET untuk konfirmasi"
            className="flex-1 px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
          />
          <button
            onClick={handleReset}
            disabled={confirmText !== "RESET" || busy !== null}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 disabled:bg-[#d6d3d1] disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {busy === "reset" ? "Menghapus..." : "Hapus Semua Data"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.type === "ok" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
