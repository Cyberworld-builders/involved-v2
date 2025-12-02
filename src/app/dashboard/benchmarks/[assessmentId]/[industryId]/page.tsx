'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface BenchmarksManagePageProps {
  params: Promise<{
    assessmentId: string
    industryId: string
  }>
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

export default function BenchmarksManagePage({ params }: BenchmarksManagePageProps) {
  const { assessmentId, industryId } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [assessment, setAssessment] = useState<any>(null)
  const [industry, setIndustry] = useState<any>(null)
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark>>({})

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

  useEffect(() => {
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

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())

      // Find column indices
      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('dimension') && h.toLowerCase().includes('name'))
      const codeIndex = headers.findIndex(h => h.toLowerCase().includes('dimension') && h.toLowerCase().includes('code'))
      const valueIndex = headers.findIndex(h => h.toLowerCase() === 'value')

      if (nameIndex === -1 || codeIndex === -1 || valueIndex === -1) {
        setMessage('Invalid CSV format. Please use the template.')
        return
      }

      // Parse CSV and update benchmarks
      const updatedBenchmarks = { ...benchmarks }
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const dimensionName = values[nameIndex]
        const dimensionCode = values[codeIndex]
        const value = parseFloat(values[valueIndex])

        if (isNaN(value)) continue

        // Find dimension by name or code
        const dimension = dimensions.find(
          d => d.name.toLowerCase() === dimensionName.toLowerCase() ||
               d.code.toLowerCase() === dimensionCode.toLowerCase()
        )

        if (dimension) {
          updatedBenchmarks[dimension.id] = {
            dimension_id: dimension.id,
            value: value,
          }
        }
      }

      setBenchmarks(updatedBenchmarks)
      setMessage('CSV loaded successfully. Click Save to apply changes.')
    }
    reader.readAsText(file)
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
              <Button variant="outline" as="span">
                📤 Upload CSV
              </Button>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
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
              <Link href={`/dashboard/benchmarks/${assessment.id}`} className="text-gray-500 hover:text-gray-700">
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dimensions.map((dimension) => (
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
                              value={benchmarks[dimension.id]?.value ?? ''}
                              onChange={(e) => handleValueChange(dimension.id, e.target.value)}
                              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      ))}
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

