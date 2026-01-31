'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface GenerateReportButtonProps {
  assignmentId: string
}

export default function GenerateReportButton({ assignmentId }: GenerateReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/generate/${assignmentId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.details || 'Failed to generate report'
        throw new Error(errorMessage)
      }

      // Redirect to report view after successful generation
      router.push(`/dashboard/reports/${assignmentId}`)
      router.refresh()
    } catch (err) {
      console.error('Error generating report:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate report')
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating Report...' : 'Generate Report'}
      </Button>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 max-w-md text-right">
          <p className="text-sm text-red-800 font-medium">Error generating report:</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}
