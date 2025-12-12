'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email) {
      setError('Email is required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      // For security, do not reveal whether the email exists.
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        // Only surface validation errors; otherwise keep messaging generic.
        if (response.status === 400 && data?.error) {
          setError(String(data.error))
        } else {
          setMessage(
            "If an account exists for that email, you'll receive a password reset link shortly."
          )
        }
        return
      }

      setMessage("If an account exists for that email, you'll receive a password reset link shortly.")
    } catch {
      setMessage("If an account exists for that email, you'll receive a password reset link shortly.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link href="/auth/login" className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to sign in
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900">Forgot Password</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your email and we&apos;ll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email"
                  disabled={loading}
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                Return to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
