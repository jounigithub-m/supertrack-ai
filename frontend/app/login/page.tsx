"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Simple validation
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    // Mock login - in a real app, this would call an API
    if (email === "admin@example.com" && password === "password") {
      // Go directly to profile for admin or dashboards for viewer
      router.push("/profile")
    } else {
      setError("Invalid email or password")
    }
  }

  const handleDemoLogin = () => {
    setIsLoading(true)

    // Simulate a brief loading state for better UX
    setTimeout(() => {
      // In a real app, you might set some context or session data here
      router.push("/home") // Redirect to home page for the demo
    }, 500)
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
              />
            </div>
            {error && <p className="text-destructive text-small">{error}</p>}
            <Button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5]">
              Login
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={handleDemoLogin} disabled={isLoading} className="w-full">
              {isLoading ? "Loading..." : "Demo Login (Skip Authentication)"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" asChild>
            <Link href="/signup">Don&apos;t have an account? Sign up</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

