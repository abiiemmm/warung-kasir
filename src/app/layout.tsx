import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import AppShell from "@/components/AppShell"
import PwaRegister from "@/components/PwaRegister"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
})

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
    <html lang="id" className={plusJakartaSans.className}>
      <body>
        <AuthProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
