'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface AssessmentPublishButtonProps {
  assessmentId: string
  currentStatus: 'draft' | 'active' | 'completed' | 'archived'
}

export default function AssessmentPublishButton({ assessmentId, currentStatus }: AssessmentPublishButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handlePublish = async () => {
    if (currentStatus === 'active') {
      // Unpublish (set back to draft)
      await updateStatus('draft', 'unpublished')
    } else {
      // Publish (set to active)
      await updateStatus('active', 'published')
    }
  }

  const handleArchive = async () => {
    await updateStatus('archived', 'archived')
  }

  const updateStatus = async (newStatus: string, action: string) => {
    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('assessments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assessmentId)

      if (error) {
        throw new Error(`Failed to ${action} assessment: ${error.message}`)
      }

      setMessage(`Assessment ${action} successfully!`)
      setTimeout(() => {
        router.refresh()
        setMessage('')
      }, 1500)
    } catch (error) {
      console.error(`Error ${action}ing assessment:`, error)
      setMessage(error instanceof Error ? error.message : `Failed to ${action} assessment`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {message && (
        <div className={`text-sm ${
          message.includes('successfully') 
            ? 'text-green-600' 
            : 'text-red-600'
        }`}>
          {message}
        </div>
      )}
      <div className="flex space-x-2">
        {currentStatus === 'active' ? (
          <Button
            variant="outline"
            onClick={handlePublish}
            disabled={isLoading}
            className="text-yellow-600 hover:text-yellow-700"
          >
            {isLoading ? 'Unpublishing...' : '📤 Unpublish'}
          </Button>
        ) : (
          <Button
            onClick={handlePublish}
            disabled={isLoading || currentStatus === 'archived'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Publishing...' : '🚀 Publish'}
          </Button>
        )}
        {currentStatus !== 'archived' && (
          <Button
            variant="outline"
            onClick={handleArchive}
            disabled={isLoading}
            className="text-gray-600 hover:text-gray-700"
          >
            {isLoading ? 'Archiving...' : '📦 Archive'}
          </Button>
        )}
      </div>
    </div>
  )
}

