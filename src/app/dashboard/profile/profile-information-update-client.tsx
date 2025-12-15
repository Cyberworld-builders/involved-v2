'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isValidEmail } from '@/lib/utils/email-validation'

interface ProfileData {
  name: string
  username: string
  email: string
  access_level?: string
  client_id?: string | null
  client_name?: string | null
  industry_id?: string | null
  industry_name?: string | null
}

export default function ProfileInformationUpdateClient({ initialProfile }: { initialProfile: ProfileData }) {
  const [name, setName] = useState(initialProfile.name)
  const [username, setUsername] = useState(initialProfile.username)
  const [email, setEmail] = useState(initialProfile.email)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Update state when initial profile changes
  useEffect(() => {
    setName(initialProfile.name)
    setUsername(initialProfile.username)
    setEmail(initialProfile.email)
  }, [initialProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    // Validation
    if (!name || name.trim() === '') {
      setError('Name is required')
      return
    }

    if (!username || username.trim() === '') {
      setError('Username is required')
      return
    }

    if (!email || email.trim() === '') {
      setError('Email is required')
      return
    }

    // Validate email format using utility function
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update profile')
        return
      }

      setMessage('Profile updated successfully!')
      
      // Update the form with the returned profile data
      if (data.profile) {
        setName(data.profile.name)
        setUsername(data.profile.username)
        setEmail(data.profile.email)
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-900">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900">
              Email
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
              placeholder="Enter your email address"
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

          {/* Read-only account information */}
          {(initialProfile.access_level || initialProfile.client_name || initialProfile.industry_name) && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <p className="text-sm font-medium text-gray-700">Account Information (read-only)</p>
              
              {initialProfile.access_level && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Access Level
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                    {initialProfile.access_level === 'super_admin' ? 'Super Admin' :
                     initialProfile.access_level === 'client_admin' ? 'Client Admin' :
                     'Member'}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Your access level cannot be changed. Contact an administrator if you need different permissions.
                  </p>
                </div>
              )}

              {initialProfile.client_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Client
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                    {initialProfile.client_name}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Your client assignment cannot be changed. Contact an administrator if you need to be moved to a different client.
                  </p>
                </div>
              )}

              {initialProfile.industry_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Industry
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
                    {initialProfile.industry_name}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Updating Profile...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
