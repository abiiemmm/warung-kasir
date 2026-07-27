import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/context/StoreContext"
import Sidebar from "@/components/Sidebar"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Warung Kasir",
  description: "Aplikasi kasir untuk warung",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plusJakartaSans.className}>
      <body>
        <StoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 bg-[#f5f5f4]">{children}</main>
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}
