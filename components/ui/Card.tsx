'use client'

import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  variant?: 'default' | 'gold'
}

export function Card({ children, className, glow = false, variant = 'default' }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-3xl p-6',
        variant === 'default' && 'bg-haven-surface border border-haven-border',
        variant === 'gold'    && 'glass-gold',
        glow && 'shadow-gold-glow-sm',
        'shadow-card',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      {icon && (
        <div className="w-10 h-10 rounded-2xl bg-haven-gold/10 border border-haven-gold/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h2 className="font-semibold text-haven-text text-base leading-tight">{title}</h2>
        {subtitle && <p className="text-haven-muted text-sm mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
