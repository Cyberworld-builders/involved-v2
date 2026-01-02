'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import IndustryForm from '@/components/forms/industry-form'

interface IndustryFormData {
  name: string
}

export default function CreateIndustryPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setIsLoadingAuth(false)
    }
    checkAuth()
  }, [supabase, router])

  const handleSubmit = async (data: IndustryFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        // Supabase not configured - show demo mode
        console.log('Demo mode - Industry data:', data)
        setMessage('Demo mode: Industry data logged to console. Set up Supabase to save to database.')
        
        // Simulate success after a delay
        setTimeout(() => {
          setMessage('Demo mode: Industry would be created successfully!')
          setTimeout(() => {
            router.push('/dashboard/industries')
          }, 2000)
        }, 1000)
        return
      }

      const response = await fetch('/api/industries', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: data.name }),
      })

      if (!response.ok) {
        let message = 'Failed to create industry'
        try {
          const errorData = await response.json()
          message = errorData.error || message
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message)
      }

      setMessage('Industry created successfully!')
      setTimeout(() => {
        router.push('/dashboard/industries')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Industry</h1>
            <p className="text-gray-600">Add a new industry category for user classification.</p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Industry Form */}
        <IndustryForm onSubmit={handleSubmit} isLoading={isLoading} submitText="Create Industry" />
      </div>
  )
}
