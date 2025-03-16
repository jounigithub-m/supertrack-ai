"use client"

import type * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Star, MessageSquareIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  description: string
  dataSource: string
  lastUpdated: string
  isFavorite: boolean
}

interface AgentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  agent: Agent
  onToggleFavorite: (id: string) => void
}

export function AgentCard({ className, agent, onToggleFavorite, ...props }: AgentCardProps) {
  return (
    <Card
      className={cn("overflow-hidden border border-border/40 hover:border-border transition-colors", className)}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium">{agent.name}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${agent.isFavorite ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => onToggleFavorite(agent.id)}
          >
            <Star className={`h-4 w-4 ${agent.isFavorite ? "fill-current" : ""}`} />
            <span className="sr-only">{agent.isFavorite ? "Remove from favorites" : "Add to favorites"}</span>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">{agent.description}</p>

        <div className="flex items-center text-xs text-muted-foreground mb-6">
          <span>{agent.dataSource}</span>
          <span className="mx-1.5">•</span>
          <span>Updated {agent.lastUpdated}</span>
        </div>

        <div>
          <Button asChild variant="default" size="sm" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5] text-white">
            <Link href={`/chat/${agent.id}`}>
              <MessageSquareIcon className="h-4 w-4 mr-2" />
              Chat
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

