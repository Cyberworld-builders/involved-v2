'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClaimAccountPage() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const tokenParam = searchParams.get('token')
      
      if (!tokenParam) {
        setError('Invalid invitation link. No token provided.')
        setLoading(false)
        return
      }

      setToken(tokenParam)

      try {
        const response = await fetch(`/api/auth/claim?token=${tokenParam}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid or expired invitation link')
          setLoading(false)
          return
        }

        if (data.valid && data.profile) {
          setUserProfile(data.profile)
          setLoading(false)
        } else {
          setError('Invalid invitation link')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error validating token:', err)
        setError('Failed to validate invitation. Please try again.')
        setLoading(false)
      }
    }

    validateToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    // Validation
    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)

    try {
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
        setError(data.error || 'Failed to claim account')
        setSubmitting(false)
        return
      }

      // Check if manual sign-in is required
      if (data.requiresManualSignIn) {
        setMessage('Account claimed successfully! Please sign in with your email and password.')
        // Redirect to login page after a moment
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        setMessage('Account claimed successfully! Redirecting to dashboard...')
        // Redirect to dashboard immediately
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Error claiming account:', err)
      setError('An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">Account Claim</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Validating your invitation...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-red-600">Invalid Invitation</CardTitle>
            <CardDescription className="text-center text-gray-600">
              This invitation link is not valid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Go to Login
              </Button>
              <Link 
                href="/"
                className="text-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">Claim Your Account</CardTitle>
            <CardDescription className="text-center text-gray-600">
              {userProfile && (
                <span>
                  Welcome, <strong>{userProfile.name}</strong>! Set your password to complete your account setup.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userProfile && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> {userProfile.email}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Enter your password (min. 8 characters)"
                  disabled={submitting}
                />
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

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {message && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{message}</p>
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

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
