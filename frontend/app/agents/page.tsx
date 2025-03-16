"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Bot, PlusIcon, Database, MessageSquareIcon, PencilIcon, MoreHorizontal, Trash2Icon, Star } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Agent {
  id: string
  name: string
  description: string
  dataSource: string
  lastUpdated: string
  isFavorite: boolean
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "Customer Support Bot",
      description: "Handles customer inquiries using support ticket data",
      dataSource: "Support Tickets DB",
      lastUpdated: "2 hours ago",
      isFavorite: true,
    },
    {
      id: "2",
      name: "Sales Assistant Bot",
      description: "Provides product recommendations and sales information",
      dataSource: "Product Catalog DB",
      lastUpdated: "1 hour ago",
      isFavorite: false,
    },
    {
      id: "3",
      name: "HR Knowledge Bot",
      description: "Answers questions about company policies and procedures",
      dataSource: "HR Documents DB",
      lastUpdated: "3 hours ago",
      isFavorite: true,
    },
    {
      id: "4",
      name: "Marketing Analytics Bot",
      description: "Analyzes marketing campaign performance and provides optimization suggestions",
      dataSource: "Marketing Data",
      lastUpdated: "1 hour ago",
      isFavorite: true,
    },
    {
      id: "5",
      name: "Sales Forecasting Bot",
      description: "Predicts sales trends and identifies potential opportunities",
      dataSource: "Sales Database",
      lastUpdated: "30 minutes ago",
      isFavorite: true,
    },
    {
      id: "6",
      name: "Customer Insights Bot",
      description: "Analyzes customer behavior and provides personalized recommendations",
      dataSource: "Customer CRM",
      lastUpdated: "2 hours ago",
      isFavorite: true,
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    dataSource: "",
  })

  const handleCreateAgent = () => {
    const agent: Agent = {
      id: Date.now().toString(),
      name: newAgent.name,
      description: newAgent.description,
      dataSource: newAgent.dataSource,
      lastUpdated: "Just now",
      isFavorite: false,
    }

    setAgents([...agents, agent])
    setNewAgent({ name: "", description: "", dataSource: "" })
    setIsDialogOpen(false)
  }

  const handleEditAgent = (agentId: string) => {
    // In a real app, this would open an edit dialog or navigate to an edit page
    console.log(`Editing agent ${agentId}`)
  }

  const handleDeleteAgent = (agentId: string) => {
    setAgents(agents.filter((agent) => agent.id !== agentId))
  }

  const toggleFavorite = (agentId: string) => {
    setAgents(agents.map((agent) => (agent.id === agentId ? { ...agent, isFavorite: !agent.isFavorite } : agent)))
  }

  return (
    <DashboardLayout userName="John Doe">
      <div className="mb-6 flex justify-end items-center">
        {/* Remove or comment out this line: */}
        {/* <span className="text-sm font-medium">Agents</span> */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5]">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataSource">Data Source</Label>
                <Input
                  id="dataSource"
                  value={newAgent.dataSource}
                  onChange={(e) => setNewAgent({ ...newAgent, dataSource: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateAgent} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                Create Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className="overflow-hidden border border-border/40 bg-background hover:border-border transition-colors"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Bot className="h-5 w-5 text-foreground" />
                  </div>
                  <h2 className="text-lg font-medium">{agent.name}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${agent.isFavorite ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleFavorite(agent.id)}
                  >
                    <Star className={`h-4 w-4 ${agent.isFavorite ? "fill-current" : ""}`} />
                    <span className="sr-only">{agent.isFavorite ? "Remove from favorites" : "Add to favorites"}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleEditAgent(agent.id)}>
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteAgent(agent.id)} className="text-destructive">
                        <Trash2Icon className="h-4 w-4 mr-2" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">{agent.description}</p>

              <div className="flex items-center text-xs text-muted-foreground mb-6">
                <Database className="h-3.5 w-3.5 mr-1.5" />
                <span>{agent.dataSource}</span>
                <span className="mx-1.5">•</span>
                <span>Updated {agent.lastUpdated}</span>
              </div>

              <div>
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 bg-[#6366f1] hover:bg-[#4f46e5]"
                  onClick={() => (window.location.href = `/chat/${agent.id}`)}
                >
                  <MessageSquareIcon className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}

