'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ClaimAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const validateToken = async () => {
      const inviteToken = searchParams.get('token')

      if (!inviteToken || inviteToken.length !== 64) {
        setStatus('error')
        setMessage('Invalid or missing invite link. Please check your email for the correct link.')
        return
      }

      setToken(inviteToken)

      try {
        // Validate token with backend
        const response = await fetch(`/api/auth/claim/validate?token=${inviteToken}`)
        const data = await response.json()

        if (!response.ok || !data.valid) {
          setStatus('error')
          setMessage(data.message || 'This invite link is invalid or has expired.')
          return
        }

        // Token is valid, show password form
        setUserEmail(data.email)
        setStatus('ready')
      } catch (error) {
        console.error('Token validation error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred while validating your invite.')
      }
    }

    validateToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      // Claim the account
      const response = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Failed to claim account. Please try again.')
        setSubmitting(false)
        return
      }

      // Sign in the user with Supabase
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail!,
        password,
      })

      if (signInError) {
        console.error('Sign in error:', signInError)
        setStatus('success')
        setMessage('Account claimed successfully! Please sign in with your credentials.')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      } else {
        setStatus('success')
        setMessage('Account claimed successfully! Redirecting to dashboard...')
        
        // Redirect to dashboard immediately
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      }
    } catch (error) {
      console.error('Account claim error:', error)
      setMessage('An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">
              Claim Your Account
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {status === 'loading' && 'Validating your invite...'}
              {status === 'ready' && 'Set up your password to complete account setup'}
              {status === 'success' && 'Account claimed successfully'}
              {status === 'error' && 'Unable to claim account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {status === 'loading' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="text-sm text-gray-600">Please wait...</p>
                </div>
              )}

              {status === 'ready' && (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={userEmail || ''}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your password"
                      disabled={submitting}
                    />
                    <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Confirm your password"
                      disabled={submitting}
                    />
                  </div>

                  {message && (
                    <div className="text-sm text-red-600">
                      {message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Claiming Account...' : 'Claim Account'}
                  </Button>
                </form>
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
                  <Link href="/dashboard">
                    <Button className="mt-4">
                      Go to Dashboard
                    </Button>
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
