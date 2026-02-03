'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Monitor } from 'lucide-react'
import { QUESTION_TYPES } from '@/components/forms/assessment-form'

const MOBILE_MAX_WIDTH = 768

interface Anchor {
  id: string
  name: string
  value: number
  practice: boolean
}

interface AssessmentTakingClientProps {
  assignment: {
    id: string
    expires: string
    started_at: string | null
    target_id: string | null
    custom_fields: {
      type?: string[]
      value?: string[]
    } | null
    assessment: {
      id: string
      title: string
      description: string | null
      logo: string | null
      background: string | null
      primary_color: string | null
      accent_color: string | null
      split_questions: boolean
      questions_per_page: number
      timed: boolean
      time_limit: number | null
      target: string | null
      is_360: boolean
      show_question_numbers: boolean
    } | null
    target_user?: {
      id: string
      name: string
      email: string
    } | null
  }
  fields: Array<{
    id: string
    type: string
    label?: string
    content: string
    order: number
    required: boolean
    anchors?: unknown
    insights_table?: unknown
    [key: string]: unknown
  }>
  answers: Array<{
    field_id: string
    value: string
    time?: number | null
  }>
  dimensions?: Array<{
    id: string
    name: string
    code: string
  }>
  username?: string | undefined
}

export default function AssessmentTakingClient({
  assignment,
  fields,
  answers: initialAnswers,
}: AssessmentTakingClientProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => {
    const answerMap: Record<string, string | number> = {}
    initialAnswers.forEach((answer) => {
      // Try to parse numeric answers
      const numValue = Number(answer.value)
      answerMap[answer.field_id] = isNaN(numValue) ? answer.value : numValue
    })
    return answerMap
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const questionsSectionRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Detect mobile viewport — assessments are not yet supported on mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_MAX_WIDTH)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    const ref = saveTimeoutRef
    return () => {
      const timeouts = ref.current
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Get target name from target_user or custom_fields
  const targetName = (() => {
    if (assignment.target_user?.name) {
      return assignment.target_user.name
    }
    // Fallback to custom_fields if target_user is not loaded
    if (assignment.custom_fields?.type && assignment.custom_fields?.value) {
      const nameIndex = assignment.custom_fields.type.indexOf('name')
      if (nameIndex >= 0 && assignment.custom_fields.value[nameIndex]) {
        return assignment.custom_fields.value[nameIndex]
      }
    }
    return null
  })()

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

  // Check if there are any fields/questions
  if (!fields || fields.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h1>
          <p className="text-gray-600 mb-4">This assessment does not have any questions configured.</p>
        </div>
      </div>
    )
  }

  // Assessments are not yet supported on mobile — direct users to open on desktop
  if (isMobile === true) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-gray-100 p-4">
              <Monitor className="h-12 w-12 text-gray-600" aria-hidden />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Open on a desktop</h1>
          <p className="text-gray-600">
            This assessment is best completed on a computer or tablet. Please open this link on a desktop or laptop to continue.
          </p>
        </div>
      </div>
    )
  }

  // Save answer to database
  const saveAnswerToDatabase = async (fieldId: string, value: string | number) => {
    if (!assignment?.id) {
      console.warn('Cannot save answer: assignment.id is not available', { assignment })
      return
    }

    try {
      const url = `/api/assignments/${assignment.id}/answers`
      console.log('Saving answer to database:', { url, fieldId, value: String(value) })
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_id: fieldId,
          value: String(value),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Failed to save answer for field ${fieldId}:`, {
          status: response.status,
          statusText: response.statusText,
          url,
          error: errorText,
        })
      } else {
        console.log(`Successfully saved answer for field ${fieldId}`)
      }
    } catch (error) {
      console.error('Error saving answer:', {
        fieldId,
        value: String(value),
        assignmentId: assignment.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleAnswerChange = (fieldId: string, value: string | number, isTextInput: boolean = false) => {
    // Update local state immediately for responsive UI
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))

    // For text inputs, debounce the database save (wait 1 second after user stops typing)
    // For other inputs (multiple choice, slider), save immediately
    if (isTextInput) {
      // Clear existing timeout for this field
      if (saveTimeoutRef.current[fieldId]) {
        clearTimeout(saveTimeoutRef.current[fieldId])
      }
      
      // Set new timeout to save after user stops typing
      saveTimeoutRef.current[fieldId] = setTimeout(() => {
        saveAnswerToDatabase(fieldId, value)
        delete saveTimeoutRef.current[fieldId]
      }, 1000) // 1 second debounce
    } else {
      // Save immediately for non-text inputs
      saveAnswerToDatabase(fieldId, value)
    }
  }

  const renderQuestionContent = (field: typeof fields[0]) => {
    if (!field.content) return null

    const fieldType = field.type as string
    
    // Replace [name] placeholder with target name if available
    let processedContent = field.content
    if (targetName) {
      processedContent = processedContent.replace(/\[name\]/g, targetName)
    }

    // For rich text/description types, render HTML
    if (fieldType === 'description' || fieldType === 'rich_text' || fieldType === '2') {
      return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: processedContent }} />
    }

    // For instructions type, parse JSON
    if (fieldType === 'instructions' || fieldType === '10') {
      try {
        const parsed = JSON.parse(processedContent)
        const instructionText = parsed.text || ''
        // Replace [name] in instruction text as well
        const finalText = targetName ? instructionText.replace(/\[name\]/g, targetName) : instructionText
        return (
          <div className="rich-text-content">
            <div dangerouslySetInnerHTML={{ __html: finalText }} />
          </div>
        )
      } catch {
        return <div className="rich-text-content">{processedContent}</div>
      }
    }

    // For other types, render as plain text (but allow HTML)
    return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: processedContent }} />
  }

  const renderQuestionInput = (field: typeof fields[0]) => {
    // Anchors are stored as JSONB in the field
    const fieldAnchors: Anchor[] = (() => {
      try {
        const anchorsData = field.anchors
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
          if (field.insights_table) {
            if (typeof field.insights_table === 'string') {
              return JSON.parse(field.insights_table)
            }
            if (Array.isArray(field.insights_table)) {
              return field.insights_table as string[][]
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
                          key={anchor.id || index}
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
                            key={anchor.id || colIndex}
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
                  key={anchor.id || index}
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
          className="w-full mt-4 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          rows={7}
          value={(currentAnswer as string) || ''}
          onChange={(e) => handleAnswerChange(field.id, e.target.value, true)}
          placeholder="Enter your answer here..."
        />
      )
    }

    // Slider
    if (fieldType === 'slider' || fieldType === '11') {
      const minValue = fieldAnchors.length > 0 ? Math.min(...fieldAnchors.map(a => a.value)) : 1
      const maxValue = fieldAnchors.length > 0 ? Math.max(...fieldAnchors.map(a => a.value)) : 5
      const sliderValue = (currentAnswer as number) || Math.round((minValue + maxValue) / 2)

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

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // First, save all answers before completing
      // This ensures all answers are persisted even if user didn't interact with every field
      const answerEntries = Object.entries(answers)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
      
      if (answerEntries.length > 0) {
        if (!assignment?.id) {
          console.error('Cannot save answers: assignment.id is not available', { assignment })
          throw new Error('Assignment ID is not available')
        }

        const url = `/api/assignments/${assignment.id}/answers`
        console.log(`Saving ${answerEntries.length} answers before completion:`, { url, assignmentId: assignment.id })
        
        const answerPromises = answerEntries.map(([fieldId, value]) => {
          return fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              field_id: fieldId,
              value: String(value),
            }),
          }).then(async (response) => {
            if (!response.ok) {
              const errorText = await response.text()
              const errorData = await JSON.parse(errorText).catch(() => ({}))
              console.error(`Failed to save answer for field ${fieldId}:`, {
                status: response.status,
                statusText: response.statusText,
                url,
                error: errorData,
                errorText,
              })
            } else {
              console.log(`Successfully saved answer for field ${fieldId}`)
            }
            return { fieldId, success: response.ok }
          }).catch((error) => {
            console.error(`Error saving answer for field ${fieldId}:`, {
              fieldId,
              value: String(value),
              url,
              error: error instanceof Error ? error.message : String(error),
            })
            return { fieldId, success: false }
          })
        })

        // Wait for all answers to be saved (using allSettled to continue even if some fail)
        const answerResults = await Promise.allSettled(answerPromises)
        const failedAnswers = answerResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
        
        if (failedAnswers.length > 0) {
          console.warn(`Some answers failed to save: ${failedAnswers.length} of ${answerEntries.length}`)
          // Continue anyway - individual saves may have already succeeded via handleAnswerChange
        }
      }

      // Now mark assignment as complete
      const response = await fetch(`/api/assignments/${assignment.id}/complete`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete assignment')
      }

      // Redirect to completion page
      router.push(`/assignment/${assignment.id}/complete`)
    } catch (error) {
      console.error('Error completing assignment:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete assignment. Please try again.')
      setIsSubmitting(false)
    }
  }

  const logoUrl = assessment.logo
  const backgroundUrl = assessment.background

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
    // Replace [name] placeholder with target name if available
    if (targetName) {
      instructionText = instructionText.replace(/\[name\]/g, targetName)
    }
  }

  // Filter out instructions field and sort by order
  const allFields = [...fields]
    .filter(f => {
      const fieldType = f.type as string
      return fieldType !== 'instructions' && fieldType !== '10'
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  // Split fields into pages based on page_break fields
  const questionPages: typeof fields[] = []
  let currentPageFields: typeof fields = []

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
  const isLastPage = currentPage === totalPages - 1
  const isFirstPage = currentPage === 0

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
                    <div className="question-with-number flex items-start">
                      {((assessment as typeof assessment & { show_question_numbers?: boolean })?.show_question_numbers !== false) && isActualQuestion && questionType?.showPage && pageQuestionCounter > 0 && (
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

        {/* Page Navigation */}
        {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setCurrentPage(Math.max(0, currentPage - 1))
                  // Scroll to questions section after page change (if not on instructions page)
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
                    // Scroll to questions section after page change (if moving to a question page)
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
          )}

          {/* Submit Button - Only on Final Page (or single page) */}
          {(isLastPage || totalPages === 1) && !isInstructionsPage && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          )}
      </div>
    </div>
  )
}

