"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/context/AuthContext"
import { StoreProvider } from "@/context/StoreContext"
import Sidebar from "@/components/Sidebar"
import LoginScreen from "@/components/LoginScreen"

/**
 * Seluruh aplikasi berada di balik login. StoreProvider sengaja baru dipasang
 * setelah user terautentikasi, supaya tidak ada permintaan data yang dikirim
 * (dan gagal 401) saat masih di layar login.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#e7e5e4] border-t-[#1c1917] rounded-full animate-spin" />
          <p className="text-sm text-[#78716c]">Memuat…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <StoreProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-[#f5f5f4]">{children}</main>
      </div>
    </StoreProvider>
  )
}
