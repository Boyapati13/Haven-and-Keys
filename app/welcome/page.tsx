'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { GuestPortal } from '@/components/guest/GuestPortal'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import type { SanitizedBookingResponse, BookingStatus } from '@/types'

export default function WelcomePage() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token')
  const paymentParam = searchParams.get('payment')
  const tabParam     = searchParams.get('tab')

  const [booking, setBooking]   = useState<SanitizedBookingResponse | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  const fetchBooking = useCallback(async () => {
    if (!token) {
      setError('No check-in link detected. Please use the link sent to your WhatsApp.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/guest/booking?token=${token}`, {
        cache: 'no-store',
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Unable to load your booking.')
        return
      }

      setBooking(data as SanitizedBookingResponse)
    } catch {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  // After Stripe payment redirect, re-poll status to pick up the state change
  const pollStatusAfterPayment = useCallback(async () => {
    if (!token || paymentParam !== 'success') return

    // Poll up to 10 times with 2s intervals waiting for the Stripe webhook to land
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      try {
        const res  = await fetch(`/api/guest/status?token=${token}`, { cache: 'no-store' })
        const data = await res.json()
        if (res.ok && (data.status as BookingStatus) !== 'unpaid') {
          // State has advanced — refresh the full booking
          await fetchBooking()
          return
        }
      } catch { /* continue polling */ }
    }
    // After max retries, just refresh normally
    await fetchBooking()
  }, [token, paymentParam, fetchBooking])

  useEffect(() => {
    if (paymentParam === 'success') {
      pollStatusAfterPayment()
    } else {
      fetchBooking()
    }
  }, [fetchBooking, pollStatusAfterPayment, paymentParam])

  if (loading) {
    return <LoadingScreen message="Preparing your experience..." />
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full border border-haven-error/30 flex items-center justify-center mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="font-display text-2xl text-haven-text mb-3">Link Unavailable</h1>
        <p className="text-haven-muted text-sm leading-relaxed max-w-sm">
          {error ?? 'This link could not be found. Please use the original link sent to your WhatsApp.'}
        </p>
        <p className="text-haven-muted/50 text-xs mt-8">
          Need help? Contact your host directly.
        </p>
      </div>
    )
  }

  return (
    <GuestPortal
      token={token!}
      initialBooking={booking}
      defaultTab={tabParam === 'concierge' ? 'concierge' : 'checkin'}
      onRefresh={fetchBooking}
    />
  )
}
