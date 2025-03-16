"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusIcon, ShareIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BarChart } from "@/components/ui/bar-chart"
import { ChartContainer } from "@/components/ui/chart-container"

interface Dashboard {
  id: string
  title: string
  content: string
  createdAt: string
}

export default function DashboardsPage() {
  const router = useRouter()
  const [dashboards, setDashboards] = useState<Dashboard[]>([
    {
      id: "1",
      title: "Customer Support Overview",
      content: "This dashboard shows key metrics from the customer support system.",
      createdAt: "2023-05-20",
    },
    {
      id: "2",
      title: "Sales Performance",
      content: "Track sales performance across different regions and products.",
      createdAt: "2023-06-15",
    },
    {
      id: "3",
      title: "HR Analytics",
      content: "Monitor employee satisfaction and HR-related metrics.",
      createdAt: "2023-07-05",
    },
  ])

  const handleNewDashboard = () => {
    router.push("/chat/2?create=dashboard")
  }

  const handleOpenDashboard = (id: string) => {
    router.push(`/chat/2?dashboard=${id}`)
  }

  const handleDeleteChart = (id: string) => {
    console.log("Delete chart", id)
  }

  const handleExpandChart = (id: string) => {
    console.log("Expand chart", id)
  }

  const handleToggleFavorite = (id: string) => {
    console.log("Toggle favorite", id)
  }

  return (
    <DashboardLayout>
      <div className="flex justify-end items-center mb-6">
        <Button onClick={handleNewDashboard} className="bg-[#6366f1] hover:bg-[#4f46e5]">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((dashboard) => (
          <Card
            key={dashboard.id}
            className="bg-card overflow-hidden border border-border/40 hover:border-border transition-colors"
          >
            <CardHeader className="p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-medium">{dashboard.title}</CardTitle>
                <Badge variant="outline" className="bg-white dark:bg-gray-700">
                  {new Date(dashboard.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-body">{dashboard.content}</p>
              <div className="mt-4 h-40 rounded-md overflow-hidden">
                {/* Replace the chart rendering code here */}
                <ChartContainer
                  title={dashboard.title}
                  description={dashboard.content}
                  isDashboard={true}
                  onDelete={() => handleDeleteChart(dashboard.id)}
                  onExpand={() => handleExpandChart(dashboard.id)}
                  isFavorite={false}
                  onToggleFavorite={() => handleToggleFavorite(dashboard.id)}
                >
                  <BarChart
                    data={[
                      { Date: "2023-01-01", Value: 1000 },
                      { Date: "2023-01-02", Value: 2000 },
                    ]}
                    index="Date"
                    categories={["Value"]}
                    valueFormatter={(value) =>
                      typeof value === "number" && value > 1000 ? `$${(value / 1000).toFixed(0)}k` : value.toString()
                    }
                  />
                </ChartContainer>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-900 border-t">
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(dashboard.createdAt).toLocaleDateString()}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#6366f1] text-[#6366f1] hover:bg-[#6366f1]/10"
                  onClick={() => handleOpenDashboard(dashboard.id)}
                >
                  Open
                </Button>
                <Button variant="outline" size="sm" className="border-[#6366f1] text-[#6366f1] hover:bg-[#6366f1]/10">
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}

