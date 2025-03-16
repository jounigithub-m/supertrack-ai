"use client"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

interface BarChartProps {
  data: any[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  showLegend?: boolean
  showGridLines?: boolean
  startEndOnly?: boolean
  className?: string
}

export function BarChart({
  data,
  index,
  categories,
  colors = ["primary"],
  valueFormatter = (value) => value.toString(),
  showLegend = true,
  showGridLines = true,
  startEndOnly = false,
  className,
}: BarChartProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 24 }}>
          {showGridLines && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(243 244 246)" opacity={0.8} />
          )}
          <XAxis
            dataKey={index}
            tick={{ fontSize: 12, fill: "rgb(107 114 128)" }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={
              startEndOnly ? (value, index) => (index === 0 || index === data.length - 1 ? value : "") : undefined
            }
          />
          <YAxis
            tick={{ fontSize: 12, fill: "rgb(107 114 128)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => valueFormatter(value)}
            width={50}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null

              return (
                <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-sm">
                  <div className="font-medium text-gray-900">{label}</div>
                  {payload.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600">{item.name}:</span>
                      <span className="font-medium text-gray-900">{valueFormatter(item.value as number)}</span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              barSize={40}
              name={category.charAt(0).toUpperCase() + category.slice(1)}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

