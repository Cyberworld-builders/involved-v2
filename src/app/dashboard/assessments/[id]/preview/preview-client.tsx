'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { QUESTION_TYPES } from '@/components/forms/assessment-form'

type AssessmentRow = Database['public']['Tables']['assessments']['Row']
type FieldRow = Database['public']['Tables']['fields']['Row']

interface Anchor {
  id: string
  name: string
  value: number
  practice: boolean
}

interface PreviewClientProps {
  assessmentId: string
}

export default function AssessmentPreviewClient({ assessmentId }: PreviewClientProps) {
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null)
  const [fields, setFields] = useState<FieldRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [logoError, setLogoError] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        // Load assessment
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single()

        if (assessmentError || !assessmentData) {
          throw new Error('Failed to load assessment')
        }

        setAssessment(assessmentData)

        // Load fields (questions) ordered by order
        // Anchors are stored as JSONB in the fields table
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('fields')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('order', { ascending: true })

        if (fieldsError) {
          throw new Error('Failed to load fields')
        }

        setFields(fieldsData || [])
      } catch (error) {
        console.error('Error loading assessment:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssessment()
  }, [assessmentId, supabase])

  const handleAnswerChange = (fieldId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const renderQuestionContent = (field: FieldRow) => {
    if (!field.content) return null

    const fieldType = field.type as string

    // For rich text/description types, render HTML
    if (fieldType === 'description' || fieldType === 'rich_text' || fieldType === '2') {
      return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: field.content }} />
    }

    // For instructions type, parse JSON
    if (fieldType === 'instructions' || fieldType === '10') {
      try {
        const parsed = JSON.parse(field.content)
        return (
          <div className="rich-text-content">
            <div dangerouslySetInnerHTML={{ __html: parsed.text || '' }} />
          </div>
        )
      } catch {
        return <div className="rich-text-content">{field.content}</div>
      }
    }

    // For other types, render as plain text (but allow HTML)
    return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: field.content }} />
  }

  const renderQuestionInput = (field: FieldRow) => {
    // Anchors are stored as JSONB in the field
    const fieldAnchors: Anchor[] = (() => {
      try {
        const anchorsData = (field as FieldRow & { anchors?: unknown }).anchors
        if (anchorsData && typeof anchorsData === 'string') {
          return JSON.parse(anchorsData)
        }
        if (Array.isArray(anchorsData)) {
          return anchorsData as Anchor[]
        }
        return []
      } catch {
        return []
      }
    })()
    const currentAnswer = answers[field.id]
    const fieldType = field.type as string

    // Multiple Choice
    if (fieldType === 'multiple_choice' || fieldType === '1') {
      if (fieldAnchors.length === 0) return null

      return (
        <div className="flex flex-wrap gap-2 mt-4">
          {fieldAnchors.map((anchor, index) => (
            <label
              key={anchor.id}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="radio"
                name={`question-${field.id}`}
                value={index}
                checked={currentAnswer === index}
                onChange={() => handleAnswerChange(field.id, index)}
                className="mr-2"
              />
              <span>{anchor.name || `Option ${index + 1}`}</span>
            </label>
          ))}
        </div>
      )
    }

    // Text Input
    if (fieldType === 'text_input' || fieldType === '3') {
      return (
        <textarea
          className="w-full mt-4 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={7}
          value={currentAnswer as string || ''}
          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
          placeholder="Enter your answer here..."
        />
      )
    }

    // Slider
    if (fieldType === 'slider' || fieldType === '11') {
      const minValue = fieldAnchors.length > 0 ? Math.min(...fieldAnchors.map(a => a.value)) : 1
      const maxValue = fieldAnchors.length > 0 ? Math.max(...fieldAnchors.map(a => a.value)) : 5
      const sliderValue = currentAnswer as number || Math.round((minValue + maxValue) / 2)

      return (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Not Important</span>
            <span className="text-sm font-medium text-gray-900">{sliderValue}</span>
            <span className="text-sm text-gray-600">Critically Important</span>
          </div>
          <input
            type="range"
            min={minValue}
            max={maxValue}
            step="0.01"
            value={sliderValue}
            onChange={(e) => handleAnswerChange(field.id, parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${((sliderValue - minValue) / (maxValue - minValue)) * 100}%, #e5e7eb ${((sliderValue - minValue) / (maxValue - minValue)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
      )
    }

    // Instructions - no input needed (just display content)
    if (fieldType === 'instructions' || fieldType === '10') {
      return null
    }

    // Description/rich text - no input needed
    if (fieldType === 'description' || fieldType === 'rich_text' || fieldType === '2') {
      return null
    }

    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
          <p className="text-gray-600">The assessment you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  const logoUrl = assessment?.logo
  const backgroundUrl = assessment?.background

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Description */}
        {assessment.description && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm">
            <div 
              className="rich-text-content"
              dangerouslySetInnerHTML={{ __html: assessment.description }}
            />
          </div>
        )}

        {/* Instructions Field */}
        {(() => {
          const instructionsField = fields.find(f => {
            const fieldType = f.type as string
            return fieldType === 'instructions' || fieldType === '10'
          })
          
          if (!instructionsField) return null

          let instructionText = ''
          try {
            const parsed = JSON.parse(instructionsField.content)
            instructionText = parsed.text || ''
          } catch {
            instructionText = instructionsField.content
          }

          return (
            <div className="mb-8 p-6 bg-white rounded-lg shadow-sm">
              <div 
                className="rich-text-content"
                dangerouslySetInnerHTML={{ __html: instructionText }}
              />
            </div>
          )
        })()}

        {/* Questions */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Questions</h2>
          
          {(() => {
            // Filter out instructions field from questions list
            const questionFields = fields.filter(f => {
              const fieldType = f.type as string
              return fieldType !== 'instructions' && fieldType !== '10'
            })

            if (questionFields.length === 0) {
              return (
                <div className="text-center py-12 text-gray-500">
                  No questions yet.
                </div>
              )
            }

            return questionFields.map((field) => {
              // Skip practice questions in preview (or show them differently)
              const fieldType = field.type as string
              const questionType = QUESTION_TYPES[fieldType] || QUESTION_TYPES['description']
              
              return (
                <div key={field.id} className="bg-white rounded-lg shadow-sm p-6">
                  {/* Question Number and Content */}
                  <div className="mb-4">
                    {(() => {
                      const fieldWithExtras = field as FieldRow & { number?: number; practice?: boolean }
                      return fieldWithExtras.number && questionType?.showPage && (
                        <span className="text-lg font-semibold text-gray-900 mr-2">
                          {fieldWithExtras.number}.
                        </span>
                      )
                    })()}
                    {questionType?.showContent && renderQuestionContent(field)}
                  </div>

                  {/* Question Input */}
                  {renderQuestionInput(field)}
                </div>
              )
            })
          })()}
        </div>

        {/* Submit Button */}
        {(() => {
          const questionFields = fields.filter(f => {
            const fieldType = f.type as string
            return fieldType !== 'instructions' && fieldType !== '10'
          })
          return questionFields.length > 0
        })() && (
          <div className="mt-8 flex justify-end">
            <button className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-lg font-medium">
              Submit Answers
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
