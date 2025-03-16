"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCwIcon } from "lucide-react"

interface SyncJob {
  id: string
  dataSource: string
  status: "success" | "failed" | "in-progress"
  startTime: string
  endTime: string
  records: number
}

export default function SyncStatusPage() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([
    {
      id: "1",
      dataSource: "Customer Database",
      status: "success",
      startTime: "2023-08-15 09:30:00",
      endTime: "2023-08-15 09:45:00",
      records: 1250,
    },
    {
      id: "2",
      dataSource: "Sales Records",
      status: "failed",
      startTime: "2023-08-14 14:20:00",
      endTime: "2023-08-14 14:22:00",
      records: 0,
    },
    {
      id: "3",
      dataSource: "Support Tickets",
      status: "success",
      startTime: "2023-08-14 10:00:00",
      endTime: "2023-08-14 10:15:00",
      records: 532,
    },
    {
      id: "4",
      dataSource: "HR Documents",
      status: "in-progress",
      startTime: "2023-08-15 11:00:00",
      endTime: "-",
      records: 0,
    },
  ])

  const handleRetry = (jobId: string) => {
    // In a real app, this would trigger a new sync job
    console.log(`Retrying job ${jobId}`)
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1>Sync Status</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Records Synced</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {syncJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.dataSource}</TableCell>
                <TableCell>
                  <Badge
                    variant={job.status === "success" ? "success" : job.status === "failed" ? "destructive" : "outline"}
                    className={
                      job.status === "success"
                        ? "bg-success text-success-foreground"
                        : job.status === "failed"
                          ? "bg-destructive text-destructive-foreground"
                          : ""
                    }
                  >
                    {job.status === "success" ? "Success" : job.status === "failed" ? "Failed" : "In Progress"}
                  </Badge>
                </TableCell>
                <TableCell>{job.startTime}</TableCell>
                <TableCell>{job.endTime}</TableCell>
                <TableCell>{job.records}</TableCell>
                <TableCell>
                  {job.status === "failed" && (
                    <Button variant="outline" size="icon" onClick={() => handleRetry(job.id)}>
                      <RefreshCwIcon className="h-4 w-4" />
                      <span className="sr-only">Retry</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  )
}

