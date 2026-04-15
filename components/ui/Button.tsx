'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'gold',
    size = 'md',
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.1 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-medium rounded-2xl',
        'transition-all duration-200 select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-haven-gold focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        size === 'sm' && 'text-xs px-4 py-2.5',
        size === 'md' && 'text-sm px-6 py-3.5',
        size === 'lg' && 'text-base px-8 py-4',

        variant === 'gold' && [
          'bg-gold-gradient text-haven-bg tracking-wide font-semibold',
          'shadow-gold-glow-sm hover:shadow-gold-glow active:shadow-none',
        ],
        variant === 'ghost' && [
          'border border-haven-border text-haven-muted bg-transparent',
          'hover:border-haven-gold/40 hover:text-haven-text hover:bg-haven-surface',
        ],
        variant === 'danger' && [
          'border border-haven-error/30 text-haven-error bg-haven-error/5',
          'hover:bg-haven-error/10',
        ],

        fullWidth && 'w-full',
        className
      )}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>Please wait…</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  )
})
