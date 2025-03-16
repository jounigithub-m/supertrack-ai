"use client"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center">
      <h1 className="text-2xl font-bold mb-4">MultiTenant DataSync AI</h1>
      <p className="text-body max-w-md mb-8 line-height-normal">
        A powerful platform that syncs enterprise data to power topic-specific AI agents. Streamline your data
        management and create intelligent agents tailored to your business needs.
      </p>
      <div className="flex gap-4">
        <Button
          className="rounded-md bg-[#6366f1] hover:bg-[#4f46e5] text-white"
          onClick={() => (window.location.href = "/signup")}
        >
          Sign Up
        </Button>
        <Button
          variant="outline"
          className="text-[#6366f1] border-[#6366f1] hover:bg-[#6366f1]/10"
          onClick={() => (window.location.href = "/login")}
        >
          Login
        </Button>
      </div>
    </div>
  )
}

