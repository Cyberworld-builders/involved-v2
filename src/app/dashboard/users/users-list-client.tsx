'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  username: string
  created_at: string
  last_login_at: string | null
  clients?: { name: string } | null
  industries?: { name: string } | null
}

interface UsersListClientProps {
  users: User[]
}

export default function UsersListClient({ users }: UsersListClientProps) {
  const router = useRouter()
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC' })
  }

  const handleDelete = async (userId: string, userName: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${userName}"? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setDeletingUserId(userId)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }

      // Refresh the page to show updated list
      router.refresh()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete user. Please try again.'
      )
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  User
                </th>
                <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  Client
                </th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  Industry
                </th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  Last Login
                </th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  Created
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  Settings
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 sm:px-6">
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
                        <div className="text-xs text-gray-400 hidden sm:block">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-4 sm:px-6 text-sm text-gray-900">
                    {user.clients?.name || 'No client'}
                  </td>
                  <td className="hidden lg:table-cell px-3 py-4 sm:px-6 text-sm text-gray-900">
                    {user.industries?.name || '-'}
                  </td>
                  <td className="hidden lg:table-cell px-3 py-4 sm:px-6 text-sm text-gray-500">
                    {user.last_login_at
                      ? formatDate(user.last_login_at)
                      : 'Never'}
                  </td>
                  <td className="hidden md:table-cell px-3 py-4 sm:px-6 text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-3 py-4 sm:px-6 text-sm font-medium">
                    <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-1 sm:space-y-0">
                      <Link
                        href={`/dashboard/users/${user.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={deletingUserId === user.id}
                        className="text-red-600 hover:text-red-900 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
