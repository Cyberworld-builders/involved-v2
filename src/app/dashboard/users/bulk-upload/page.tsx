'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { parseUserSpreadsheet } from '@/lib/utils/spreadsheet-parsing'

interface UserData {
  name: string
  email: string
  username: string
  industry: string
  client_name?: string
}

export default function BulkUploadPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [message, setMessage] = useState('')
  const [uploadedUsers, setUploadedUsers] = useState<UserData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      // RBAC: only admins/managers can bulk upload users.
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('access_level, role, client_id')
        .eq('auth_user_id', user.id)
        .single()

      const accessLevel = currentProfile?.access_level
      const currentRole = currentProfile?.role || null
      const currentClientId = currentProfile?.client_id || null

      // Derive access level from role if access_level is not set (backwards compatibility)
      const derivedAccessLevel =
        accessLevel ||
        (currentRole === 'admin'
          ? 'super_admin'
          : currentRole === 'manager' || currentRole === 'client'
            ? 'client_admin'
            : 'member')

      const isSuperAdmin = derivedAccessLevel === 'super_admin'
      const isClientAdmin = derivedAccessLevel === 'client_admin'

      if (!isSuperAdmin && !isClientAdmin) {
        router.push('/dashboard')
        return
      }
      if (isClientAdmin && !currentClientId) {
        router.push('/dashboard')
        return
      }
      setIsLoadingAuth(false)
    }
    checkAuth()
  }, [supabase, router])

  const downloadTemplate = () => {
    const csvContent = [
      'Name,Email,Industry,Client Name',
      'John Doe,john.doe@example.com,Technology,Acme Corp',
      'Jane Smith,jane.smith@example.com,Healthcare,MedCorp',
      'Bob Johnson,bob.johnson@example.com,Finance,FinanceCorp'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setMessage('')

    try {
      const text = await file.text()
      const { data, errors } = parseUserSpreadsheet(text)

      if (errors.length > 0) {
        throw new Error(errors.slice(0, 3).join(' | ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : ''))
      }

      const users: UserData[] = data.map((r) => ({
        name: r.name,
        email: r.email,
        username: r.username,
        industry: r.industry,
        client_name: r.client_name,
      }))

      setUploadedUsers(users)
      setMessage(`Successfully parsed ${users.length} users from CSV file.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to parse CSV file')
    } finally {
      setIsProcessing(false)
    }
  }

  const createUsers = async () => {
    if (uploadedUsers.length === 0) return

    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setMessage('Supabase not configured. Please set up your environment variables.')
        return
      }

      // Get industries and clients for mapping
      const [industriesResult, clientsResult] = await Promise.all([
        supabase.from('industries').select('id, name'),
        supabase.from('clients').select('id, name')
      ])

      if (industriesResult.error) throw industriesResult.error
      if (clientsResult.error) throw clientsResult.error

      const industries = industriesResult.data || []
      const clients = clientsResult.data || []

      // Map CSV to IDs, then call server API to create real auth users + profiles.
      const usersPayload = uploadedUsers.map((u) => {
        const industry = industries.find((i) => i.name.toLowerCase() === u.industry.toLowerCase())
        const client =
          u.client_name && u.client_name.trim()
            ? clients.find((c) => c.name.toLowerCase() === u.client_name!.toLowerCase())
            : undefined

        return {
          name: u.name,
          email: u.email,
          username: u.username,
          industry_id: industry?.id || null,
          client_id: client?.id || null,
        }
      })

      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ users: usersPayload }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errMsg =
          (data && (data.error as string)) ||
          'Failed to create users. (If you are on Vercel, ensure SUPABASE_SERVICE_ROLE_KEY is set.)'
        throw new Error(errMsg)
      }

      setMessage(`Successfully created ${data.created ?? 0} users! (${data.failed ?? 0} failed)`)
      setTimeout(() => {
        router.push('/dashboard/users')
      }, 3000)
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Users</h1>
          <p className="text-gray-600">Upload multiple users from a CSV file.</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('Successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Template Download */}
        <Card>
          <CardHeader>
            <CardTitle>Download Template</CardTitle>
            <CardDescription>
              Download a CSV template to ensure proper formatting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Use the template below to format your CSV file. Required fields are: <strong>Name</strong>, <strong>Email</strong>, and <strong>Industry</strong>. <strong>Client Name</strong> is optional. Usernames are automatically generated from names.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Download Button */}
                <div className="flex items-start">
                  <Button onClick={downloadTemplate} variant="outline">
                    <span className="mr-2">📥</span>
                    Download Template
                  </Button>
                </div>

                {/* Sample Table Preview */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-700">CSV Format Preview</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Industry</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Client Name</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 text-gray-900">John Doe</td>
                          <td className="px-3 py-2 text-gray-900">john.doe@example.com</td>
                          <td className="px-3 py-2 text-gray-900">Technology</td>
                          <td className="px-3 py-2 text-gray-500">Acme Corp</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-900">Jane Smith</td>
                          <td className="px-3 py-2 text-gray-900">jane.smith@example.com</td>
                          <td className="px-3 py-2 text-gray-900">Healthcare</td>
                          <td className="px-3 py-2 text-gray-500">MedCorp</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-900">Bob Johnson</td>
                          <td className="px-3 py-2 text-gray-900">bob.johnson@example.com</td>
                          <td className="px-3 py-2 text-gray-900">Finance</td>
                          <td className="px-3 py-2 text-gray-500">FinanceCorp</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Required:</span> Name, Email, Industry
                      {' • '}
                      <span className="font-medium">Optional:</span> Client Name
                      {' • '}
                      <span className="font-medium">Auto-generated:</span> Username (from Name)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file with user data to upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {isProcessing && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-sm text-gray-600">Processing file...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Users */}
        {uploadedUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Users ({uploadedUsers.length})</CardTitle>
              <CardDescription>
                Review the users that will be created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Industry
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadedUsers.map((user, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.industry}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.client_name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => {
                      setUploadedUsers([])
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    variant="outline"
                  >
                    Clear
                  </Button>
                  <Button onClick={createUsers} disabled={isLoading}>
                    {isLoading ? 'Creating Users...' : `Create ${uploadedUsers.length} Users`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  )
}
