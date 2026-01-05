import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  // Log all query parameters for debugging
  const allParams = Object.fromEntries(requestUrl.searchParams.entries())
  console.log('Auth callback received with params:', allParams)

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    const url = new URL('/auth/login', requestUrl.origin)
    url.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(url)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      const url = new URL('/auth/login', requestUrl.origin)
      url.searchParams.set('error', 'Failed to authenticate. Please try requesting a new login link.')
      return NextResponse.redirect(url)
    }

    if (data?.session) {
      // Successfully authenticated - redirect to dashboard
      // Users can access their assignments from there or click the original assignment email link
      console.log('Auth callback successful, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    } else {
      console.error('No session created after code exchange. Data:', data)
      const url = new URL('/auth/login', requestUrl.origin)
      url.searchParams.set('error', 'Failed to create session. Please try again.')
      return NextResponse.redirect(url)
    }
  }

  // Check if there's a token_hash (used by some Supabase auth flows)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  
  if (tokenHash && type === 'magiclink') {
    // This is a magic link with token_hash - we need to verify it client-side
    // Redirect to a client component that can handle this
    const url = new URL('/auth/callback/verify', requestUrl.origin)
    url.searchParams.set('token_hash', tokenHash)
    url.searchParams.set('type', type)
    return NextResponse.redirect(url)
  }

  // No code or token_hash provided - redirect to login
  console.warn('Auth callback called without code or token_hash parameter. All params:', allParams)
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
