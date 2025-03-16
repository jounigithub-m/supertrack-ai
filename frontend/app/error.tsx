'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        We apologize for the inconvenience. Please try again or contact support if the problem persists.
      </p>
      <Button 
        onClick={reset}
        className="bg-[#0055FF] hover:bg-[#0044CC] text-white"
      >
        Try again
      </Button>
    </div>
  )
} 