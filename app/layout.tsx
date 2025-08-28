import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/contexts/theme-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PaddleCourt Pro - Premium Court Booking",
  description:
    "Book premium paddle courts online with ease. Professional facilities, flexible scheduling, and seamless booking experience.",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <Toaster position="bottom-left" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
