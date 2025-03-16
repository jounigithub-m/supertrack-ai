"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon, PlusIcon, Mic, PinIcon, Maximize2, Minimize2, ChevronLeft, X } from "lucide-react"
import { BarChart } from "@/components/ui/bar-chart"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import { ChartContainer } from "@/components/ui/chart-container"

interface Message {
  id: string
  content: string
  sender: "user" | "agent"
  timestamp: string
  chart?: boolean
  canvas?: CanvasContent | null
}

interface CanvasContent {
  type: "dashboard" | "document" | "report"
  title: string
  widgets: CanvasWidget[]
}

interface CanvasWidget {
  id: string
  type: "stat" | "bar-chart" | "line-chart" | "area-chart" | "pie-chart" | "document"
  title: string
  data: any
  width: "full" | "half" | "third"
  height?: number
}

// Sample sales data for the chart
const salesData = [
  { month: "Apr", sales: 65000 },
  { month: "May", sales: 59000 },
  { month: "Jun", sales: 80000 },
  { month: "Jul", sales: 81000 },
  { month: "Aug", sales: 56000 },
  { month: "Sep", sales: 55000 },
  { month: "Oct", sales: 40000 },
  { month: "Nov", sales: 72000 },
  { month: "Dec", sales: 89000 },
  { month: "Jan", sales: 91000 },
  { month: "Feb", sales: 86000 },
  { month: "Mar", sales: 99000 },
]

// Sample visitor data
const visitorData = [
  { month: "Jan", visitors: 1200 },
  { month: "Feb", visitors: 1900 },
  { month: "Mar", visitors: 2100 },
  { month: "Apr", visitors: 2400 },
  { month: "May", visitors: 1800 },
  { month: "Jun", visitors: 2800 },
  { month: "Jul", visitors: 3200 },
]

export default function ChatPage() {
  const params = useParams()
  const agentId = params.agentId as string
  const [agentName, setAgentName] = useState("Sales Analytics Agent")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: `Hello! I'm the ${agentName}. How can I help you today?`,
      sender: "agent",
      timestamp: new Date().toISOString(),
      canvas: null,
    },
  ])
  const [isCanvasOpen, setIsCanvasOpen] = useState(false)
  const [activeCanvas, setActiveCanvas] = useState<CanvasContent | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch agent details based on agentId
    // This is a mock implementation
    if (agentId === "1") {
      setAgentName("Customer Support Agent")
    } else if (agentId === "2") {
      setAgentName("Sales Analytics Agent")
    } else if (agentId === "3") {
      setAgentName("HR Knowledge Base")
    }
  }, [agentId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
      canvas: null,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate agent response after a short delay
    setTimeout(() => {
      // Check if the message contains keywords related to dashboards or reports
      if (
        input.toLowerCase().includes("dashboard") ||
        input.toLowerCase().includes("report") ||
        input.toLowerCase().includes("sales data") ||
        input.toLowerCase().includes("analytics")
      ) {
        const salesDashboard: CanvasContent = {
          type: "dashboard",
          title: "Sales Performance Dashboard",
          widgets: [
            {
              id: "stat1",
              type: "stat",
              title: "Total Revenue",
              data: { value: "$124,592", change: "+12.5%", trend: "up" },
              width: "third",
            },
            {
              id: "stat2",
              type: "stat",
              title: "New Customers",
              data: { value: "1,294", change: "+5.2%", trend: "up" },
              width: "third",
            },
            {
              id: "stat3",
              type: "stat",
              title: "Conversion Rate",
              data: { value: "3.2%", change: "-0.4%", trend: "down" },
              width: "third",
            },
            {
              id: "chart1",
              type: "bar-chart",
              title: "Monthly Sales",
              data: salesData,
              width: "half",
              height: 300,
            },
            {
              id: "chart2",
              type: "bar-chart",
              title: "Monthly Visitors",
              data: visitorData,
              width: "half",
              height: 300,
            },
          ],
        }

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Here's the sales performance dashboard you requested. It shows key metrics including total revenue, new customers, conversion rate, and monthly sales data. The data indicates a strong performance in Q1 with March being our best month at $99,000 in sales.

I've added this dashboard to our conversation. You can click on this message anytime to reopen the dashboard view.

Would you like me to explain any specific part of this dashboard in more detail?`,
          sender: "agent",
          timestamp: new Date().toISOString(),
          canvas: salesDashboard,
        }

        setMessages((prev) => [...prev, agentMessage])
        setActiveCanvas(salesDashboard)
        setIsCanvasOpen(true)
      } else if (input.toLowerCase().includes("sales") || input.toLowerCase().includes("revenue")) {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Here's the sales data for the rolling 12 months:

Our sales have been trending upward over the past year, with a particularly strong performance in Q1 of this year. March was our best month with $99,000 in sales, which represents a 52% increase compared to our lowest month (October) at $40,000.

Notable trends:
- Q4 showed significant recovery after a dip in October
- Q1 has been consistently strong, with all months above $85,000
- Summer months (Jun-Jul) also performed well last year

Would you like me to create a dashboard to visualize this data?`,
          sender: "agent",
          timestamp: new Date().toISOString(),
          chart: true,
        }

        setMessages((prev) => [...prev, agentMessage])
      } else {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `This is a simulated response from the ${agentName}. In a real application, this would be generated by an AI model based on your query and the agent's knowledge base.`,
          sender: "agent",
          timestamp: new Date().toISOString(),
          canvas: null,
        }

        setMessages((prev) => [...prev, agentMessage])
      }
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handlePinMessage = (messageId: string) => {
    // In a real app, this would pin the message to a dashboard
    console.log(`Pinning message ${messageId} to dashboard`)
  }

  const toggleCanvas = () => {
    // Store the current scroll position before toggling
    const scrollPosition = chatContainerRef.current?.scrollTop || 0

    setIsCanvasOpen(!isCanvasOpen)

    // Use setTimeout to restore scroll position after the state update and re-render
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = scrollPosition
      }
    }, 0)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleAddToDashboard = (messageId: string, dashboardId: string) => {
    console.log(`Adding message ${messageId} to dashboard ${dashboardId}`)
  }

  const handleCreateDashboard = (messageId: string, name: string) => {
    console.log(`Creating dashboard ${name} with message ${messageId}`)
  }

  const handleExpandChart = (messageId: string) => {
    console.log(`Expanding chart for message ${messageId}`)
  }

  return (
    <DashboardLayout userName="John Doe" agentName={agentName}>
      <div
        className={cn(
          "flex transition-all duration-300 fixed right-0 bottom-0 top-14 bg-background",
          isFullscreen ? "h-screen fixed inset-0 z-50" : "",
          isCanvasOpen ? "left-[var(--sidebar-width)]" : "left-0",
        )}
        style={{ height: "calc(100vh - 3.5rem)" }}
      >
        {/* Canvas Section - Now on the left */}
        {isCanvasOpen && activeCanvas && (
          <div className="w-2/3 p-4 overflow-auto h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{activeCanvas.title}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-9 w-9">
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  <span className="sr-only">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </Button>
                <Button variant="outline" size="icon" onClick={toggleCanvas} className="h-9 w-9">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close Canvas</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {activeCanvas.widgets.map((widget) => {
                const colSpan =
                  widget.width === "full" ? "col-span-12" : widget.width === "half" ? "col-span-6" : "col-span-4"

                if (widget.type === "stat") {
                  return (
                    <div key={widget.id} className={colSpan}>
                      <StatCard
                        title={widget.title}
                        value={widget.data.value}
                        change={widget.data.change}
                        trend={widget.data.trend}
                      />
                    </div>
                  )
                } else if (widget.type === "bar-chart") {
                  return (
                    <div key={widget.id} className={colSpan}>
                      <Card className="overflow-hidden">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-4">{widget.title}</h3>
                          <div style={{ height: widget.height || 300 }}>
                            <BarChart
                              data={widget.data}
                              index={Object.keys(widget.data[0])[0]}
                              categories={[Object.keys(widget.data[0])[1]]}
                              valueFormatter={(value) =>
                                typeof value === "number" && value > 1000
                                  ? `$${(value / 1000).toFixed(0)}k`
                                  : value.toString()
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                }

                return null
              })}
            </div>
          </div>
        )}

        {/* Chat Section - Now on the right */}
        <div
          className={cn(
            "flex flex-col transition-all duration-300 h-full",
            isCanvasOpen ? "w-1/3 border-l max-w-full" : "w-full max-w-3xl mx-auto",
          )}
        >
          <div className="flex-1 flex flex-col h-full">
            <div className="flex justify-between items-center px-6 py-4">{/* Chat header content */}</div>
            <div className="flex-1 overflow-y-auto p-6" ref={chatContainerRef}>
              {/* Chat messages content */}
              <div className="flex flex-col space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.sender === "user" ? "justify-end" : "justify-center")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg",
                        message.sender === "user" ? "bg-muted/50 p-4 border" : "bg-background p-6",
                        message.canvas ? "cursor-pointer" : "",
                      )}
                      onClick={() => {
                        if (message.canvas) {
                          const scrollPosition = chatContainerRef.current?.scrollTop || 0
                          setActiveCanvas(message.canvas)
                          setIsCanvasOpen(true)
                          setTimeout(() => {
                            if (chatContainerRef.current) {
                              chatContainerRef.current.scrollTop = scrollPosition
                            }
                          }, 0)
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{message.sender === "user" ? "You" : agentName}</span>
                        {message.sender === "agent" && (
                          <div className="flex items-center">
                            {message.canvas && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mr-2">
                                Dashboard
                              </span>
                            )}
                            {!message.canvas && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-2 text-gray-500 hover:text-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePinMessage(message.id)
                                }}
                              >
                                <PinIcon className="h-3 w-3" />
                                <span className="sr-only">Pin to dashboard</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-sm whitespace-pre-wrap",
                          message.sender === "user" ? "text-black" : "text-black",
                        )}
                      >
                        {message.content}

                        {message.chart && !message.canvas && (
                          <div className="mt-6">
                            <ChartContainer
                              title="Monthly Sales Overview"
                              description="This chart shows the monthly sales revenue across all channels. The trend indicates strong growth in Q1 with March being the peak month."
                              onAddToDashboard={(dashboardId) => handleAddToDashboard(message.id, dashboardId)}
                              onCreateDashboard={(name) => handleCreateDashboard(message.id, name)}
                              onExpand={() => handleExpandChart(message.id)}
                            >
                              <BarChart
                                data={salesData}
                                index="month"
                                categories={["sales"]}
                                valueFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                showLegend={false}
                                showGridLines={true}
                                className="h-[300px]"
                              />
                            </ChartContainer>
                          </div>
                        )}

                        {message.canvas && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="text-sm font-medium">{message.canvas.title}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                      <span className={cn("text-xs block mt-2", "text-muted-foreground")}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="border-t p-4 sticky bottom-0 bg-background">
              <div className="relative rounded-lg border shadow-md p-2">
                <div className="relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    className="w-full px-4 py-3 rounded-full border-0 bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-0 pr-10"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#6366f1] hover:bg-[#4f46e5] p-0"
                  >
                    <SendIcon className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <PlusIcon className="h-4 w-4" />
                    </div>
                    <span className="sr-only">Add attachment</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Mic className="h-4 w-4" />
                    </div>
                    <span className="sr-only">Voice input</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

