"use client"

import { useState } from "react"
import Icon from "@/components/Icon"
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
    <div className="login-page">
      <section className="login-story">
        <div className="login-wordmark"><Icon name="shop" size={30} /> warung kasir.</div>
        <div className="login-story-content"><span className="eyebrow">DARI BUKA WARUNG, SAMPAI TUTUP BUKU.</span><h1>Warung kecil.<br />Cerita besar.</h1><p>Temani hari-hari berjualan dengan catatan yang rapi. Dari belanja pertama sampai hitungan terakhir.</p>
          <div className="warung-sign" aria-hidden="true"><div className="awning" /><div className="sign-inner"><span>SELAMAT DATANG DI</span><strong>Warung Kita</strong><div className="sign-rule" /><span>SEMOGA LARIS MANIS</span></div><div className="sign-bottom"><span>JUALAN</span><Icon name="shop" size={24} /><span>HARI INI</span></div></div>
        </div>
        <div className="login-story-footer"><span>Dibuat untuk keseharian warung.</span><span>01 — ∞</span></div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="eyebrow">SELAMAT DATANG KEMBALI</span>
          <h2>Siap buka warung?</h2>
          <p>Masuk ke akun untuk mulai mencatat penjualan.</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="login-name">Nama pengguna</label>
            <input id="login-name" type="text" autoFocus autoComplete="username" placeholder="Masukkan nama Anda" value={name} onChange={e => setName(e.target.value)} required />
            <label htmlFor="login-pin">PIN akun</label>
            <input id="login-pin" type="password" inputMode="numeric" autoComplete="current-password" placeholder="Masukkan PIN" maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy || !name.trim() || pin.length < 4} className="button-primary">{busy ? "Memeriksa akun…" : "Masuk ke warung"}<Icon name="arrow" size={18} /></button>
          </form>
          <details className="login-help"><summary>Pertama kali menggunakan?</summary><p>Akun bawaan: <strong>Pemilik</strong>, PIN <strong>111111</strong>. Ganti PIN melalui Pengaturan setelah masuk.</p></details>
          <div className="login-bottom"><Icon name="receipt" size={17} /><span>Jualan lancar. Catatan teratur.</span></div>
        </div>
      </section>
    </div>
  )
}
