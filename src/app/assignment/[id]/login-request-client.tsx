'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginRequestClientProps {
  assignment: {
    id: string
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
  returnUrl: string
  userEmail: string
}

export default function LoginRequestClient({ assignment, returnUrl, userEmail }: LoginRequestClientProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequestLogin = async () => {
    setIsRequesting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/request-login-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          returnUrl: returnUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send login link')
      }

      setIsSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsRequesting(false)
    }
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
            {!isSent ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Login Required</h4>
                  <p className="text-sm text-blue-800">
                    To access this assessment, please log in. We&apos;ll send you a secure login link to your email address.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Email:</strong> {userEmail}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Due Date:</strong> {new Date(assignment.expires).toLocaleDateString()}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleRequestLogin}
                    disabled={isRequesting}
                    size="lg"
                    style={{
                      backgroundColor: assessment.accent_color || '#FFBA00',
                      color: '#000',
                    }}
                    className="px-8 py-3 text-lg font-semibold hover:opacity-90"
                  >
                    {isRequesting ? 'Sending...' : 'Send Login Link'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="font-semibold text-green-900 mb-2 text-lg">Check Your Email</h4>
                  <p className="text-sm text-green-800 mb-4">
                    We&apos;ve sent a secure login link to <strong>{userEmail}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Click the link in the email to log in and access your assessment. The link will expire in 15 minutes.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setIsSent(false)}
                    className="text-indigo-600 hover:text-indigo-700 underline"
                  >
                    try again
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
