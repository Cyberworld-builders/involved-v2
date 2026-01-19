'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import IndustryForm from '@/components/forms/industry-form'
import { Database } from '@/types/database'

interface IndustryFormData {
  name: string
}

export default function EditIndustryPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [isLoadingIndustry, setIsLoadingIndustry] = useState(true)
  const [message, setMessage] = useState('')
  const [industry, setIndustry] = useState<Database['public']['Tables']['industries']['Row'] | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const industryId = params.id as string

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

  useEffect(() => {
    const fetchIndustry = async () => {
      try {
        const { data: industryData, error } = await supabase
          .from('industries')
          .select('*')
          .eq('id', industryId)
          .single()

        if (error) {
          throw new Error(`Failed to fetch industry: ${error.message}`)
        }

        setIndustry(industryData)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load industry')
      } finally {
        setIsLoadingIndustry(false)
      }
    }

    if (industryId) {
      fetchIndustry()
    }
  }, [industryId, supabase])

  const handleSubmit = async (data: IndustryFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Send request to API
      const response = await fetch(`/api/industries/${industryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update industry')
      }

      setMessage('Industry updated successfully!')
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

  if (isLoadingIndustry) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading industry...</p>
        </div>
      </div>
    )
  }

  if (!industry) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Industry not found</h3>
        <p className="text-gray-500 mb-4">The industry you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/dashboard/industries')}
          className="text-indigo-600 hover:text-indigo-500"
        >
          Back to Industries
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Industry</h1>
            <p className="text-gray-600">Update industry information.</p>
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
        <IndustryForm
          initialData={{ name: industry.name }}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Update Industry"
        />
      </div>
  )
}
