"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  timeRange?: string
  trend?: {
    value: string
    trend: "up" | "down"
  }
  headerClassName?: string
}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  ({ className, title, subtitle, timeRange, trend, headerClassName, children, ...props }, ref) => {
    return (
      <Card className={cn("p-0 overflow-hidden", className)} ref={ref} {...props}>
        <div className={cn("flex justify-between items-start p-6", headerClassName)}>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {timeRange && (
            <Select defaultValue={timeRange}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="w-full p-6 pt-0">{children}</div>
        {trend && (
          <div className="mt-0 p-6 pt-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-medium">
                Trending {trend.trend} by {trend.value} this month
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Showing total visitors for the last 6 months</p>
          </div>
        )}
      </Card>
    )
  },
)
Chart.displayName = "Chart"

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("w-full", className)} {...props} />
  },
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("rounded-lg border bg-background p-2 shadow-md", className)} {...props} />
  },
)
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = () => null

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent }

