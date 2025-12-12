'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/types/database'

type Group = Database['public']['Tables']['groups']['Row']

interface GroupWithClient extends Group {
  clients?: { name: string } | null
}

interface GroupsTableProps {
  initialGroups: GroupWithClient[]
}

type MessageType = 'success' | 'error' | null

export default function GroupsTable({ initialGroups }: GroupsTableProps) {
  const [groups, setGroups] = useState<GroupWithClient[]>(initialGroups)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<MessageType>(null)
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC' })
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleDelete = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete ${groupName}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(groupId)
    setMessage('')
    setMessageType(null)

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete group')
      }

      // Remove group from the list
      setGroups(prev => prev.filter(g => g.id !== groupId))
      setMessage('Group deleted successfully')
      setMessageType('success')
      
      // Clear message after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setMessage('')
        setMessageType(null)
      }, 3000)
      
      // Refresh the page data
      router.refresh()
    } catch (error) {
      console.error('Error deleting group:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to delete group')
      setMessageType('error')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <>
      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          messageType === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Group
                  </th>
                  <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Client
                  </th>
                  <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Description
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
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 sm:px-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-700">
                              {group.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            <Link
                              href={`/dashboard/groups/${group.id}`}
                              className="hover:text-indigo-600"
                            >
                              {group.name}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-500 sm:hidden">
                            {group.clients?.name || 'No client'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-900 sm:px-6">
                      {group.clients?.name || 'No client'}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-4 text-sm text-gray-500 sm:px-6">
                      <div className="max-w-xs truncate">
                        {group.description || '—'}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500 sm:px-6">
                      {formatDate(group.created_at)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium sm:px-6">
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/groups/${group.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(group.id, group.name)}
                          disabled={isDeleting === group.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting === group.id ? 'Deleting...' : 'Delete'}
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
    </>
  )
}
