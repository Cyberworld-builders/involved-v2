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
        // Supabase magic links use hash fragments (#access_token=...)
        // The Supabase client automatically handles these when getSession() is called
        // Check if we have a session (which means the hash fragments were processed)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Error getting session:', sessionError)
          setStatus('error')
          setMessage('Failed to authenticate. Please try requesting a new login link.')
          return
        }

        if (session) {
          // Successfully authenticated
          setStatus('success')
          setMessage('Successfully logged in! Redirecting to dashboard...')
          
          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          // No session - check if there are hash fragments in the URL
          // If hash fragments exist, Supabase should process them on next getSession call
          // Wait a moment and try again
          setTimeout(async () => {
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession()
            
            if (retryError) {
              setStatus('error')
              setMessage('Failed to authenticate. Please try requesting a new login link.')
            } else if (retrySession) {
              setStatus('success')
              setMessage('Successfully logged in! Redirecting to dashboard...')
              setTimeout(() => {
                router.push('/dashboard')
              }, 1500)
            } else {
              setStatus('error')
              setMessage('No authentication tokens found. The link may have expired. Please request a new login link.')
            }
          }, 500)
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
