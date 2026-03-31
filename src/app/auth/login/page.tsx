'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DevProfile {
  id: string
  email: string
  name: string
  role: string
  access_level: string
  client_id: string | null
  client: { name: string } | null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [devProfiles, setDevProfiles] = useState<DevProfile[]>([])
  const [devLoading, setDevLoading] = useState(false)
  const router = useRouter()

  const supabase = createClient()
  const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'

  useEffect(() => {
    if (isDev) {
      fetch('/api/auth/dev-login')
        .then(r => r.json())
        .then(d => setDevProfiles(d.profiles || []))
        .catch(() => {})
    }
  }, [isDev])

  const handleDevLogin = async (profileEmail: string) => {
    setDevLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profileEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Dev login failed')
        return
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        setMessage(error.message)
      } else {
        await router.refresh()
        router.push('/dashboard')
      }
    } catch {
      setMessage('Dev login failed')
    } finally {
      setDevLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Login successful! Redirecting...')
        // Refresh so middleware/server see the new session (fixes redirect hang on Vercel)
        await router.refresh()
        router.push('/dashboard')
      }
    } catch {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Fixed message (toaster) */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md shadow-lg rounded-md p-4 flex items-start gap-3 ${
            message.includes('successful')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <p className="flex-1 text-sm">{message}</p>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

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
            <CardTitle className="text-2xl text-center text-gray-900">Sign in to Involved Talent</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} method="POST" action="" className="space-y-4">
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Need a login link?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        </Card>

        {isDev && devProfiles.length > 0 && (
          <Card className="mt-4 border-amber-300 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800">Dev Login</CardTitle>
              <CardDescription className="text-xs text-amber-600">
                Click any user to sign in instantly (dev only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {devProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleDevLogin(p.email)}
                    disabled={devLoading}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-amber-100 transition-colors disabled:opacity-50 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{p.name || p.email}</span>
                      <span className="text-gray-500 ml-2 text-xs">{p.email}</span>
                    </div>
                    <div className="flex gap-1">
                      {p.role === 'admin' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">admin</span>
                      )}
                      {p.client && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{p.client.name}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
