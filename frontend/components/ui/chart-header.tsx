"use client"

import { cn } from "@/lib/utils"
import { Star, Settings2, Download, Expand, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface ChartHeaderProps {
  title: string
  onAddToDashboard?: (dashboardId: string) => void
  onCreateDashboard?: (name: string) => void
  onDelete?: () => void
  onExpand?: () => void
  onDownload?: () => void
  isDashboard?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

const colorThemes = [
  { name: "Default", value: "default" },
  { name: "Blue", value: "blue" },
  { name: "Green", value: "green" },
  { name: "Purple", value: "purple" },
]

export function ChartHeader({
  title,
  onAddToDashboard,
  onCreateDashboard,
  onDelete,
  onExpand,
  onDownload,
  isDashboard,
  isFavorite,
  onToggleFavorite,
}: ChartHeaderProps) {
  const [isNewDashboardDialogOpen, setIsNewDashboardDialogOpen] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState("")
  const [availableDashboards] = useState([
    { id: "1", name: "Main Dashboard" },
    { id: "2", name: "Sales Overview" },
    { id: "3", name: "Marketing Metrics" },
  ])

  const handleDownload = () => {
    onDownload?.()
    toast({
      title: "Chart Downloaded",
      description: "The chart has been downloaded as PNG.",
    })
  }

  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) return
    onCreateDashboard?.(newDashboardName)
    setNewDashboardName("")
    setIsNewDashboardDialogOpen(false)
    toast({
      title: "Dashboard Created",
      description: `Chart added to new dashboard "${newDashboardName}"`,
    })
  }

  const handleAddToDashboard = (dashboardId: string) => {
    onAddToDashboard?.(dashboardId)
    toast({
      title: "Chart Added",
      description: "The chart has been added to the dashboard.",
    })
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onToggleFavorite}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-current text-yellow-400")} />
          <span className="sr-only">Favorite</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Color Theme</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {colorThemes.map((theme) => (
                    <DropdownMenuItem key={theme.value}>{theme.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Download</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onExpand}
        >
          <Expand className="h-4 w-4" />
          <span className="sr-only">Expand</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Add to Dashboard</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {availableDashboards.map((dashboard) => (
                    <DropdownMenuItem key={dashboard.id} onClick={() => handleAddToDashboard(dashboard.id)}>
                      {dashboard.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      setIsNewDashboardDialogOpen(true)
                    }}
                  >
                    + Create New Dashboard
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            {isDashboard && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  Delete from Dashboard
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isNewDashboardDialogOpen} onOpenChange={setIsNewDashboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Dashboard name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateDashboard} className="w-full">
              Create and Add Chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

