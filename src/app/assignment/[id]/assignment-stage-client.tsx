'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AssignmentStageClientProps {
  assignment: {
    id: string
    expires: string
    started_at: string | null
    assessment: {
      id: string
      title: string
      description: string | null
      logo: string | null
      background: string | null
      primary_color: string | null
      accent_color: string | null
    } | null
  }
  username: string | undefined
}

export default function AssignmentStageClient({ assignment }: AssignmentStageClientProps) {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)

  const handleBegin = async () => {
    setIsStarting(true)
    
    // Record started_at timestamp if not already set
    if (!assignment.started_at) {
      try {
        const response = await fetch(`/api/assignments/${assignment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            started_at: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          console.error('Failed to record start time')
        }
      } catch (error) {
        console.error('Error recording start time:', error)
      }
    }

    // Navigate to the assessment taking page
    // Get current URL params to preserve them
    const currentParams = new URLSearchParams(window.location.search)
    const takeUrl = `/assignment/${assignment.id}/take${currentParams.toString() ? `?${currentParams.toString()}` : ''}`
    console.log('Navigating to:', takeUrl)
    router.push(takeUrl)
  }

  const assessment = assignment.assessment
  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
          <p className="text-gray-600 mb-4">The assessment for this assignment could not be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundColor: assessment.background ? 'transparent' : (assessment.primary_color || '#2D2E30'),
        backgroundImage: assessment.background ? `url(${assessment.background})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            {assessment.logo ? (
              <div className="flex justify-center mb-4">
                <Image
                  src={assessment.logo}
                  alt="Assessment Logo"
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>
            ) : (
              <CardTitle className="text-3xl font-bold" style={{ color: assessment.accent_color || '#FFBA00' }}>
                {assessment.title}
              </CardTitle>
            )}
            {assessment.description && (
              <CardDescription 
                className="mt-4 text-base"
                dangerouslySetInnerHTML={{ __html: assessment.description }}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• This assessment must be completed by {new Date(assignment.expires).toLocaleDateString()}</li>
                <li>• You can save your progress and return later</li>
                <li>• Once you begin, you can navigate through all questions</li>
                {assignment.started_at && (
                  <li>• You started this assessment on {new Date(assignment.started_at).toLocaleString()}</li>
                )}
              </ul>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleBegin}
                disabled={isStarting}
                size="lg"
                style={{
                  backgroundColor: assessment.accent_color || '#FFBA00',
                  color: '#000',
                }}
                className="px-8 py-3 text-lg font-semibold hover:opacity-90"
              >
                {isStarting ? 'Starting...' : 'Begin Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

