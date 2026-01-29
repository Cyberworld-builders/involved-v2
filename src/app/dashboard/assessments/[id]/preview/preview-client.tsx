'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [currentPage, setCurrentPage] = useState(0)
  const questionsSectionRef = useRef<HTMLDivElement>(null)
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

      // Parse insights table from field data
      const insightsTable = (() => {
        try {
          const fieldWithExtras = field as FieldRow & { insights_table?: unknown }
          if (fieldWithExtras.insights_table) {
            if (typeof fieldWithExtras.insights_table === 'string') {
              return JSON.parse(fieldWithExtras.insights_table)
            }
            if (Array.isArray(fieldWithExtras.insights_table)) {
              return fieldWithExtras.insights_table as string[][]
            }
          }
        } catch {
          // Ignore parsing errors
        }
        return []
      })()

      return (
        <div className="mt-4">
          {/* Insights Table with buttons as headers */}
          {insightsTable.length > 0 ? (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-100">
                    <tr>
                      {fieldAnchors.map((anchor, index) => (
                        <th
                          key={anchor.id}
                          className="p-0 text-center w-1/5"
                        >
                          <label
                            className={`flex items-center justify-center px-3 py-6 border cursor-pointer transition-colors w-full h-full whitespace-nowrap m-0 ${
                              currentAnswer === index 
                                ? 'bg-[#da7327] hover:bg-[#c8651f] border-[#da7327] text-white' 
                                : 'bg-white hover:bg-gray-50 border-gray-300'
                            }`}
                            style={{ 
                              borderRadius: index === 0 ? '0.375rem 0 0 0' : index === fieldAnchors.length - 1 ? '0 0.375rem 0 0' : '0',
                              borderLeft: index === 0 ? '1px solid rgb(209 213 219)' : 'none',
                              borderRight: '1px solid rgb(209 213 219)',
                              borderTop: '1px solid rgb(209 213 219)',
                              borderBottom: '1px solid rgb(209 213 219)'
                            }}
                          >
                            <input
                              type="radio"
                              name={`question-${field.id}`}
                              value={index}
                              checked={currentAnswer === index}
                              onChange={() => handleAnswerChange(field.id, index)}
                              className="sr-only"
                              aria-label={anchor.name || `Option ${index + 1}`}
                            />
                            <span className={`text-sm font-medium ${currentAnswer === index ? 'text-white' : 'text-gray-900'}`}>
                              {anchor.name || `Option ${index + 1}`}
                            </span>
                          </label>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {insightsTable.map((row: string[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {fieldAnchors.map((anchor, colIndex) => (
                          <td
                            key={anchor.id}
                            className="px-5 py-4 text-sm text-gray-900 whitespace-pre-wrap w-1/5 border-x border-gray-300"
                          >
                            {row[colIndex] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Fallback: buttons only if no insights table */
            <div className="flex flex-wrap gap-2">
              {fieldAnchors.map((anchor, index) => (
                <label
                  key={anchor.id}
                  className={`flex items-center justify-center px-4 py-6 border rounded-md cursor-pointer transition-colors ${
                    currentAnswer === index
                      ? 'bg-[#da7327] border-[#da7327] hover:bg-[#c8651f] text-white'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${field.id}`}
                    value={index}
                    checked={currentAnswer === index}
                    onChange={() => handleAnswerChange(field.id, index)}
                    className="sr-only"
                    aria-label={anchor.name || `Option ${index + 1}`}
                  />
                  <span>{anchor.name || `Option ${index + 1}`}</span>
                </label>
              ))}
            </div>
          )}
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Instructions and Questions with Page Breaks */}
        {(() => {
          // Get instructions field
          const instructionsField = fields.find(f => {
            const fieldType = f.type as string
            return fieldType === 'instructions' || fieldType === '10'
          })

          let instructionText = ''
          const hasInstructions = !!instructionsField
          if (instructionsField) {
            try {
              const parsed = JSON.parse(instructionsField.content)
              instructionText = parsed.text || ''
            } catch {
              instructionText = instructionsField.content
            }
          }

          // Filter out instructions field
          const allFields = [...fields]
            .filter(f => {
              const fieldType = f.type as string
              return fieldType !== 'instructions' && fieldType !== '10'
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0))

          // Split fields into pages based on page_break fields
          const questionPages: FieldRow[][] = []
          let currentPageFields: FieldRow[] = []

          allFields.forEach((field) => {
            const fieldType = field.type as string
            if (fieldType === 'page_break') {
              // Save current page and start a new one
              if (currentPageFields.length > 0) {
                questionPages.push(currentPageFields)
                currentPageFields = []
              }
            } else {
              currentPageFields.push(field)
            }
          })

          // Add the last page if it has fields
          if (currentPageFields.length > 0) {
            questionPages.push(currentPageFields)
          }

          // Calculate total pages: instructions page (if exists) + question pages
          const totalPages = hasInstructions ? questionPages.length + 1 : questionPages.length
          const instructionsPageIndex = 0

          // Determine if we're on instructions page or a question page
          const isInstructionsPage = hasInstructions && currentPage === instructionsPageIndex
          const questionPageIndex = hasInstructions ? currentPage - 1 : currentPage
          const currentPageFieldsList = isInstructionsPage ? [] : (questionPages[questionPageIndex] || [])

          // If no pages and no instructions, show empty state
          if (questionPages.length === 0 && !hasInstructions) {
            return (
              <div className="space-y-8">
                <div ref={questionsSectionRef} className="sr-only">
                  {/* Hidden ref point for scrolling */}
                </div>
                <div className="text-center py-12 text-gray-500">
                  No questions yet.
                </div>
              </div>
            )
          }

          // Calculate starting question number for this page
          // Only count questions from question pages (skip instructions page)
          let startingQuestionNumber = 0
          if (!isInstructionsPage) {
            for (let pageIdx = 0; pageIdx < questionPageIndex; pageIdx++) {
              const pageFields = questionPages[pageIdx] || []
              pageFields.forEach((field) => {
                const fieldType = field.type as string
                const questionType = QUESTION_TYPES[fieldType] || QUESTION_TYPES['description']
                const isActualQuestion = fieldType !== 'description' && fieldType !== 'rich_text' && fieldType !== '2' && fieldType !== 'page_break'
                
                if (isActualQuestion && questionType?.showPage) {
                  startingQuestionNumber++
                }
              })
            }
          }

          let pageQuestionCounter = startingQuestionNumber

          return (
            <>
              {/* Instructions Page */}
              {isInstructionsPage && instructionText && (
                <div className="space-y-8">
                  <div className="p-6 bg-white rounded-lg shadow-sm">
                    <div 
                      className="rich-text-content"
                      dangerouslySetInnerHTML={{ __html: instructionText }}
                    />
                  </div>
                </div>
              )}

              {/* Questions with Page Breaks */}
              {!isInstructionsPage && (
                <div className="space-y-8">
                  <div ref={questionsSectionRef} className="sr-only">
                    {/* Hidden ref point for scrolling */}
                  </div>
                  
                  {/* Current Page Fields */}
                  {currentPageFieldsList.map((field) => {
                const fieldType = field.type as string
                const questionType = QUESTION_TYPES[fieldType] || QUESTION_TYPES['description']
                
                // Skip page breaks (they're just markers)
                if (fieldType === 'page_break') {
                  return null
                }
                
                // Check if this is an actual question (not a description)
                const isActualQuestion = fieldType !== 'description' && fieldType !== 'rich_text' && fieldType !== '2'
                
                // Increment question number only for actual questions
                if (isActualQuestion && questionType?.showPage) {
                  pageQuestionCounter++
                }
                
                return (
                  <div key={field.id} className="bg-white rounded-lg shadow-sm p-6">
                    {/* Question Number and Content */}
                    <div className="mb-4">
                      {questionType?.showContent && (
                        <div className="flex items-start">
                          {((assessment as AssessmentRow & { show_question_numbers?: boolean })?.show_question_numbers !== false) && isActualQuestion && questionType?.showPage && pageQuestionCounter > 0 && (
                            <span className="text-lg font-semibold text-gray-900 mr-2 flex-shrink-0">
                              {pageQuestionCounter}.
                            </span>
                          )}
                          <div className="flex-1">
                            {renderQuestionContent(field)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Question Input */}
                    {renderQuestionInput(field)}
                  </div>
                )
              })}
                </div>
              )}
            </>
          )
        })()}

        {/* Page Navigation */}
        {(() => {
          const instructionsField = fields.find(f => {
            const fieldType = f.type as string
            return fieldType === 'instructions' || fieldType === '10'
          })
          const hasInstructions = !!instructionsField
          const allFields = [...fields]
            .filter(f => {
              const fieldType = f.type as string
              return fieldType !== 'instructions' && fieldType !== '10'
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0))
          const questionPages: FieldRow[][] = []
          let currentPageFields: FieldRow[] = []
          allFields.forEach((field) => {
            const fieldType = field.type as string
            if (fieldType === 'page_break') {
              if (currentPageFields.length > 0) {
                questionPages.push(currentPageFields)
                currentPageFields = []
              }
            } else {
              currentPageFields.push(field)
            }
          })
          if (currentPageFields.length > 0) {
            questionPages.push(currentPageFields)
          }
          const totalPages = hasInstructions ? questionPages.length + 1 : questionPages.length
          const instructionsPageIndex = 0
          const isInstructionsPage = hasInstructions && currentPage === instructionsPageIndex
          const isFirstPage = currentPage === 0
          const isLastPage = currentPage === totalPages - 1

          if (totalPages <= 1) return null

          return (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setCurrentPage(Math.max(0, currentPage - 1))
                  if (currentPage > 1 || !hasInstructions) {
                    setTimeout(() => {
                      questionsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 100)
                  }
                }}
                disabled={isFirstPage}
                className={`px-6 py-2 rounded-md font-medium ${
                  isFirstPage
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              
              {!isLastPage && (
                <button
                  onClick={() => {
                    setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                    if (currentPage >= instructionsPageIndex || !hasInstructions) {
                      setTimeout(() => {
                        questionsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }
                  }}
                  className="px-6 py-2 rounded-md font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Next
                </button>
              )}
            </div>
          )
        })()}

        {/* Submit Button - Only on Final Page (or single page) */}
        {(() => {
          const instructionsField = fields.find(f => {
            const fieldType = f.type as string
            return fieldType === 'instructions' || fieldType === '10'
          })
          const hasInstructions = !!instructionsField
          const allFields = [...fields]
            .filter(f => {
              const fieldType = f.type as string
              return fieldType !== 'instructions' && fieldType !== '10'
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0))
          const questionPages: FieldRow[][] = []
          let currentPageFields: FieldRow[] = []
          allFields.forEach((field) => {
            const fieldType = field.type as string
            if (fieldType === 'page_break') {
              if (currentPageFields.length > 0) {
                questionPages.push(currentPageFields)
                currentPageFields = []
              }
            } else {
              currentPageFields.push(field)
            }
          })
          if (currentPageFields.length > 0) {
            questionPages.push(currentPageFields)
          }
          const totalPages = hasInstructions ? questionPages.length + 1 : questionPages.length
          const instructionsPageIndex = 0
          const isInstructionsPage = hasInstructions && currentPage === instructionsPageIndex
          const isLastPage = currentPage === totalPages - 1

          if (!((isLastPage || totalPages === 1) && !isInstructionsPage)) return null

          return (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-lg font-medium">
                Submit Answers
              </button>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

