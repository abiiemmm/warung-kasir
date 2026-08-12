"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { AuthUser } from "@/lib/types"
import { getCurrentUser, login as apiLogin, logout as apiLogout, setUnauthorizedHandler } from "@/lib/api"

interface AuthContextType {
  user: AuthUser | null
  /** true selama sesi awal masih diperiksa ke server. */
  loading: boolean
  isOwner: boolean
  login: (name: string, pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  // Sesi bisa habis kapan saja; begitu ada 401, kembalikan ke layar login.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (name: string, pin: string) => {
    setUser(await apiLogin(name, pin))
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isOwner: user?.role === "owner", login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
