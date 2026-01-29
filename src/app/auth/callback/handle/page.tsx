'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function HandleMagicLinkClient() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleMagicLink = async () => {
      const supabase = createClient()

      try {
        // Check if there are hash fragments in the URL
        const hash = window.location.hash
        const hasHashFragments = hash && hash.length > 1

        console.log('Hash fragments in URL:', hasHashFragments ? 'Yes' : 'No', hash.substring(0, 100))

        if (!hasHashFragments) {
          setStatus('error')
          setMessage('No authentication tokens found. Please request a new login link.')
          return
        }

        // Parse hash fragments manually
        // Format: #access_token=...&refresh_token=...&expires_in=...
        const hashParams = new URLSearchParams(hash.substring(1)) // Remove the #
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        hashParams.get('expires_in')
        hashParams.get('type')

        if (!accessToken) {
          setStatus('error')
          setMessage('Invalid authentication token format. Please request a new login link.')
          return
        }

        // Set up auth state change listener to catch when session is set
        let sessionFound = false
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event, session ? 'Session exists' : 'No session')
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && !sessionFound) {
            sessionFound = true
            subscription.unsubscribe()
            setStatus('success')
            setMessage('Successfully logged in! Redirecting to dashboard...')
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          }
        })

        // Set the session using setSession method
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (setSessionError) {
          console.error('Error setting session:', setSessionError)
          subscription.unsubscribe()
          setStatus('error')
          setMessage('Failed to authenticate. Please try requesting a new login link.')
          return
        }

        if (sessionData?.session) {
          sessionFound = true
          subscription.unsubscribe()
          setStatus('success')
          setMessage('Successfully logged in! Redirecting to dashboard...')
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          // Wait a moment for auth state change to fire
          setTimeout(() => {
            if (!sessionFound) {
              subscription.unsubscribe()
              setStatus('error')
              setMessage('Failed to create session. Please try requesting a new login link.')
            }
          }, 2000)
        }

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Magic link handling error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleMagicLink()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Verifying Login
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {status === 'loading' && 'Verifying your magic link...'}
              {status === 'success' && 'Login successful'}
              {status === 'error' && 'Verification failed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {status === 'loading' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                  <p className="text-sm text-gray-600">Please wait...</p>
                </div>
              )}

              {status === 'success' && (
                <div className="flex flex-col items-center space-y-4">
                  <svg
                    className="h-16 w-16 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-green-600">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="flex flex-col items-center space-y-4">
                  <svg
                    className="h-16 w-16 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-600">{message}</p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push('/auth/login')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Go to Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function HandleMagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    }>
      <HandleMagicLinkClient />
    </Suspense>
  )
}
