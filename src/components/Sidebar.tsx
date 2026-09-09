"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import Icon, { type IconName } from "@/components/Icon"

const groups: { title: string; links: { href: string; label: string; icon: IconName; ownerOnly?: boolean }[] }[] = [
  { title: "WARUNG", links: [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/pos", label: "Kasir", icon: "cart" },
    { href: "/shift", label: "Shift kasir", icon: "wallet" },
    { href: "/transactions", label: "Riwayat transaksi", icon: "receipt" },
  ] },
  { title: "BUKU WARUNG", links: [
    { href: "/products", label: "Produk & stok", icon: "box" },
    { href: "/categories", label: "Kategori", icon: "folder" },
    { href: "/debts", label: "Catatan piutang", icon: "wallet" },
    { href: "/customers", label: "Pelanggan", icon: "users" },
    { href: "/calendar", label: "Pengingat", icon: "calendar" },
  ] },
  { title: "PENGELOLAAN", links: [
    { href: "/reports", label: "Laporan", icon: "chart", ownerOnly: true },
    { href: "/logs", label: "Aktivitas", icon: "clock", ownerOnly: true },
    { href: "/settings", label: "Pengaturan", icon: "settings" },
  ] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user, isOwner, logout } = useAuth()
  const menuButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus() }
      if (event.key === "Tab") {
        const elements = panel.current?.querySelectorAll<HTMLElement>("a, button")
        if (!elements?.length) return
        const first = elements[0], last = elements[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey) }
  }, [open])

  return <>
    <div className="mobile-bar print-hidden">
      <button ref={menuButton} onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open} aria-controls="warung-navigation"><Icon name="menu" /></button>
      <Link href="/" className="mobile-brand">warung<span>kasir.</span></Link>
      <Link href="/pos" aria-label="Buka kasir"><Icon name="cart" /></Link>
    </div>
    {open && <div className="nav-backdrop" onClick={() => { setOpen(false); menuButton.current?.focus() }} />}
    <aside ref={panel} id="warung-navigation" className={`sidebar print-hidden ${open ? "is-open" : ""}`} aria-label="Navigasi utama">
      <div className="brand-row">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-symbol"><Icon name="shop" size={27} /></span>
          <span>warung<span className="brand-second">kasir.</span></span>
        </Link>
        <button className="nav-close" onClick={() => { setOpen(false); menuButton.current?.focus() }} aria-label="Tutup menu"><Icon name="close" /></button>
      </div>
      <div className="brand-caption">TEMAN JUALAN SEHARI-HARI</div>
      <nav className="nav-groups">
        {groups.map(group => <div className="nav-group" key={group.title}>
          <p className="nav-label">{group.title}</p>
          {group.links.filter(link => !link.ownerOnly || isOwner).map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={pathname === link.href ? "page" : undefined} className={`nav-link ${pathname === link.href ? "is-active" : ""}`}>
            <Icon name={link.icon} size={19} /><span>{link.label}</span>{pathname === link.href && <span className="nav-active-dot" />}
          </Link>)}
        </div>)}
      </nav>
      <div className="sidebar-user"><span className="user-avatar">{user?.name.charAt(0).toUpperCase()}</span><div><strong>{user?.name}</strong><span>{isOwner ? "Pemilik warung" : "Kasir warung"}</span></div><button onClick={() => logout()} aria-label="Keluar dari akun" title="Keluar"><Icon name="logout" size={18} /></button></div>
    </aside>
  </>
}
