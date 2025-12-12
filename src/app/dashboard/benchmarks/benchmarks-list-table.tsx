'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/types/database'

type Benchmark = Database['public']['Tables']['benchmarks']['Row']

interface BenchmarkWithRelations extends Benchmark {
  dimensions?: { name: string; code: string; assessment_id: string } | null
  industries?: { name: string } | null
}

interface BenchmarksListTableProps {
  initialBenchmarks: BenchmarkWithRelations[]
}

type MessageType = 'success' | 'error' | null

export default function BenchmarksListTable({ initialBenchmarks }: BenchmarksListTableProps) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkWithRelations[]>(initialBenchmarks)
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

  const handleDelete = async (benchmarkId: string, dimensionName: string) => {
    if (!confirm(`Are you sure you want to delete the benchmark for ${dimensionName}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(benchmarkId)
    setMessage('')
    setMessageType(null)

    try {
      const response = await fetch(`/api/benchmarks/${benchmarkId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete benchmark')
      }

      // Remove benchmark from the list
      setBenchmarks(prev => prev.filter(b => b.id !== benchmarkId))
      setMessage('Benchmark deleted successfully')
      setMessageType('success')
      
      // Clear message after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setMessage('')
        setMessageType(null)
      }, 3000)
      
      // Refresh the page data
      router.refresh()
    } catch (error) {
      console.error('Error deleting benchmark:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to delete benchmark')
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
                    Dimension
                  </th>
                  <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Industry
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Value
                  </th>
                  <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Updated
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {benchmarks.map((benchmark) => (
                  <tr key={benchmark.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 sm:px-6">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {benchmark.dimensions?.name || 'Unknown Dimension'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {benchmark.dimensions?.code || '—'}
                        </div>
                        <div className="text-sm text-gray-500 sm:hidden">
                          {benchmark.industries?.name || 'Unknown Industry'}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-900 sm:px-6">
                      {benchmark.industries?.name || 'Unknown Industry'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 sm:px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {benchmark.value?.toFixed(1) ?? '—'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500 sm:px-6">
                      {benchmark.updated_at ? formatDate(benchmark.updated_at) : '—'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium sm:px-6">
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/benchmarks/${benchmark.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/benchmarks/manage/${benchmark.dimensions?.assessment_id}/${benchmark.industry_id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(benchmark.id, benchmark.dimensions?.name || 'this benchmark')}
                          disabled={isDeleting === benchmark.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting === benchmark.id ? 'Deleting...' : 'Delete'}
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
