'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DuplicateButtonProps {
  assessmentId: string
}

export default function DuplicateButton({ assessmentId }: DuplicateButtonProps) {
  const [isDuplicating, setIsDuplicating] = useState(false)
  const router = useRouter()

  const handleDuplicate = async () => {
    if (isDuplicating) return
    
    setIsDuplicating(true)
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate assessment')
      }

      const data = await response.json()
      
      // Redirect to the new assessment's edit page
      router.push(`/dashboard/assessments/${data.assessment.id}/edit`)
    } catch (error) {
      console.error('Error duplicating assessment:', error)
      alert(error instanceof Error ? error.message : 'Failed to duplicate assessment')
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleDuplicate}
      disabled={isDuplicating}
    >
      {isDuplicating ? 'Duplicating...' : 'Duplicate'}
    </Button>
  )
}

