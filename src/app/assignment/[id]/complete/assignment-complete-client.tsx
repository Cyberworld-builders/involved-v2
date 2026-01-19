'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AssignmentCompleteClientProps {
  assignment: {
    id: string
    completed: boolean
    completed_at: string | null
    started_at: string | null
    expires: string
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

export default function AssignmentCompleteClient({ assignment }: AssignmentCompleteClientProps) {
  const [logoError, setLogoError] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)

  const assessment = assignment.assessment
  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
        </div>
      </div>
    )
  }

  const logoUrl = assessment.logo
  const backgroundUrl = assessment.background

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Background, Logo, and Title */}
      <div className="relative w-full h-32 md:h-40 overflow-hidden bg-white">
        {/* Background Image */}
        {backgroundUrl && !backgroundError && (
          <div className="absolute inset-0">
            <Image
              src={backgroundUrl}
              alt="Assessment background"
              fill
              className="object-cover"
              onError={() => setBackgroundError(true)}
            />
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
        )}

        {/* Header Content: Logo and Title - horizontally centered */}
        <div className="relative z-10 flex items-center justify-center h-full px-8">
          <div className="flex items-center gap-6 max-w-6xl w-full justify-center">
            {/* Logo - if available, show only logo */}
            {logoUrl && !logoError ? (
              <div className="h-12 md:h-16 w-auto flex-shrink-0">
                <Image
                  src={logoUrl}
                  alt="Assessment logo"
                  width={200}
                  height={128}
                  className="h-full w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              /* Title - only show if no logo */
              <h1 className={`text-xl md:text-2xl font-bold ${backgroundUrl && !backgroundError ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}>
                {assessment.title}
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="bg-white shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Assessment Completed</CardTitle>
            <CardDescription className="text-lg mt-2">
              Thank you for completing this assessment!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Completed</p>
                  <p className="text-sm text-green-600">
                    {assignment.completed_at
                      ? new Date(assignment.completed_at).toLocaleString()
                      : 'Just now'}
                  </p>
                </div>
                {assignment.started_at && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-800">Time Taken</p>
                    <p className="text-sm text-green-600">
                      {(() => {
                        const start = new Date(assignment.started_at)
                        const end = assignment.completed_at ? new Date(assignment.completed_at) : new Date()
                        const diff = Math.round((end.getTime() - start.getTime()) / 1000 / 60)
                        return `${diff} minute${diff !== 1 ? 's' : ''}`
                      })()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {assessment.description && (
              <div className="prose max-w-none">
                <div
                  className="rich-text-content text-gray-700"
                  dangerouslySetInnerHTML={{ __html: assessment.description }}
                />
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Your responses have been saved and submitted. You can close this page at any time.
              </p>
              <div className="flex justify-center">
                <Link href="/dashboard">
                  <Button variant="outline">
                    Return to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

