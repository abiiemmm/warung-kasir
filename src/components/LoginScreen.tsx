"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"

export default function LoginScreen() {
  const { login } = useAuth()
  const [name, setName] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      await login(name.trim(), pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk")
      setPin("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0c0c0d] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="6" width="10" height="8" rx="1.6" fill="#ffffff" />
              <rect x="6.2" y="7" width="7.6" height="2.6" rx="0.8" fill="#0c0c0d" />
              <path d="M8.2 8.6l1 1 2-2.4" stroke="#34d399" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="5" y="14.5" width="10" height="3" rx="1.2" fill="#f5f5f4" />
              <circle cx="18" cy="17.5" r="3.2" fill="#34d399" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1c1917]">Warung Kasir</h1>
          <p className="text-sm text-[#78716c] mt-1">Masuk untuk mulai berjualan</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm p-6">
          <label className="block text-xs font-semibold text-[#57534e] mb-1.5">Nama</label>
          <input
            type="text"
            autoFocus
            autoComplete="username"
            placeholder="Pemilik"
            className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="block text-xs font-semibold text-[#57534e] mb-1.5 mt-4">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="••••••"
            maxLength={8}
            className="w-full px-4 py-2.5 bg-[#f5f5f4] border border-[#e7e5e4] rounded-lg text-sm tracking-[0.4em] text-[#1c1917] placeholder:tracking-normal placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#1c1917]/10 focus:border-[#1c1917] transition-all"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />

          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

          <button
            type="submit"
            disabled={busy || !name.trim() || pin.length < 4}
            className="w-full mt-5 px-4 py-2.5 bg-[#1c1917] text-white rounded-lg text-sm font-medium hover:bg-[#292524] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <p className="text-[11px] text-[#a8a29e] text-center mt-4 leading-relaxed">
          Belum pernah login? Akun bawaan: <span className="font-medium text-[#78716c]">Pemilik</span> dengan PIN{" "}
          <span className="font-medium text-[#78716c]">111111</span>. Segera ganti lewat Pengaturan.
        </p>
      </div>
    </div>
  )
}
