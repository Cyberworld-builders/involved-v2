'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ConfirmEmailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      const supabase = createClient()

      // Get token_hash and type from URL params (Supabase auth confirmation link format)
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!token_hash || type !== 'email') {
        setStatus('error')
        setMessage(
          'Invalid confirmation link. Please check your email for the correct link.'
        )
        return
      }

      try {
        // Verify the email using Supabase's verifyOtp method
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        })

        if (error) {
          setStatus('error')
          setMessage(error.message || 'Failed to confirm email. The link may have expired.')
        } else {
          setStatus('success')
          setMessage('Your email has been confirmed successfully!')

          // Redirect to login page after 3 seconds (gives user time to read message)
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
        }
      } catch (error) {
        console.error('Email confirmation error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    confirmEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Email Confirmation
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {status === 'loading' && 'Confirming your email address...'}
              {status === 'success' && 'Email confirmed successfully'}
              {status === 'error' && 'Confirmation failed'}
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
                  <p className="text-sm text-gray-600">
                    Redirecting to login in 3 seconds...
                  </p>
                  <Link href="/auth/login">
                    <Button className="mt-4">Continue to Login</Button>
                  </Link>
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
                  <div className="mt-6 space-y-2">
                    <Link href="/auth/signup">
                      <Button variant="outline" className="w-full">
                        Back to Sign Up
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full">
                        Go to Login
                      </Button>
                    </Link>
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

