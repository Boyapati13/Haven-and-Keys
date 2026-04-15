import { redirect } from 'next/navigation'

// Root route — redirect to welcome with no token
// In production this would be a marketing landing page
export default function HomePage() {
  redirect('/welcome')
}
