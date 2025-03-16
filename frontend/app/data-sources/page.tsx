"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Database,
  PlusIcon,
  RefreshCcw,
  Link2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DataSource {
  id: string
  name: string
  type: string
  recordCount: number
  status: "connected" | "error" | "syncing"
  lastSync: {
    timestamp: string
    duration: string
  }
  error?: string
}

// Group data sources by type
interface DataSourceGroup {
  type: string
  sources: DataSource[]
  isOpen: boolean
}

export default function DataSourcesPage() {
  const [dataSources] = useState<DataSource[]>([
    {
      id: "1",
      name: "Customer Database",
      type: "MongoDB",
      recordCount: 24532,
      status: "connected",
      lastSync: {
        timestamp: "10 minutes ago",
        duration: "2m 30s",
      },
    },
    {
      id: "2",
      name: "Sales API",
      type: "REST API",
      recordCount: 8721,
      status: "connected",
      lastSync: {
        timestamp: "1 hour ago",
        duration: "5m 15s",
      },
    },
    {
      id: "3",
      name: "Product Inventory",
      type: "MongoDB",
      recordCount: 1254,
      status: "connected",
      lastSync: {
        timestamp: "30 minutes ago",
        duration: "1m 45s",
      },
    },
    {
      id: "4",
      name: "Marketing Analytics",
      type: "CSV Import",
      recordCount: 0,
      status: "error",
      lastSync: {
        timestamp: "2 hours ago",
        duration: "failed",
      },
      error: "Connection timeout",
    },
    {
      id: "5",
      name: "User Profiles",
      type: "MongoDB",
      recordCount: 15678,
      status: "connected",
      lastSync: {
        timestamp: "45 minutes ago",
        duration: "3m 10s",
      },
    },
    {
      id: "6",
      name: "Sales Forecasting",
      type: "REST API",
      recordCount: 3421,
      status: "connected",
      lastSync: {
        timestamp: "2 hours ago",
        duration: "1m 30s",
      },
    },
    {
      id: "7",
      name: "Customer Feedback",
      type: "CSV Import",
      recordCount: 2145,
      status: "connected",
      lastSync: {
        timestamp: "3 hours ago",
        duration: "1m 15s",
      },
    },
  ])

  // Group data sources by type
  const [dataSourceGroups, setDataSourceGroups] = useState<DataSourceGroup[]>(() => {
    const groupMap: Record<string, DataSource[]> = {}

    // Group data sources by type
    dataSources.forEach((source) => {
      if (!groupMap[source.type]) {
        groupMap[source.type] = []
      }
      groupMap[source.type].push(source)
    })

    // Convert to array of groups
    return Object.entries(groupMap).map(([type, sources]) => ({
      type,
      sources,
      isOpen: true, // Initially expanded
    }))
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSource, setNewSource] = useState({
    name: "",
    type: "",
    connector: "",
  })

  const dataSourceTypes = [
    { value: "mongodb", label: "MongoDB" },
    { value: "postgresql", label: "PostgreSQL" },
    { value: "mysql", label: "MySQL" },
    { value: "sqlserver", label: "SQL Server" },
    { value: "oracle", label: "Oracle Database" },
    { value: "dynamodb", label: "Amazon DynamoDB" },
    { value: "cosmosdb", label: "Azure Cosmos DB" },
    { value: "firestore", label: "Google Firestore" },
    { value: "elasticsearch", label: "Elasticsearch" },
    { value: "redis", label: "Redis" },
    { value: "cassandra", label: "Apache Cassandra" },
    { value: "neo4j", label: "Neo4j" },
    { value: "snowflake", label: "Snowflake" },
    { value: "bigquery", label: "Google BigQuery" },
    { value: "redshift", label: "Amazon Redshift" },
    { value: "rest", label: "REST API" },
    { value: "graphql", label: "GraphQL API" },
    { value: "soap", label: "SOAP API" },
    { value: "csv", label: "CSV Import" },
    { value: "excel", label: "Excel Import" },
    { value: "json", label: "JSON Import" },
    { value: "xml", label: "XML Import" },
    { value: "s3", label: "Amazon S3" },
    { value: "blob", label: "Azure Blob Storage" },
    { value: "gcs", label: "Google Cloud Storage" },
    { value: "sftp", label: "SFTP" },
    { value: "kafka", label: "Apache Kafka" },
    { value: "rabbitmq", label: "RabbitMQ" },
    { value: "activemq", label: "ActiveMQ" },
    { value: "sqs", label: "Amazon SQS" },
  ]

  const handleCreateSource = () => {
    // In a real app, this would create a new data source
    setIsDialogOpen(false)
  }

  const handleSync = (sourceId: string) => {
    // In a real app, this would trigger a sync
    const updatedGroups = dataSourceGroups.map((group) => {
      const updatedSources = group.sources.map((source) =>
        source.id === sourceId ? { ...source, status: "syncing" as const } : source,
      )
      return { ...group, sources: updatedSources }
    })

    setDataSourceGroups(updatedGroups)
  }

  const toggleGroup = (groupType: string) => {
    setDataSourceGroups(
      dataSourceGroups.map((group) => (group.type === groupType ? { ...group, isOpen: !group.isOpen } : group)),
    )
  }

  const getStatusBadgeVariant = (status: DataSource["status"]) => {
    switch (status) {
      case "connected":
        return "success"
      case "error":
        return "destructive"
      case "syncing":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusText = (status: DataSource["status"]) => {
    switch (status) {
      case "connected":
        return "Connected"
      case "error":
        return "Error"
      case "syncing":
        return "Syncing..."
      default:
        return status
    }
  }

  // Calculate group status (error if any source has error, syncing if any is syncing, otherwise connected)
  const getGroupStatus = (sources: DataSource[]) => {
    if (sources.some((source) => source.status === "error")) return "error"
    if (sources.some((source) => source.status === "syncing")) return "syncing"
    return "connected"
  }

  const [open, setOpen] = useState(false)

  return (
    <DashboardLayout userName="John Doe">
      <div className="mb-6">
        <div className="flex justify-end items-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="h-9 bg-[#6366f1] hover:bg-[#4f46e5]">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Data Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Data Source</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Source Name</Label>
                  <Input
                    id="name"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Source Type</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {newSource.type
                          ? dataSourceTypes.find((type) => type.value === newSource.type)?.label
                          : "Select type..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search data source type..." />
                        <CommandList>
                          <CommandEmpty>No data source type found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {dataSourceTypes.map((type) => (
                              <CommandItem
                                key={type.value}
                                value={type.value}
                                onSelect={(currentValue) => {
                                  setNewSource({ ...newSource, type: currentValue })
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newSource.type === type.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {type.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleCreateSource} className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
                  Add Source
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {dataSourceGroups.map((group) => {
          const groupStatus = getGroupStatus(group.sources)

          return (
            <div key={group.type} className="border rounded-lg overflow-hidden shadow-sm">
              {/* Group Header */}
              <div
                className="flex items-center justify-between cursor-pointer p-4 bg-background hover:bg-muted/50 transition-colors"
                onClick={() => toggleGroup(group.type)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-secondary rounded-md p-1.5">
                    {group.isOpen ? (
                      <ChevronDown className="h-4 w-4 text-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-foreground" />
                    )}
                  </div>
                  <h2 className="text-lg font-medium">{group.type}</h2>
                  <Badge variant={getStatusBadgeVariant(groupStatus as DataSource["status"])} className="ml-2">
                    {getStatusText(groupStatus as DataSource["status"])}
                  </Badge>
                  <span className="text-sm text-muted-foreground ml-2">
                    {group.sources.length} connection{group.sources.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Group Content */}
              <div className={cn("p-4 space-y-4 bg-background", !group.isOpen && "hidden")}>
                {group.sources.map((source) => (
                  <Card
                    key={source.id}
                    className="overflow-hidden border border-border/40 bg-white dark:bg-gray-900 hover:border-border transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Left section: Icon and source details */}
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-secondary rounded-lg mt-1">
                            <Database className="h-5 w-5 text-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-lg font-medium">{source.name}</h2>
                              <Badge variant={getStatusBadgeVariant(source.status)} className="whitespace-nowrap">
                                {getStatusText(source.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {source.recordCount.toLocaleString()} records
                            </p>
                            {source.status === "error" && source.error && (
                              <p className="mt-1 text-sm text-destructive">Error: {source.error}</p>
                            )}
                          </div>
                        </div>

                        {/* Right section: Sync info and actions */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end text-sm text-muted-foreground">
                            <div>Updated {source.lastSync.timestamp}</div>
                            <div>Duration: {source.lastSync.duration}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSync(source.id)}
                              disabled={source.status === "syncing"}
                            >
                              <RefreshCcw className="h-4 w-4" />
                              <span className="sr-only">Sync</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Link2 className="h-4 w-4" />
                              <span className="sr-only">View connection</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit connection</DropdownMenuItem>
                                <DropdownMenuItem>View sync history</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Remove source</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}

