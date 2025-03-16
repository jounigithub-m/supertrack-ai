import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl mb-6">
        404
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div className="flex gap-4">
        <Button asChild className="bg-[#0055FF] hover:bg-[#0044CC] text-white">
          <Link href="/">
            Go home
          </Link>
        </Button>
      </div>
    </div>
  )
} 