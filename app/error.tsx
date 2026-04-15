'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[HavenKey] Unhandled error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-haven-bg text-haven-text antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full border border-haven-error/30 bg-haven-surface flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl">⚠</span>
          </div>
          <h1 className="font-display text-2xl text-haven-text mb-3">Something went wrong</h1>
          <p className="text-haven-muted text-sm max-w-xs leading-relaxed mb-8">
            An unexpected error occurred. Please try refreshing the page or using your original check-in link again.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-2xl bg-haven-gold/15 border border-haven-gold/30 text-haven-gold text-sm font-medium hover:bg-haven-gold/25 transition-colors"
          >
            Try again
          </button>
          {error.digest && (
            <p className="text-haven-muted/30 text-xs mt-6">Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  )
}
