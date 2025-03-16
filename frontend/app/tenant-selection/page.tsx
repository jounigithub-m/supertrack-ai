"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"

interface Tenant {
  id: string
  name: string
  role: "admin" | "viewer"
}

export default function TenantSelectionPage() {
  const router = useRouter()
  const [tenants] = useState<Tenant[]>([
    { id: "1", name: "Acme Corp", role: "admin" },
    { id: "2", name: "Globex Industries", role: "viewer" },
    { id: "3", name: "Initech", role: "admin" },
  ])

  const handleTenantSelect = (tenant: Tenant) => {
    // In a real app, you would store the selected tenant in context or state
    // For now, we'll just navigate to the dashboard
    router.push("/dashboards")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header userEmail="user@example.com" />
      <div className="flex-1 flex items-center justify-center p-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Select Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {tenants.map((tenant) => (
                <li key={tenant.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start py-3 px-4 h-auto text-left hover:bg-secondary"
                    onClick={() => handleTenantSelect(tenant)}
                  >
                    {tenant.name} ({tenant.role})
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

