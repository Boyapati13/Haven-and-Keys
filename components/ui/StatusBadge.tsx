import { clsx } from 'clsx'
import type { BookingStatus } from '@/types'

const STATUS_CONFIG: Record<BookingStatus, { label: string; dot: string; text: string }> = {
  pending:     { label: 'Pending',      dot: 'bg-haven-warning/60',  text: 'text-haven-warning' },
  unpaid:      { label: 'Payment Due',  dot: 'bg-haven-warning',     text: 'text-haven-warning' },
  paid:        { label: 'ID Required',  dot: 'bg-haven-gold',        text: 'text-haven-gold' },
  verified:    { label: 'Verified',     dot: 'bg-haven-success',     text: 'text-haven-success' },
  checked_in:  { label: 'Checked In',  dot: 'bg-haven-success',     text: 'text-haven-success' },
  checked_out: { label: 'Checked Out', dot: 'bg-haven-muted',       text: 'text-haven-muted' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-haven-error',       text: 'text-haven-error' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full',
        'bg-white/5 border border-white/10',
        config.text
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse', config.dot)} />
      {config.label}
    </span>
  )
}
