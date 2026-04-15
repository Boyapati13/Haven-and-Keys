import { NextRequest, NextResponse } from 'next/server'

/**
 * Edge middleware — runs before every request.
 *
 * Responsibilities:
 * 1. Ensure /welcome?token= has a correctly formatted token (64-char hex).
 *    Rejects obviously malformed tokens at the edge before they hit the DB.
 * 2. Strip the ?payment= and ?tab= params from the URL after processing
 *    (no-op here — handled client-side to preserve browser history).
 *
 * Note: No DB calls here — edge runtime has restricted APIs.
 * Heavy validation (expiry, revocation) happens in the API routes.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  if (pathname === '/welcome') {
    const token = searchParams.get('token')

    // No token at all — let the page handle the error state gracefully
    if (!token) return NextResponse.next()

    // Token present but malformed — hard reject at the edge
    if (!/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.redirect(new URL('/welcome', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/welcome', '/api/guest/:path*'],
}
