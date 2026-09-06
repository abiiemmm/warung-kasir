import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import AppShell from "@/components/AppShell"
import PwaRegister from "@/components/PwaRegister"

export const metadata: Metadata = {
  title: "Warung Kasir",
  description: "Aplikasi kasir untuk warung",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
