"use client"
import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, ShoppingCart, ArrowUpRight, ArrowRight } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, LineChart } from "recharts"
import { Chart, ChartContainer } from "@/components/ui/chart"
import { StatCard } from "@/components/ui/stat-card"
import { AIInsightsCard } from "@/components/ui/ai-insights-card"
import { AgentCard } from "@/components/ui/agent-card"
import Link from "next/link"

// Sample data for KPIs
const kpiData = [
  {
    title: "Total Revenue",
    value: "$124,592",
    change: "+12.5%",
    trend: "up" as const,
    icon: <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    title: "New Customers",
    value: "1,294",
    change: "+5.2%",
    trend: "up" as const,
    icon: <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    title: "Conversion Rate",
    value: "3.2%",
    change: "-0.4%",
    trend: "down" as const,
    icon: <ArrowUpRight className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
  },
  {
    title: "Avg. Order Value",
    value: "$96.28",
    change: "+2.1%",
    trend: "up" as const,
    icon: <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  },
]

// Sample AI insights
const aiInsights = [
  "Email campaigns have shown a 15% higher conversion rate compared to social media in the last 30 days.",
  "Customer acquisition cost has decreased by 8% this quarter, primarily due to improved organic search performance.",
  "Tuesday and Wednesday show the highest conversion rates, suggesting optimal timing for promotional campaigns.",
]

// Sample data for website traffic
const websiteTrafficData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  return {
    date: date.toISOString().split("T")[0],
    desktop: Math.floor(Math.random() * 1000) + 1000,
    mobile: Math.floor(Math.random() * 800) + 600,
  }
})

// Sample data for monthly visitors
const monthlyVisitorsData = [
  { month: "Jan", visitors: 186 },
  { month: "Feb", visitors: 305 },
  { month: "Mar", visitors: 237 },
  { month: "Apr", visitors: 73 },
  { month: "May", visitors: 209 },
  { month: "Jun", visitors: 214 },
]

// Sample agent data
const initialAgents = [
  {
    id: "1",
    name: "Marketing Analytics Bot",
    description: "Analyzes marketing campaign performance and provides optimization suggestions",
    dataSource: "Marketing Data",
    lastUpdated: "1 hour ago",
    isFavorite: true,
  },
  {
    id: "2",
    name: "Sales Forecasting Bot",
    description: "Predicts sales trends and identifies potential opportunities",
    dataSource: "Sales Database",
    lastUpdated: "30 minutes ago",
    isFavorite: true,
  },
  {
    id: "3",
    name: "Customer Insights Bot",
    description: "Analyzes customer behavior and provides personalized recommendations",
    dataSource: "Customer CRM",
    lastUpdated: "2 hours ago",
    isFavorite: true,
  },
  {
    id: "4",
    name: "HR Knowledge Bot",
    description: "Answers questions about company policies and procedures",
    dataSource: "HR Documents DB",
    lastUpdated: "3 hours ago",
    isFavorite: false,
  },
]

export default function HomePage() {
  const [agents, setAgents] = useState(initialAgents)

  const toggleFavorite = (agentId: string) => {
    setAgents(agents.map((agent) => (agent.id === agentId ? { ...agent, isFavorite: !agent.isFavorite } : agent)))
  }

  return (
    <DashboardLayout>
      <div className="grid gap-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiData.map((kpi, index) => (
            <StatCard
              key={index}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              icon={kpi.icon}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area Chart - Takes up 2/3 of the width */}
          <div className="lg:col-span-2">
            <Chart
              title="Area Chart - Interactive"
              subtitle="Showing total visitors for the last 3 months"
              timeRange="30d"
              headerClassName=""
            >
              <ChartContainer className="h-[280px]">
                <AreaChart
                  width={650}
                  height={300}
                  data={websiteTrafficData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorDesktop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(37, 99, 235)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(37, 99, 235)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(147, 197, 253)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(147, 197, 253)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="mobile"
                    stroke="rgb(147, 197, 253)"
                    fillOpacity={1}
                    fill="url(#colorMobile)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="desktop"
                    stroke="rgb(37, 99, 235)"
                    fillOpacity={1}
                    fill="url(#colorDesktop)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </Chart>
          </div>

          {/* AI Insights Card - Takes up 1/3 of the width */}
          <div className="lg:col-span-1">
            <AIInsightsCard insights={aiInsights} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Vertical Bar Chart */}
          <Chart
            title="Bar Chart - Label"
            subtitle="January - June 2024"
            trend={{ value: "5.2%", trend: "up" }}
            className="bg-white dark:bg-gray-900 border border-border/40 hover:border-border transition-colors"
            headerClassName=""
          >
            <ChartContainer className="h-[300px]">
              <BarChart
                width={300}
                height={250}
                data={monthlyVisitorsData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="visitors" fill="rgb(37, 99, 235)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </Chart>

          {/* Horizontal Bar Chart */}
          <Chart
            title="Bar Chart - Custom Label"
            subtitle="January - June 2024"
            trend={{ value: "5.2%", trend: "up" }}
            className="bg-white dark:bg-gray-900 border border-border/40 hover:border-border transition-colors"
            headerClassName=""
          >
            <ChartContainer className="h-[300px]">
              <BarChart
                width={300}
                height={250}
                data={monthlyVisitorsData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 40, bottom: 0 }}
                barSize={24}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="month"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="visitors" fill="rgb(37, 99, 235)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </Chart>

          {/* Line Chart with Dots */}
          <Chart
            title="Line Chart - Dots"
            subtitle="January - June 2024"
            trend={{ value: "5.2%", trend: "up" }}
            className="bg-white dark:bg-gray-900 border border-border/40 hover:border-border transition-colors"
            headerClassName=""
          >
            <ChartContainer className="h-[300px]">
              <LineChart
                width={300}
                height={250}
                data={monthlyVisitorsData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="rgb(37, 99, 235)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "rgb(37, 99, 235)" }}
                />
              </LineChart>
            </ChartContainer>
          </Chart>
        </div>

        {/* Favorite Agents Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Favorite Agents</h2>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1 text-[#6366f1] border-[#6366f1] hover:bg-[#6366f1]/10"
            >
              <Link href="/agents">
                View All Agents
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents
              .filter((agent) => agent.isFavorite)
              .map((agent) => (
                <AgentCard key={agent.id} agent={agent} onToggleFavorite={toggleFavorite} />
              ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

