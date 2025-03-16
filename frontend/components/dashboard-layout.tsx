import type React from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  userEmail?: string
  userName?: string
  userImage?: string
  userRole?: "admin" | "viewer"
  sidebarCollapsed?: boolean
  agentName?: string
}

export function DashboardLayout({
  children,
  userEmail = "user@example.com",
  userName = "User",
  userImage,
  userRole = "admin",
  sidebarCollapsed,
  agentName,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header userEmail={userEmail} userName={userName} userImage={userImage} agentName={agentName} />
      <div className="flex">
        <Sidebar userRole={userRole} />
        <main
          className="flex-1 overflow-auto transition-all duration-300"
          style={{ marginLeft: userRole === "admin" ? "var(--sidebar-width, 16rem)" : "0" }}
        >
          <div className="container mx-auto p-6 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

