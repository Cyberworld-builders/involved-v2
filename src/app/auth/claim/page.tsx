'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const REDIRECT_DELAY_MS = 2000 // 2 seconds before redirect after error
const SUCCESS_REDIRECT_DELAY_MS = 1000 // 1 second before redirect after success

function ClaimPageContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [message, setMessage] = useState('')
  const [inviteValid, setInviteValid] = useState(false)
  const [inviteData, setInviteData] = useState<{ email: string; name: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const supabase = createClient()

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setMessage('No invitation token provided')
        setValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/claim?token=${token}`)
        const data = await response.json()

        if (data.valid) {
          setInviteValid(true)
          setInviteData(data.invite)
        } else {
          setMessage(data.error || 'Invalid invitation link')
        }
      } catch (error) {
        console.error('Error validating token:', error)
        setMessage('Failed to validate invitation. Please try again.')
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setMessage('No invitation token provided')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Claim the account
      const claimResponse = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const claimData = await claimResponse.json()

      if (!claimResponse.ok) {
        setMessage(claimData.error || 'Failed to claim account')
        return
      }

      // Account claimed successfully, now log in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: claimData.email,
        password: password,
      })

      if (signInError) {
        console.error('Sign in error after claim:', signInError)
        setMessage('Account created, but automatic login failed. Please log in manually.')
        setTimeout(() => {
          router.push('/auth/login')
        }, REDIRECT_DELAY_MS)
        return
      }

      setMessage('Account claimed successfully! Redirecting...')
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, SUCCESS_REDIRECT_DELAY_MS)
    } catch (error) {
      console.error('Error claiming account:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-900">
                Validating Invitation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-600">
                Please wait while we validate your invitation...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-900">
                Invalid Invitation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-red-600 mb-4">{message || 'This invitation link is invalid or has expired'}</p>
                <Link
                  href="/auth/login"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Go to login page
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
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
            <CardTitle className="text-2xl text-center text-gray-900">
              Claim Your Account
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Welcome, {inviteData?.name}! Set your password to complete account setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={inviteData?.email || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-700"
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
                  placeholder="Enter your password (min 8 characters)"
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
                />
              </div>

              {message && (
                <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Claiming Account...' : 'Claim Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  )
}
