'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Roboto } from "next/font/google"

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
})

export default function GlobalError({
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
    <html lang="en" className={roboto.variable}>
      <body className="min-h-screen bg-white font-roboto">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-10 h-10 rounded-full bg-[#0055FF] flex items-center justify-center text-white font-bold text-xl mb-6">
            D
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong!</h1>
          <p className="text-gray-600 mb-8 text-center max-w-md">
            We apologize for the inconvenience. The application encountered a critical error.
          </p>
          <Button 
            onClick={reset}
            className="bg-[#0055FF] hover:bg-[#0044CC] text-white py-2 px-6 rounded-lg"
          >
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
} 