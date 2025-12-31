'use client'

import { useState } from 'react'
import Image from 'next/image'
import { QUESTION_TYPES } from '@/components/forms/assessment-form'

interface Anchor {
  id: string
  name: string
  value: number
  practice: boolean
}

interface AssignmentResultsClientProps {
  assessment: {
    id: string
    title: string
    description: string | null
    logo: string | null
    background: string | null
    primary_color: string | null
    accent_color: string | null
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
}

export default function AssignmentResultsClient({
  assessment,
  fields,
  answers,
}: AssignmentResultsClientProps) {
  const [logoError, setLogoError] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)

  // Create answer map for quick lookup
  const answerMap: Record<string, string | number> = {}
  answers.forEach((answer) => {
    // Try to parse numeric answers
    const numValue = Number(answer.value)
    answerMap[answer.field_id] = isNaN(numValue) ? answer.value : numValue
  })

  const renderQuestionContent = (field: typeof fields[0]) => {
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

  const renderAnswerDisplay = (field: typeof fields[0]) => {
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

    const currentAnswer = answerMap[field.id]
    const fieldType = field.type as string

    // Multiple Choice
    if (fieldType === 'multiple_choice' || fieldType === '1') {
      if (fieldAnchors.length === 0) return <p className="text-gray-500 italic">No answer provided</p>

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

      const selectedIndex = typeof currentAnswer === 'number' ? currentAnswer : null

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
                          className={`p-0 text-center w-1/5 ${
                            selectedIndex === index ? 'bg-indigo-100' : ''
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center px-3 py-2 border border-gray-300 w-full h-full whitespace-nowrap m-0 ${
                              selectedIndex === index 
                                ? 'bg-indigo-100 font-semibold' 
                                : 'bg-white'
                            }`}
                            style={{ 
                              borderRadius: index === 0 ? '0.375rem 0 0 0' : index === fieldAnchors.length - 1 ? '0 0.375rem 0 0' : '0',
                              borderLeft: index === 0 ? '1px solid rgb(209 213 219)' : 'none',
                              borderRight: '1px solid rgb(209 213 219)',
                              borderTop: '1px solid rgb(209 213 219)',
                              borderBottom: '1px solid rgb(209 213 219)'
                            }}
                          >
                            <span className="text-sm font-medium text-gray-900">
                              {anchor.name || `Option ${index + 1}`}
                            </span>
                            {selectedIndex === index && (
                              <span className="ml-2 text-indigo-600">✓</span>
                            )}
                          </div>
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
                            className={`px-5 py-4 text-sm text-gray-900 whitespace-pre-wrap w-1/5 border-x border-gray-300 ${
                              selectedIndex === colIndex ? 'bg-indigo-50' : ''
                            }`}
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
              {fieldAnchors.map((anchor, index) => {
                const isSelected = selectedIndex === index
                return (
                  <div
                    key={anchor.id || index}
                    className={`flex items-center px-4 py-2 border rounded-md ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 font-semibold'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <span className={isSelected ? 'text-indigo-600 mr-2' : 'text-gray-500 mr-2'}>
                      {isSelected ? '✓' : '○'}
                    </span>
                    <span className={isSelected ? 'text-indigo-900' : 'text-gray-700'}>
                      {anchor.name || `Option ${index + 1}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // Text Input
    if (fieldType === 'text_input' || fieldType === '3') {
      const answerText = (currentAnswer as string) || ''
      return (
        <div className="mt-4">
          <div className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900 whitespace-pre-wrap">
            {answerText || <span className="text-gray-400 italic">No answer provided</span>}
          </div>
        </div>
      )
    }

    // Slider
    if (fieldType === 'slider' || fieldType === '11') {
      const minValue = fieldAnchors.length > 0 ? Math.min(...fieldAnchors.map(a => a.value)) : 1
      const maxValue = fieldAnchors.length > 0 ? Math.max(...fieldAnchors.map(a => a.value)) : 5
      const sliderValue = typeof currentAnswer === 'number' ? currentAnswer : Math.round((minValue + maxValue) / 2)

      return (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Not Important</span>
            <span className="text-sm font-medium text-gray-900">{sliderValue}</span>
            <span className="text-sm text-gray-600">Critically Important</span>
          </div>
          <div className="relative w-full h-2 bg-gray-200 rounded-lg">
            <div
              className="absolute h-2 bg-indigo-600 rounded-lg"
              style={{
                width: `${((sliderValue - minValue) / (maxValue - minValue)) * 100}%`
              }}
            />
          </div>
        </div>
      )
    }

    // Instructions - no answer needed
    if (fieldType === 'instructions' || fieldType === '10') {
      return null
    }

    // Description/rich text - no answer needed
    if (fieldType === 'description' || fieldType === 'rich_text' || fieldType === '2') {
      return null
    }

    return <p className="text-gray-500 italic">No answer provided</p>
  }

  const logoUrl = assessment.logo
  const backgroundUrl = assessment.background

  // Filter out instructions field and sort by order
  const allFields = [...fields]
    .filter(f => {
      const fieldType = f.type as string
      return fieldType !== 'instructions' && fieldType !== '10'
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  // Get instructions field
  const instructionsField = fields.find(f => {
    const fieldType = f.type as string
    return fieldType === 'instructions' || fieldType === '10'
  })

  let instructionText = ''
  if (instructionsField) {
    try {
      const parsed = JSON.parse(instructionsField.content)
      instructionText = parsed.text || ''
    } catch {
      instructionText = instructionsField.content
    }
  }

  let questionCounter = 0

  return (
    <div className="space-y-6">
      {/* Header with Background, Logo, and Title */}
      <div className="relative w-full h-32 md:h-40 overflow-hidden bg-white rounded-lg shadow-sm">
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

      {/* Instructions Field */}
      {instructionText && (
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div 
            className="rich-text-content"
            dangerouslySetInnerHTML={{ __html: instructionText }}
          />
        </div>
      )}

      {/* Questions and Answers */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Assessment Results</h2>
        
        {allFields.map((field) => {
          const fieldType = field.type as string
          const questionType = QUESTION_TYPES[fieldType] || QUESTION_TYPES['description']
          
          // Check if this is an actual question (not a description)
          const isActualQuestion = fieldType !== 'description' && fieldType !== 'rich_text' && fieldType !== '2'
          
          // Increment question number only for actual questions
          if (isActualQuestion && questionType?.showPage) {
            questionCounter++
          }
          
          return (
            <div key={field.id} className="bg-white rounded-lg shadow-sm p-6">
              {/* Question Number and Content */}
              <div className="mb-4">
                {questionType?.showContent && (
                  <div className="flex items-start">
                    {isActualQuestion && questionType?.showPage && questionCounter > 0 && (
                      <span className="text-lg font-semibold text-gray-900 mr-2 flex-shrink-0">
                        {questionCounter}.
                      </span>
                    )}
                    <div className="flex-1">
                      {renderQuestionContent(field)}
                    </div>
                  </div>
                )}
              </div>

              {/* Answer Display */}
              {isActualQuestion && renderAnswerDisplay(field)}
            </div>
          )
        })}

        {allFields.filter(f => {
          const fieldType = f.type as string
          return fieldType !== 'description' && fieldType !== 'rich_text' && fieldType !== '2'
        }).length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            No questions were answered in this assessment.
          </div>
        )}
      </div>
    </div>
  )
}
