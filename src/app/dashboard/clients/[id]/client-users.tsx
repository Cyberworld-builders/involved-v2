'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface UserData {
  Name: string
  Email: string
  Username: string
  Industry: string
  Role: string
}

interface ClientUsersProps {
  clientId: string
}

export default function ClientUsers({ clientId }: ClientUsersProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadedUsers, setUploadedUsers] = useState<UserData[]>([])
  const [errorDetails, setErrorDetails] = useState<Array<{user: string, error: string}>>([])
  type UserWithIndustry = {
    id: string
    name: string
    email: string
    username: string
    industries: { name: string } | null
    last_login_at: string | null
    created_at: string
  }
  const [existingUsers, setExistingUsers] = useState<UserWithIndustry[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  type SearchResult = {
    id: string
    name: string
    email: string
    username: string
    industries: { name: string } | null
  }
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedInviteUserIds, setSelectedInviteUserIds] = useState<string[]>([])
  const [isSendingInvites, setIsSendingInvites] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<Record<string, { status: 'success' | 'error' | 'sending', message?: string }>>({})
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [deleteUserName, setDeleteUserName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const loadUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          username,
          last_login_at,
          created_at,
          industries(name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
      } else {
        // Transform data to handle industries as single object
        const transformedData = (data || []).map((user: {
          id: string
          name: string
          email: string
          username: string
          last_login_at: string | null
          created_at: string
          industries: Array<{ name: string }> | { name: string } | null
        }) => ({
          ...user,
          industries: Array.isArray(user.industries) ? user.industries[0] || null : user.industries
        })) as UserWithIndustry[]
        setExistingUsers(transformedData)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = [
      'Name,Email,Username,Industry,Role',
      'John Doe,john.doe@example.com,johndoe,Technology,User',
      'Jane Smith,jane.smith@example.com,janesmith,Healthcare,User'
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users_upload_template.csv'
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
      
      // Parse CSV - handle quoted values
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // Simple CSV parser that handles quoted values
        const values: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Push last value
        
        if (values.length < 5) continue // Skip incomplete rows
        
        const user: UserData = {
          Name: values[0]?.replace(/^"|"$/g, '') || '',
          Email: values[1]?.replace(/^"|"$/g, '') || '',
          Username: values[2]?.replace(/^"|"$/g, '') || '',
          Industry: values[3]?.replace(/^"|"$/g, '') || '',
          Role: values[4]?.replace(/^"|"$/g, '') || 'User'
        }
        
        // Validate required fields
        if (!user.Name || !user.Email) {
          throw new Error(`Row ${i + 1}: Name and Email are required`)
        }
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.Email)) {
          throw new Error(`Row ${i + 1}: Invalid email format for '${user.Email}'`)
        }
        
        // Generate username if not provided
        if (!user.Username && user.Name) {
          user.Username = user.Name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20)
        }
        
        users.push(user)
      }
      
      setUploadedUsers(users)
      setMessage(`Successfully parsed ${users.length} users from CSV file. Review and click "Create Users" to proceed.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to parse CSV file')
    } finally {
      setIsProcessing(false)
    }
  }

  const searchUnassociatedUsers = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          username,
          industries!industry_id(name)
        `)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .is('client_id', null)
        .limit(20)

      if (error) {
        console.error('Error searching users:', error)
        setSearchResults([])
      } else {
        // Transform data to handle industries as single object
        const transformedSearchData = (data || []).map((user: {
          id: string
          name: string
          email: string
          username: string
          industries: Array<{ name: string }> | { name: string } | null
        }) => ({
          ...user,
          industries: Array.isArray(user.industries) ? user.industries[0] || null : user.industries
        })) as SearchResult[]
        setSearchResults(transformedSearchData)
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      searchUnassociatedUsers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchUnassociatedUsers])

  const handleAddSelectedUsers = async () => {
    if (selectedUserIds.length === 0) return

    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ client_id: clientId })
        .in('id', selectedUserIds)

      if (error) {
        throw new Error(`Failed to associate users: ${error.message}`)
      }

      setMessage(`Successfully associated ${selectedUserIds.length} user(s) with this client!`)
      setSelectedUserIds([])
      setSearchQuery('')
      setSearchResults([])
      setShowSearchModal(false)
      
      setTimeout(() => {
        loadUsers()
        router.refresh()
        setMessage('')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to associate users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvite = async (userId: string, userName: string) => {
    setInviteStatus(prev => ({ ...prev, [userId]: { status: 'sending' } }))

    try {
      const response = await fetch(`/api/users/${userId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // Show more detailed error message if available
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to send invite'
        throw new Error(errorMessage)
      }

      setInviteStatus(prev => ({
        ...prev,
        [userId]: {
          status: 'success',
          message: data.warning || 'Invite sent successfully',
        },
      }))

      // Clear status after 3 seconds
      setTimeout(() => {
        setInviteStatus(prev => {
          const newStatus = { ...prev }
          delete newStatus[userId]
          return newStatus
        })
      }, 3000)
    } catch (error) {
      setInviteStatus(prev => ({
        ...prev,
        [userId]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to send invite',
        },
      }))

      // Clear error status after 5 seconds
      setTimeout(() => {
        setInviteStatus(prev => {
          const newStatus = { ...prev }
          delete newStatus[userId]
          return newStatus
        })
      }, 5000)
    }
  }

  const handleBulkSendInvites = async () => {
    if (selectedInviteUserIds.length === 0) return

    setIsSendingInvites(true)
    setMessage('')
    const statusUpdates: Record<string, { status: 'success' | 'error' | 'sending', message?: string }> = {}

    // Initialize all as sending
    selectedInviteUserIds.forEach(userId => {
      statusUpdates[userId] = { status: 'sending' }
    })
    setInviteStatus(statusUpdates)

    let successCount = 0
    let failCount = 0

    // Send invites sequentially to avoid overwhelming the server
    for (const userId of selectedInviteUserIds) {
      const user = existingUsers.find(u => u.id === userId)
      if (!user) continue

      try {
        const response = await fetch(`/api/users/${userId}/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send invite')
        }

        statusUpdates[userId] = {
          status: 'success',
          message: data.warning || 'Invite sent',
        }
        successCount++
      } catch (error) {
        statusUpdates[userId] = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to send invite',
        }
        failCount++
      }

      // Update status after each invite
      setInviteStatus({ ...statusUpdates })
    }

    setMessage(
      `Invites sent: ${successCount} successful, ${failCount} failed.`
    )
    setSelectedInviteUserIds([])

    // Clear status messages after 5 seconds
    setTimeout(() => {
      setInviteStatus({})
      setMessage('')
    }, 5000)

    setIsSendingInvites(false)
  }

  const handleResetPasswordClick = (userId: string) => {
    setResetPasswordUserId(userId)
    setResetPasswordModalOpen(true)
    setNewPassword('')
    setConfirmPassword('')
    setResetPasswordError('')
  }

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordUserId) return

    // Validate passwords
    if (!newPassword || newPassword.length < 8) {
      setResetPasswordError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setResetPasswordError('Passwords do not match')
      return
    }

    setIsResettingPassword(true)
    setResetPasswordError('')

    try {
      const response = await fetch(`/api/users/${resetPasswordUserId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      // Success - close modal and show success message
      setResetPasswordModalOpen(false)
      setResetPasswordUserId(null)
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password reset successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setResetPasswordError(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDeleteUserClick = (userId: string, userName: string) => {
    setDeleteUserId(userId)
    setDeleteUserName(userName)
    setDeleteUserModalOpen(true)
  }

  const handleDeleteUserConfirm = async () => {
    if (!deleteUserId) return

    setIsDeletingUser(true)
    setMessage('')

    try {
      const response = await fetch(`/api/users/${deleteUserId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Success - close modal and reload users
      setDeleteUserModalOpen(false)
      setDeleteUserId(null)
      setDeleteUserName('')
      setMessage(`User "${deleteUserName}" deleted successfully!`)
      
      setTimeout(() => {
        loadUsers()
        router.refresh()
        setMessage('')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setIsDeletingUser(false)
    }
  }

  const createUsers = async () => {
    if (uploadedUsers.length === 0) return

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/clients/${clientId}/users/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: uploadedUsers }),
      })

      const data = await response.json()

      // Debug: Log the full response
      console.log('API Response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create users')
      }

      if (data.failed > 0) {
        interface BulkUploadResult {
          success: boolean
          user?: string
          email?: string
          error?: string
          message?: string
        }
        
        const failedUsers = data.results.filter((r: BulkUploadResult) => !r.success)
        
        // Extract error details for display
        const errors = failedUsers.map((failed: BulkUploadResult) => ({
          user: failed.user || failed.email || 'Unknown',
          error: failed.error || failed.message || 'Unknown error'
        }))
        setErrorDetails(errors)
        
        // Debug: Log failed users structure
        console.log('Failed users array:', failedUsers)
        if (failedUsers.length > 0) {
          console.log('First failed user example:', JSON.stringify(failedUsers[0], null, 2))
        }
        
        setMessage(`Created ${data.created} users. ${data.failed} failed. See error details below.`)
        
        console.group('❌ Failed User Creation')
        console.error(`Total failed: ${data.failed}`)
        console.error('Failed users and errors:')
        
        failedUsers.slice(0, 20).forEach((failed: BulkUploadResult, index: number) => {
          const email = failed.user || failed.email || `User ${index + 1}`
          const error = failed.error || failed.message || 'Unknown error'
          console.error(`${index + 1}. ${email}: ${error}`)
        })
        
        if (failedUsers.length > 20) {
          console.error(`... and ${failedUsers.length - 20} more`)
        }
        console.groupEnd()
      } else {
        setErrorDetails([])
        setMessage(`Successfully created ${data.created} users!`)
        setUploadedUsers([])
        setTimeout(() => {
          loadUsers()
          router.refresh()
        }, 2000)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-600">Manage users for this client</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowSearchModal(true)}
          >
            🔍 Search Existing Users
          </Button>
          <Link href={`/dashboard/users/create?client_id=${clientId}`}>
            <Button>Add Single User</Button>
          </Link>
          <Button variant="outline" onClick={downloadTemplate}>
            Download Template
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Users</CardTitle>
          <CardDescription>
            Upload a CSV file to create multiple users at once. Format: Name,Email,Username,Industry,Role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
            >
              {isProcessing ? 'Processing...' : 'Upload CSV File'}
            </Button>
          </div>

          {message && (
            <div className={`p-4 rounded-md ${
              message.includes('Successfully') || message.includes('Created') && errorDetails.length === 0
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {errorDetails.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-semibold text-red-900 mb-2">
                Error Details ({errorDetails.length} failures):
              </h3>
              <div className="space-y-2">
                {errorDetails.slice(0, 50).map((err, index) => (
                  <div key={index} className="text-sm text-red-800 border-b border-red-200 pb-1">
                    <span className="font-medium">{err.user}:</span> {err.error}
                  </div>
                ))}
                {errorDetails.length > 50 && (
                  <div className="text-sm text-red-600 italic">
                    ... and {errorDetails.length - 50} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {uploadedUsers.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">
                  Preview ({uploadedUsers.length} users)
                </p>
                <Button
                  onClick={createUsers}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : `Create ${uploadedUsers.length} Users`}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedUsers.slice(0, 10).map((user, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.Name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.Email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.Username}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.Industry}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{user.Role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadedUsers.length > 10 && (
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    ... and {uploadedUsers.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Users List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Existing Users ({existingUsers.length})</CardTitle>
              <CardDescription>
                Users associated with this client
              </CardDescription>
            </div>
            {selectedInviteUserIds.length > 0 && (
              <Button
                onClick={handleBulkSendInvites}
                disabled={isSendingInvites}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isSendingInvites
                  ? `Sending ${selectedInviteUserIds.length} invites...`
                  : `Send Invites (${selectedInviteUserIds.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : existingUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found for this client.</p>
              <p className="text-sm text-gray-400 mt-2">Use the bulk upload above or add a single user to get started.</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedInviteUserIds.length === existingUsers.length && existingUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInviteUserIds(existingUsers.map(u => u.id))
                          } else {
                            setSelectedInviteUserIds([])
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Select all users for bulk invite"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {existingUsers.map((user) => {
                    const inviteStatusForUser = inviteStatus[user.id]
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedInviteUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInviteUserIds([...selectedInviteUserIds, user.id])
                              } else {
                                setSelectedInviteUserIds(selectedInviteUserIds.filter(id => id !== user.id))
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Select user for bulk invite"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                <Link
                                  href={`/dashboard/users/${user.id}`}
                                  className="hover:text-indigo-600"
                                >
                                  {user.name}
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.industries?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleSendInvite(user.id, user.name)}
                              disabled={inviteStatusForUser?.status === 'sending'}
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                                inviteStatusForUser?.status === 'sending'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : inviteStatusForUser?.status === 'success'
                                    ? 'bg-green-100 text-green-700'
                                    : inviteStatusForUser?.status === 'error'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              }`}
                              title="Send invite email"
                            >
                              {inviteStatusForUser?.status === 'sending'
                                ? '⏳ Sending...'
                                : inviteStatusForUser?.status === 'success'
                                  ? '✓ Sent'
                                  : inviteStatusForUser?.status === 'error'
                                    ? '✗ Failed'
                                    : '📧 Invite'}
                            </button>
                            <button
                              onClick={() => handleResetPasswordClick(user.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                              title="Reset password"
                            >
                              🔑 Reset Password
                            </button>
                            <button
                              onClick={() => handleDeleteUserClick(user.id, user.name)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200"
                              title="Delete user"
                            >
                              🗑️ Delete
                            </button>
                            <Link
                              href={`/dashboard/users/${user.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </Link>
                          </div>
                          {inviteStatusForUser?.message && (
                            <div className={`mt-1 text-xs ${
                              inviteStatusForUser.status === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {inviteStatusForUser.message}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Existing Users Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Search Unassociated Users</h3>
              <button
                type="button"
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchQuery('')
                  setSearchResults([])
                  setSelectedUserIds([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Name, Email, or Username
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchUnassociatedUsers()
                      }
                    }}
                    placeholder="Type to search..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Button
                    type="button"
                    onClick={searchUnassociatedUsers}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Search for users in the system that are not yet associated with any client
                </p>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      Found {searchResults.length} user(s)
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.length === searchResults.length && searchResults.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds(searchResults.map(u => u.id))
                                } else {
                                  setSelectedUserIds([])
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchResults.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUserIds([...selectedUserIds, user.id])
                                  } else {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">@{user.username}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {user.industries?.name || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-gray-500">
                  <p>No unassociated users found matching &quot;{searchQuery}&quot;</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSearchModal(false)
                    setSearchQuery('')
                    setSearchResults([])
                    setSelectedUserIds([])
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddSelectedUsers}
                  disabled={isLoading || selectedUserIds.length === 0}
                >
                  {isLoading ? 'Adding...' : `Add ${selectedUserIds.length} User(s)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => {
                  setResetPasswordModalOpen(false)
                  setResetPasswordUserId(null)
                  setNewPassword('')
                  setConfirmPassword('')
                  setResetPasswordError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isResettingPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isResettingPassword}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isResettingPassword) {
                      handleResetPasswordSubmit()
                    }
                  }}
                />
              </div>

              {resetPasswordError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                  {resetPasswordError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetPasswordModalOpen(false)
                    setResetPasswordUserId(null)
                    setNewPassword('')
                    setConfirmPassword('')
                    setResetPasswordError('')
                  }}
                  disabled={isResettingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleResetPasswordSubmit}
                  disabled={isResettingPassword || !newPassword || !confirmPassword}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
              <button
                type="button"
                onClick={() => {
                  setDeleteUserModalOpen(false)
                  setDeleteUserId(null)
                  setDeleteUserName('')
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeletingUser}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. Deleting this user will:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                  <li>Remove the user from this client</li>
                  <li>Delete their profile and authentication account</li>
                  <li>Remove all associated data</li>
                </ul>
              </div>

              <div>
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete <strong>{deleteUserName}</strong>?
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeleteUserModalOpen(false)
                    setDeleteUserId(null)
                    setDeleteUserName('')
                  }}
                  disabled={isDeletingUser}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteUserConfirm}
                  disabled={isDeletingUser}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeletingUser ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

