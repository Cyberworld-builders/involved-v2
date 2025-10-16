'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UserData {
  name: string
  email: string
  username: string
  industry: string
  job_title?: string
  job_family?: string
  client_name?: string
}

export default function BulkUploadPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadedUsers, setUploadedUsers] = useState<UserData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const downloadTemplate = () => {
    const csvContent = [
      'Name,Email,Username,Industry,Job Title,Job Family,Client Name',
      'John Doe,john.doe@example.com,johndoe,Technology,Software Engineer,Engineering,Acme Corp',
      'Jane Smith,jane.smith@example.com,janesmith,Healthcare,Nurse,Healthcare,MedCorp',
      'Bob Johnson,bob.johnson@example.com,bobjohnson,Finance,Analyst,Finance,FinanceCorp'
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
      const lines = text.split('\n')
      
      const users: UserData[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim())
        if (values.length < 4) continue // Skip incomplete rows
        
        const user: UserData = {
          name: values[0] || '',
          email: values[1] || '',
          username: values[2] || '',
          industry: values[3] || '',
          job_title: values[4] || '',
          job_family: values[5] || '',
          client_name: values[6] || ''
        }
        
        // Validate required fields
        if (!user.name || !user.email || !user.industry) {
          throw new Error(`Row ${i + 1}: Name, Email, and Industry are required`)
        }
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
          throw new Error(`Row ${i + 1}: Invalid email format for '${user.email}'`)
        }
        
        // Generate username if not provided
        if (!user.username && user.name) {
          user.username = user.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20)
        }
        
        users.push(user)
      }
      
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

      // Create users
      const userInserts = uploadedUsers.map(user => {
        const industry = industries.find(i => 
          i.name.toLowerCase() === user.industry.toLowerCase()
        )
        const client = clients.find(c => 
          c.name.toLowerCase() === (user.client_name || '').toLowerCase()
        )

        return {
          username: user.username,
          name: user.name,
          email: user.email,
          password: 'temp123', // Default password - should be changed on first login
          client_id: client?.id || null,
          job_title: user.job_title || null,
          job_family: user.job_family || null,
          industry_id: industry?.id || null,
          completed_profile: false,
        }
      })

      const { data: users, error } = await supabase
        .from('users')
        .insert(userInserts)
        .select()

      if (error) {
        throw new Error(`Failed to create users: ${error.message}`)
      }

      setMessage(`Successfully created ${users.length} users!`)
      setTimeout(() => {
        router.push('/dashboard/users')
      }, 3000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
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
                Use the template below to format your CSV file. Required fields are: Name, Email, and Industry.
              </p>
              <Button onClick={downloadTemplate} variant="outline">
                <span className="mr-2">📥</span>
                Download Template
              </Button>
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
                          Job Title
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
                            {user.job_title || '-'}
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
    </DashboardLayout>
  )
}
