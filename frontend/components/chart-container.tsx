"use client"

import type React from "react"

import { ChartHeader } from "@/components/ui/chart-header"
import { cn } from "@/lib/utils"

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  children: React.ReactNode
  onAddToDashboard?: (dashboardId: string) => void
  onCreateDashboard?: (name: string) => void
  onDelete?: () => void
  onExpand?: () => void
  isDashboard?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export function ChartContainer({
  title,
  description,
  children,
  className,
  onAddToDashboard,
  onCreateDashboard,
  onDelete,
  onExpand,
  isDashboard,
  isFavorite,
  onToggleFavorite,
  ...props
}: ChartContainerProps) {
  const handleDownload = () => {
    // Implementation for downloading chart as PNG
    // This would need to be implemented based on the chart library being used
  }

  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props}>
      <div className="p-6">
        <ChartHeader
          title={title}
          onAddToDashboard={onAddToDashboard}
          onCreateDashboard={onCreateDashboard}
          onDelete={onDelete}
          onExpand={onExpand}
          onDownload={handleDownload}
          isDashboard={isDashboard}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
        <div className="mt-4">{children}</div>
        {description && <p className="mt-4 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

