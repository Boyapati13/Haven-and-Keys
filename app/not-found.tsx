import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-haven-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full border border-haven-border bg-haven-surface flex items-center justify-center mx-auto mb-8">
        <span className="text-4xl">⌂</span>
      </div>
      <p className="font-display text-gold-shimmer text-sm tracking-widest uppercase mb-4">HavenKey</p>
      <h1 className="font-display text-3xl text-haven-text mb-3">Page not found</h1>
      <p className="text-haven-muted text-sm max-w-xs leading-relaxed">
        This page does not exist. If you received a check-in link, please use it directly.
      </p>
      <Link
        href="/welcome"
        className="mt-8 text-haven-gold/70 text-sm hover:text-haven-gold transition-colors"
      >
        Go to check-in portal →
      </Link>
    </div>
  )
}
