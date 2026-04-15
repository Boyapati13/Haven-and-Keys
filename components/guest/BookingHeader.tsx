'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { SanitizedBookingResponse } from '@/types'

interface BookingHeaderProps {
  booking: SanitizedBookingResponse
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function BookingHeader({ booking }: BookingHeaderProps) {
  const { booking: b, property, guest } = booking

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Hero image */}
      <div className="relative w-full h-52 overflow-hidden rounded-b-[2.5rem]">
        {property.hero_image_url ? (
          <Image
            src={property.hero_image_url}
            alt={property.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-haven-surface to-haven-bg" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-haven-bg via-haven-bg/40 to-transparent" />

        {/* Brand mark */}
        <div className="absolute top-5 left-5">
          <p className="font-display text-sm text-gold-shimmer tracking-widest uppercase">
            HavenKey
          </p>
        </div>
      </div>

      {/* Welcome text */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-haven-text leading-tight">
              Welcome, {guest.first_name}
            </h1>
            <p className="text-haven-gold text-sm mt-0.5 font-medium">{property.name}</p>
          </div>
          <StatusBadge status={b.status} />
        </div>

        {/* Stay details */}
        <div className="flex items-center gap-4 mt-4">
          <StayDetail label="Check-in"  value={formatDate(b.check_in_date)} />
          <div className="w-px h-8 bg-haven-border" />
          <StayDetail label="Check-out" value={formatDate(b.check_out_date)} />
          <div className="w-px h-8 bg-haven-border" />
          <StayDetail
            label="Guests"
            value={`${b.num_guests} ${b.num_guests === 1 ? 'guest' : 'guests'}`}
          />
        </div>

        {property.welcome_message && (
          <p className="text-haven-muted text-sm mt-4 leading-relaxed border-l-2 border-haven-gold/30 pl-3">
            {property.welcome_message}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function StayDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-haven-muted text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-haven-text text-sm font-medium truncate mt-0.5">{value}</p>
    </div>
  )
}
