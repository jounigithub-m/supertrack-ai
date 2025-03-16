"use client"

import { useState, useEffect, useLayoutEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BotIcon,
  CodeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Settings2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  userRole?: "admin" | "viewer"
}

const getSavedSidebarState = (): boolean => {
  if (typeof window !== "undefined") {
    const savedState = localStorage.getItem("sidebar-collapsed")
    return savedState === "true"
  }
  return false
}

export function Sidebar({ userRole = "admin" }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(() => getSavedSidebarState())
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      document.documentElement.style.setProperty("--sidebar-width", collapsed ? "4rem" : "16rem")
      localStorage.setItem("sidebar-collapsed", String(collapsed))
    }
  }, [collapsed, isMounted])

  const adminLinks = [
    {
      name: "Home",
      href: "/home",
      icon: HomeIcon,
    },
    {
      name: "Agents",
      href: "/agents",
      icon: BotIcon,
    },
    {
      name: "Data Sources",
      href: "/data-sources",
      icon: DatabaseIcon,
    },
    {
      name: "Dashboards",
      href: "/dashboards",
      icon: LayoutDashboardIcon,
    },
    {
      name: "People & Groups",
      href: "/people-groups",
      icon: UsersIcon,
    },
    {
      name: "API Configuration",
      href: "/api-config",
      icon: CodeIcon,
    },
  ]

  const viewerLinks = [
    {
      name: "Home",
      href: "/home",
      icon: HomeIcon,
    },
    {
      name: "Dashboards",
      href: "/dashboards",
      icon: LayoutDashboardIcon,
    },
  ]

  const links = userRole === "admin" ? adminLinks : viewerLinks

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "4rem" : "16rem")
  }, [collapsed])

  if (!isMounted) {
    return (
      <div
        className={cn(
          "fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-100 transition-none flex flex-col z-30",
          collapsed ? "w-16" : "w-64",
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-100 transition-all duration-300 flex flex-col z-30",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                  pathname === link.href
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <link.icon className="h-4 w-4" />
                {!collapsed && <span>{link.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-2 border-t border-gray-100">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm rounded-md mb-2 transition-colors",
            pathname === "/settings"
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <Settings2Icon className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        >
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

