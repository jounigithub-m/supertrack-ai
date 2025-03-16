"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [personalization, setPersonalization] = useState({
    role: "Marketing Manager",
    goals: "Optimize ad campaigns and improve conversion rates",
    customInstructions: "Focus on ROI metrics, I work in tech industry",
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleSave = () => {
    setIsLoading(true)

    // Simulate API call to save personalization settings
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Settings saved",
        description: "Your personalization settings have been updated.",
      })
    }, 1000)
  }

  return (
    <DashboardLayout userName="John Doe">
      <div className="mb-6"></div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>AI Personalization</CardTitle>
          <CardDescription>
            Provide details about your role, goals, and preferences to help our AI agents better understand your needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Textarea
              id="role"
              placeholder="e.g., Marketing Manager, Sales Director, Support Lead"
              value={personalization.role}
              onChange={(e) => setPersonalization({ ...personalization, role: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Your Goals</Label>
            <Textarea
              id="goals"
              placeholder="e.g., Optimize ad campaigns, Improve customer retention"
              value={personalization.goals}
              onChange={(e) => setPersonalization({ ...personalization, goals: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customInstructions">Custom Instructions</Label>
            <Textarea
              id="customInstructions"
              placeholder="e.g., Focus on ROI metrics, Prefer visual data, Always include market trends"
              value={personalization.customInstructions}
              onChange={(e) => setPersonalization({ ...personalization, customInstructions: e.target.value })}
              className="min-h-[120px]"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </DashboardLayout>
  )
}

