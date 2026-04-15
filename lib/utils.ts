import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely, resolving conflicts via tailwind-merge */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a money amount from cents to a locale string */
export function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/** Format a YYYY-MM-DD date string for display */
export function formatStayDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Extract first name from a full name string */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}
