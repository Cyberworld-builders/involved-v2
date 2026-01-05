import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

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
      // Successfully authenticated - redirect to the next URL or dashboard
      // Ensure next is a valid path
      const redirectPath = next.startsWith('/') ? next : `/${next}`
      console.log('Auth callback successful, redirecting to:', redirectPath)
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    } else {
      console.error('No session created after code exchange. Data:', data)
      const url = new URL('/auth/login', requestUrl.origin)
      url.searchParams.set('error', 'Failed to create session. Please try again.')
      return NextResponse.redirect(url)
    }
  }

  // No code provided - redirect to login
  console.warn('Auth callback called without code parameter')
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
