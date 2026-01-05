import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Supabase magic links use hash fragments (#access_token=...) which are not sent to the server
  // We need to handle this client-side, so redirect to a client component
  const requestUrl = new URL(request.url)
  
  // Check for query parameters (code-based flow)
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
    // Server-side code exchange flow
    const { createClient } = await import('@/lib/supabase/server')
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
      console.log('Auth callback successful, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    } else {
      console.error('No session created after code exchange. Data:', data)
      const url = new URL('/auth/login', requestUrl.origin)
      url.searchParams.set('error', 'Failed to create session. Please try again.')
      return NextResponse.redirect(url)
    }
  }

  // No code parameter - this is likely a hash fragment-based magic link
  // Redirect to client-side handler that can read hash fragments
  const url = new URL('/auth/callback/handle', requestUrl.origin)
  // Preserve any query params that might be there
  requestUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })
  return NextResponse.redirect(url)
}
