"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/pos", label: "Kasir", icon: "ShoppingCart" },
  { href: "/products", label: "Produk", icon: "Package" },
  { href: "/categories", label: "Kategori", icon: "FolderKanban" },
  { href: "/transactions", label: "Riwayat", icon: "ScrollText" },
  { href: "/debts", label: "Piutang", icon: "HandCoins" },
  { href: "/customers", label: "Pelanggan", icon: "Users" },
  { href: "/reports", label: "Laporan", icon: "BarChart3" },
  { href: "/calendar", label: "Kalender", icon: "Calendar" },
  { href: "/logs", label: "Logs", icon: "History" },
  { href: "/settings", label: "Pengaturan", icon: "Settings" },
]

const icons: Record<string, ReactNode> = {
  LayoutDashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  ShoppingCart: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  ),
  Package: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="M7.5 9.5 16 5.5" />
    </svg>
  ),
  FolderKanban: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /><path d="M8 10v4" /><path d="M12 10v2" /><path d="M16 10v6" />
    </svg>
  ),
  Calendar: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
    </svg>
  ),
  HandCoins: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  History: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
    </svg>
  ),
  ScrollText: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a2 2 0 0 0-2 2v1a2 2 0 1 1-4 0V5a2 2 0 1 0-2 2v2a1 1 0 0 0 1 1h3" />
    </svg>
  ),
  Users: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  BarChart3: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  ),
  Settings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-white border border-[#e7e5e4] shadow-sm flex items-center justify-center text-[#78716c] hover:text-[#1c1917] transition-colors"
        aria-label="Buka menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-[#0c0c0d] text-white flex flex-col border-r border-white/[0.06]
          transition-transform duration-200 ease-in-out
          lg:sticky lg:translate-x-0 lg:shrink-0 lg:h-screen
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="22" height="22" rx="6" fill="#0c0c0d"/>
                <rect x="5" y="6" width="10" height="8" rx="1.6" fill="#ffffff"/>
                <rect x="6.2" y="7" width="7.6" height="2.6" rx="0.8" fill="#0c0c0d"/>
                <path d="M8.2 8.6l1 1 2-2.4" stroke="#34d399" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6.8" cy="12" r="0.7" fill="#d6d3d1"/>
                <circle cx="9.5" cy="12" r="0.7" fill="#d6d3d1"/>
                <circle cx="12.2" cy="12" r="0.7" fill="#d6d3d1"/>
                <circle cx="14.9" cy="12" r="0.7" fill="#d6d3d1"/>
                <rect x="5" y="14.5" width="10" height="3" rx="1.2" fill="#f5f5f4"/>
                <rect x="6.5" y="15.8" width="4" height="0.7" rx="0.35" fill="#a8a29e"/>
                <circle cx="18" cy="17.5" r="3.2" fill="#34d399"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight">Warung Kasir</h1>
              <p className="text-[11px] text-white/40 font-medium mt-0.5">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            aria-label="Tutup menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <nav className="flex flex-col px-3 gap-0.5 mt-2">
          <p className="px-2 py-2 text-[11px] font-semibold uppercase tracking-widest text-white/20">Menu</p>
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span className={active ? "text-white" : "text-white/30"}>{icons[link.icon]}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-3">
            <p className="text-[11px] text-white/30 font-medium">Warung v1.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
