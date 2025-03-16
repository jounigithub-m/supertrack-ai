import type React from "react"
import { Roboto } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
})

export const metadata = {
  title: "Supertrack AI Platform",
  description: "Enterprise data sync platform for topic-specific AI agents",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen bg-background font-roboto ${roboto.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="supertrack-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'