import { Suspense } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { WelcomeContent } from './WelcomeContent'

/**
 * Server component wrapper.
 * useSearchParams() in WelcomeContent requires a Suspense boundary.
 */
export default function WelcomePage() {
  return (
    <Suspense fallback={<LoadingScreen message="Preparing your experience..." />}>
      <WelcomeContent />
    </Suspense>
  )
}
