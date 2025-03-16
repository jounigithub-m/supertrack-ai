import type * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string
  change?: string
  trend?: "up" | "down"
  icon?: React.ReactNode
}

export function StatCard({ className, title, value, change, trend, icon, ...props }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          {icon && (
            <div
              className={cn(
                "p-2 rounded-full",
                trend === "up"
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : trend === "down"
                    ? "bg-rose-100 dark:bg-rose-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30",
              )}
            >
              {icon}
            </div>
          )}
        </div>
        {change && (
          <div className="mt-2 flex items-center">
            <span
              className={cn(
                "text-sm font-medium flex items-center gap-1",
                trend === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trend === "down"
                    ? "text-rose-600 dark:text-rose-400"
                    : "",
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend === "down" ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {change}
            </span>
            <span className="text-sm text-muted-foreground ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

