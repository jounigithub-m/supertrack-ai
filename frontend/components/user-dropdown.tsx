"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserIcon, Settings2Icon, LogOutIcon, BuildingIcon } from "lucide-react"

interface Tenant {
  id: string
  name: string
  role: "admin" | "viewer"
}

interface UserDropdownProps {
  userEmail?: string
  userName?: string
  userImage?: string
}

export function UserDropdown({ userEmail = "user@example.com", userName = "User", userImage }: UserDropdownProps) {
  const router = useRouter()
  const [tenants] = useState<Tenant[]>([
    { id: "1", name: "Acme Corp", role: "admin" },
    { id: "2", name: "Globex Industries", role: "viewer" },
    { id: "3", name: "Initech", role: "admin" },
  ])

  const handleTenantSelect = (tenant: Tenant) => {
    // In a real app, this would update the last_selected_tenant in Cosmos DB
    // and refresh the page with the new tenant context
    console.log(`Selected tenant: ${tenant.name}`)

    // Redirect based on role
    if (tenant.role === "admin") {
      router.push("/profile")
    } else {
      router.push("/dashboards")
    }
  }

  const handleLogout = () => {
    router.push("/login")
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-10 w-10 cursor-pointer">
          <AvatarImage src={userImage} alt={userName} />
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings2Icon className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
        {tenants.map((tenant) => (
          <DropdownMenuItem key={tenant.id} onClick={() => handleTenantSelect(tenant)}>
            <BuildingIcon className="mr-2 h-4 w-4" />
            <span>{tenant.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{tenant.role}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

