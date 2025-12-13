'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Database } from '@/types/database'
import { parseBenchmarkSpreadsheet } from '@/lib/utils/spreadsheet-parsing'

type Assessment = Database['public']['Tables']['assessments']['Row']
type Industry = Database['public']['Tables']['industries']['Row']

interface BenchmarksManageClientProps {
  assessmentId: string
  industryId: string
}

interface Dimension {
  id: string
  name: string
  code: string
}

interface Benchmark {
  id?: string
  dimension_id: string
  value: number | null
}

export default function BenchmarksManageClient({ assessmentId, industryId }: BenchmarksManageClientProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingBenchmarkId, setDeletingBenchmarkId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [industry, setIndustry] = useState<Industry | null>(null)
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark>>({})

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Load assessment
        const { data: assessmentData } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single()
        setAssessment(assessmentData)

        // Load industry
        const { data: industryData } = await supabase
          .from('industries')
          .select('*')
          .eq('id', industryId)
          .single()
        setIndustry(industryData)

        // Load dimensions for this assessment
        const { data: dimensionsData } = await supabase
          .from('dimensions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('name', { ascending: true })
        setDimensions(dimensionsData || [])

        // Load existing benchmarks
        if (dimensionsData && dimensionsData.length > 0) {
          const dimensionIds = dimensionsData.map(d => d.id)
          const { data: benchmarksData } = await supabase
            .from('benchmarks')
            .select('*')
            .eq('industry_id', industryId)
            .in('dimension_id', dimensionIds)

          // Create a map of dimension_id -> benchmark
          const benchmarksMap: Record<string, Benchmark> = {}
          benchmarksData?.forEach(b => {
            benchmarksMap[b.dimension_id] = {
              id: b.id,
              dimension_id: b.dimension_id,
              value: b.value,
            }
          })

          // Initialize all dimensions with benchmark values (null if not set)
          dimensionsData.forEach(dim => {
            if (!benchmarksMap[dim.id]) {
              benchmarksMap[dim.id] = {
                dimension_id: dim.id,
                value: null,
              }
            }
          })

          setBenchmarks(benchmarksMap)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setMessage('Failed to load benchmark data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, industryId])

  const handleValueChange = (dimensionId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    setBenchmarks(prev => ({
      ...prev,
      [dimensionId]: {
        ...prev[dimensionId],
        dimension_id: dimensionId,
        value: numValue,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      const upserts = Object.values(benchmarks)
        .filter(b => b.value !== null && b.value !== undefined)
        .map(benchmark => ({
          dimension_id: benchmark.dimension_id,
          industry_id: industryId,
          value: benchmark.value!,
        }))

      // Use upsert to insert or update benchmarks
      if (upserts.length > 0) {
        const { error } = await supabase
          .from('benchmarks')
          .upsert(upserts, {
            onConflict: 'dimension_id,industry_id',
          })

        if (error) throw error
      }

      // Delete benchmarks that were set to null/empty
      const toDelete = Object.values(benchmarks)
        .filter(b => (b.value === null || b.value === undefined) && b.id)
        .map(b => b.id!)

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('benchmarks')
          .delete()
          .in('id', toDelete)

        if (error) throw error
      }

      setMessage('Benchmarks saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving benchmarks:', error)
      setMessage('Failed to save benchmarks')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteBenchmark = async (dimensionId: string) => {
    const current = benchmarks[dimensionId]
    if (!current) return

    // If it's not saved yet, "delete" just clears the input
    if (!current.id) {
      setBenchmarks((prev) => ({
        ...prev,
        [dimensionId]: { ...prev[dimensionId], value: null, id: undefined },
      }))
      return
    }

    const dimensionName = dimensions.find((d) => d.id === dimensionId)?.name || 'this benchmark'
    if (!confirm(`Are you sure you want to delete the benchmark for ${dimensionName}? This action cannot be undone.`)) {
      return
    }

    setDeletingBenchmarkId(current.id)
    setMessage('')

    try {
      const response = await fetch(`/api/benchmarks/${current.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete benchmark')
      }

      setBenchmarks((prev) => ({
        ...prev,
        [dimensionId]: { ...prev[dimensionId], value: null, id: undefined },
      }))
      setMessage('Benchmark deleted successfully!')
    } catch (error) {
      console.error('Error deleting benchmark:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to delete benchmark')
    } finally {
      setDeletingBenchmarkId(null)
    }
  }

  const handleDownloadTemplate = () => {
    // Create CSV template
    const headers = ['Dimension Name', 'Dimension Code', 'Value']
    const rows = dimensions.map(dim => [dim.name, dim.code, ''])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `benchmarks-template-${assessment?.title || 'assessment'}-${industry?.name || 'industry'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // We only support CSV right now (no xlsx dependency in Phase 1).
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      setMessage('Please upload a .csv file (Excel .xlsx/.xls is not supported yet).')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        if (!text) {
          setMessage('Error: File appears to be empty')
          return
        }

        const { data: parsedRows, errors } = parseBenchmarkSpreadsheet(text)
        if (errors.length > 0) {
          setMessage(`CSV validation failed: ${errors.slice(0, 3).join(' | ')}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ''}`)
          return
        }

        const updatedBenchmarks: Record<string, Benchmark> = { ...benchmarks }
        const uploadErrors: string[] = []
        let loadedCount = 0
        let skippedCount = 0

        for (const row of parsedRows) {
          const dimensionName = row.dimension_name?.trim()
          const dimensionCode = row.dimension_code?.trim()

          // Find dimension by code first, then name (case-insensitive)
          const matchedDimension = dimensions.find((d) => {
            const codeMatch =
              dimensionCode &&
              d.code.toLowerCase().trim() === dimensionCode.toLowerCase().trim()
            const nameMatch =
              dimensionName &&
              d.name.toLowerCase().trim() === dimensionName.toLowerCase().trim()
            return Boolean(codeMatch || nameMatch)
          })

          if (!matchedDimension) {
            skippedCount++
            uploadErrors.push(
              `No matching dimension found for row: ${dimensionCode || dimensionName || '(missing dimension)'}`
            )
            continue
          }

          // Range validation (match API behavior)
          if (row.benchmark_value < 0 || row.benchmark_value > 100) {
            skippedCount++
            uploadErrors.push(
              `Invalid value for ${matchedDimension.code}: must be between 0 and 100`
            )
            continue
          }

          const existing = updatedBenchmarks[matchedDimension.id]
          updatedBenchmarks[matchedDimension.id] = {
            dimension_id: matchedDimension.id,
            value: row.benchmark_value,
            ...(existing?.id ? { id: existing.id } : {}),
          }
          loadedCount++
        }

        setBenchmarks(updatedBenchmarks)
        setMessage(
          `CSV loaded successfully! ${loadedCount} values loaded, ${skippedCount} rows skipped. Click Save to apply changes.` +
            (uploadErrors.length > 0
              ? ` (${uploadErrors.slice(0, 2).join(' | ')}${uploadErrors.length > 2 ? ` (+${uploadErrors.length - 2} more)` : ''})`
              : '')
        )
      } catch (error) {
        console.error('Error parsing CSV:', error)
        setMessage(`Error parsing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    reader.onerror = () => {
      setMessage('Error reading file')
    }
    reader.readAsText(file)
    
    // Reset the input so the same file can be uploaded again
    event.target.value = ''
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading benchmarks...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!assessment || !industry) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Found</h1>
          <p className="text-gray-600 mb-4">Assessment or industry not found.</p>
          <Link href="/dashboard/benchmarks">
            <Button>Back to Benchmarks</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Benchmarks</h1>
            <p className="text-gray-600">Manage industry benchmarks for assessment dimensions.</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              📥 Download Template
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload-input"
              />
              <Button variant="outline" type="button" onClick={() => document.getElementById('csv-upload-input')?.click()}>
                📤 Upload CSV
              </Button>
            </label>
          </div>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/dashboard/benchmarks" className="text-gray-500 hover:text-gray-700">
                Benchmarks
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href={`/dashboard/benchmarks/manage/${assessment.id}`} className="text-gray-500 hover:text-gray-700">
                {assessment.title}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{industry.name}</li>
          </ol>
        </nav>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Benchmarks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Values</CardTitle>
            <CardDescription>
              Set benchmark values for each dimension in {industry.name} industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dimensions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No dimensions found for this assessment.</p>
                <p className="text-sm mt-2">Add dimensions to the assessment first.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dimension
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Benchmark Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dimensions.map((dimension) => {
                        const currentBenchmark = benchmarks[dimension.id]
                        return (
                          <tr key={dimension.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {dimension.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dimension.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              step="0.01"
                              value={currentBenchmark?.value ?? ''}
                              onChange={(e) => handleValueChange(dimension.id, e.target.value)}
                              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteBenchmark(dimension.id)}
                              disabled={Boolean(deletingBenchmarkId)}
                            >
                              {currentBenchmark?.id && deletingBenchmarkId === currentBenchmark.id ? 'Deleting...' : (currentBenchmark?.id ? 'Delete' : 'Clear')}
                            </Button>
                          </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Benchmarks'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

