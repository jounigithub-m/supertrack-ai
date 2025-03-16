import type * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, ArrowRight, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AIInsightsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  insights: string[]
}

export function AIInsightsCard({ className, insights, ...props }: AIInsightsCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">AI Insights</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
          View all insights
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {insights.map((insight, index) => (
            <li key={index} className="flex gap-3">
              <div className="mt-0.5 bg-primary/10 p-1.5 rounded-full h-fit">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground">{insight}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                    Explore
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5">
                    Dismiss
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

