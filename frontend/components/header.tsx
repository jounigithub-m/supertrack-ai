"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon, BellIcon } from "lucide-react"
import { UserDropdown } from "@/components/user-dropdown"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface HeaderProps {
  userEmail?: string
  userName?: string
  userImage?: string
  agentName?: string
}

export function Header({ userEmail = "user@example.com", userName = "User", userImage, agentName }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  // Get the current section from the pathname
  const getCurrentSection = () => {
    const path = pathname.split("/")[1]
    switch (path) {
      case "home":
        return "Home"
      case "dashboards":
        return "Dashboards"
      case "agents":
        return "Agents"
      case "data-sources":
        return "Data Sources"
      case "people-groups":
        return "People & Groups"
      case "api-config":
        return "API Configuration"
      case "settings":
        return "Settings"
      case "chat":
        return "Agents"
      default:
        return "Home"
    }
  }

  return (
    <header className="h-14 border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/home" className="text-gray-900 font-medium">
              Supertrack AI
            </Link>

            <span className="text-gray-400">&gt;</span>

            {pathname === "/home" ? (
              <span className="text-gray-600">Home</span>
            ) : (
              <>
                <Link href="/home" className="text-gray-600 hover:text-gray-900">
                  Home
                </Link>

                <span className="text-gray-400">&gt;</span>

                {pathname.includes("/chat/") ? (
                  <>
                    <Link href="/agents" className="text-gray-600 hover:text-gray-900">
                      Agents
                    </Link>
                    <span className="text-gray-400">&gt;</span>
                    <span className="text-gray-600">{agentName}</span>
                  </>
                ) : (
                  <span className="text-gray-600">{getCurrentSection()}</span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
            <BellIcon className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
          >
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <UserDropdown userEmail={userEmail} userName={userName} userImage={userImage} />
        </div>
      </div>
    </header>
  )
}

