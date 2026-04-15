'use client'

import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'gold',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.1 }}
      disabled={disabled || loading}
      className={clsx(
        'relative inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-haven-gold',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        // Sizes
        size === 'sm' && 'text-xs px-4 py-2.5 gap-1.5',
        size === 'md' && 'text-sm px-6 py-3.5 gap-2',
        size === 'lg' && 'text-base px-8 py-4 gap-2.5',
        // Variants
        variant === 'gold' && [
          'bg-gold-gradient text-haven-bg tracking-wide',
          'shadow-gold-glow-sm hover:shadow-gold-glow',
        ],
        variant === 'ghost' && [
          'border border-haven-border text-haven-muted',
          'hover:border-haven-gold/40 hover:text-haven-text',
        ],
        variant === 'danger' && [
          'bg-haven-error/10 border border-haven-error/30 text-haven-error',
          'hover:bg-haven-error/20',
        ],
        fullWidth && 'w-full',
        className
      )}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}
