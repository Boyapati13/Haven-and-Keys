import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // HavenKey brand palette — luxury dark gold
        haven: {
          bg:       '#0A0A0B',
          surface:  '#111114',
          border:   '#1E1E24',
          gold:     '#C9A84C',
          'gold-light': '#E2C97E',
          'gold-muted': '#8A6E2F',
          text:     '#F5F0E8',
          muted:    '#8A8A9A',
          success:  '#2DD4BF',
          error:    '#F87171',
          warning:  '#FBBF24',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #E2C97E 50%, #C9A84C 100%)',
        'surface-gradient': 'linear-gradient(180deg, #111114 0%, #0A0A0B 100%)',
        'unlock-glow': 'radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'gold-glow': '0 0 40px rgba(201, 168, 76, 0.2)',
        'gold-glow-sm': '0 0 20px rgba(201, 168, 76, 0.15)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(201, 168, 76, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(201, 168, 76, 0.5)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
