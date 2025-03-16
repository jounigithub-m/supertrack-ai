"use client"

import { useState } from "react"
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
import { DashboardLayout } from "@/components/dashboard-layout"

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
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                <PlusIcon className="h-4 w-4 mr-2" /> Add Data Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Data Source</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <div className="col-span-3">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {newSource.type
                            ? dataSourceTypes.find((type) => type.value === newSource.type)?.label
                            : "Select type..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search type..." />
                          <CommandEmpty>No type found.</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[300px]">
                              {dataSourceTypes.map((type) => (
                                <CommandItem
                                  key={type.value}
                                  onSelect={() => {
                                    setNewSource({ ...newSource, type: type.value })
                                    setOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newSource.type === type.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {type.label}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="connector" className="text-right">
                    Connection URL
                  </Label>
                  <Input
                    id="connector"
                    value={newSource.connector}
                    onChange={(e) => setNewSource({ ...newSource, connector: e.target.value })}
                    className="col-span-3"
                    placeholder="mongodb://localhost:27017"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateSource} className="bg-[#4F46E5] hover:bg-[#4338CA]">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {dataSourceGroups.map((group) => (
          <Card key={group.type} className="border-gray-200 shadow-sm">
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-pointer"
              onClick={() => toggleGroup(group.type)}
            >
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  {group.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <span className="font-medium">{group.type}</span>
                <Badge variant={getStatusBadgeVariant(getGroupStatus(group.sources)) as any}>
                  {getStatusText(getGroupStatus(group.sources))}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">{group.sources.length} sources</div>
            </div>

            {group.isOpen && (
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {group.sources.map((source) => (
                    <div key={source.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Database className="h-5 w-5 text-gray-500" />
                          <div>
                            <h3 className="font-medium">{source.name}</h3>
                            <div className="text-sm text-gray-500">
                              {source.recordCount.toLocaleString()} records
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(source.status) as any}>
                            {getStatusText(source.status)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSync(source.id)
                            }}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link2 className="h-4 w-4 mr-2" />
                                <span>View connection</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                <span>Sync now</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Last synced: {source.lastSync.timestamp} ({source.lastSync.duration})
                      </div>
                      {source.error && <div className="text-sm text-red-500 mt-1">Error: {source.error}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}

