'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/rich-text-editor'
import { GripVertical } from 'lucide-react'

export interface Dimension {
  id: string
  name: string
  code: string
  parent_id: string | null
}

export interface Anchor {
  id: string
  name: string
  value: number
  practice: boolean
}

export interface Field {
  id: string
  type: 'rich_text' | 'multiple_choice' | 'slider'
  content: string
  dimension_id: string | null
  anchors: Anchor[]
  order: number
}

export interface AssessmentFormData {
  // Details
  title: string
  description: string
  logo: File | null
  background: File | null
  primary_color: string
  accent_color: string
  
  // Settings
  split_questions: boolean
  questions_per_page: number
  timed: boolean
  time_limit: number | null
  target: string
  is_360: boolean
  
  // Dimensions
  dimensions: Dimension[]
  
  // Fields
  fields: Field[]
}

interface AssessmentFormProps {
  initialData?: Partial<AssessmentFormData>
  onSubmit: (data: AssessmentFormData) => void
  isLoading?: boolean
  submitText?: string
  existingLogoUrl?: string | null
  existingBackgroundUrl?: string | null
}

export default function AssessmentForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitText = 'Create Assessment',
  existingLogoUrl,
  existingBackgroundUrl,
}: AssessmentFormProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'settings' | 'dimensions' | 'fields'>('details')
  const [formData, setFormData] = useState<AssessmentFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    logo: initialData?.logo || null,
    background: initialData?.background || null,
    primary_color: initialData?.primary_color || '#2D2E30',
    accent_color: initialData?.accent_color || '#FFBA00',
    split_questions: initialData?.split_questions || false,
    questions_per_page: initialData?.questions_per_page || 10,
    timed: initialData?.timed || false,
    time_limit: initialData?.time_limit || null,
    target: initialData?.target || '',
    is_360: initialData?.is_360 || false,
    dimensions: initialData?.dimensions || [],
    fields: initialData?.fields || [],
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(existingLogoUrl || null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(existingBackgroundUrl || null)
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)

  const handleInputChange = (field: keyof AssessmentFormData, value: string | number | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value as never }))
  }

  const normalizeFieldOrders = (fields: Field[]): Field[] => {
    return fields.map((f, idx) => ({ ...f, order: idx + 1 }))
  }

  const createNewField = (type: 'rich_text' | 'multiple_choice' | 'slider', nextOrder: number): Field => {
    return {
      id: `field-${Date.now()}`,
      type,
      content: '',
      dimension_id: null,
      anchors:
        type === 'multiple_choice' || type === 'slider'
          ? [
              { id: `anchor-${Date.now()}-1`, name: '', value: 1, practice: false },
              { id: `anchor-${Date.now()}-2`, name: '', value: 2, practice: false },
            ]
          : [],
      order: nextOrder,
    }
  }

  const handleFileChange = (field: 'logo' | 'background', file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }))
    
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (field === 'logo') {
          setLogoPreview(e.target?.result as string)
        } else {
          setBackgroundPreview(e.target?.result as string)
        }
      }
      reader.readAsDataURL(file)
    } else {
      if (field === 'logo') {
        setLogoPreview(null)
      } else {
        setBackgroundPreview(null)
      }
    }
  }

  const handleAddDimension = () => {
    const newDimension: Dimension = {
      id: `dim-${Date.now()}`,
      name: '',
      code: '',
      parent_id: null,
    }
    setFormData(prev => ({
      ...prev,
      dimensions: [...prev.dimensions, newDimension],
    }))
  }

  const handleUpdateDimension = (id: string, field: keyof Dimension, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.map(dim =>
        dim.id === id ? { ...dim, [field]: value } : dim
      ),
    }))
  }

  const handleDeleteDimension = (id: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.filter(dim => dim.id !== id),
      fields: prev.fields.filter(field => field.dimension_id !== id),
    }))
  }

  const handleDownloadDimensionsTemplate = () => {
    // Create CSV template
    const headers = ['Dimension Name', 'Dimension Code']
    const rows = formData.dimensions.length > 0 
      ? formData.dimensions.map(dim => [dim.name, dim.code])
      : [['Leadership', 'LEAD'], ['Communication', 'COMM'], ['Teamwork', 'TEAM']]
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dimensions-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleUploadDimensionsCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text) {
          alert('Error: File appears to be empty')
          return
        }

        // Handle different line endings
        const lines = text.split(/\r?\n/).filter(line => line.trim())
        if (lines.length < 2) {
          alert('Error: CSV file must have at least a header row and one data row')
          return
        }

        // Parse headers
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          result.push(current.trim())
          return result
        }

        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())

        // Find column indices
        const nameIndex = headers.findIndex(h => 
          h.toLowerCase().includes('dimension') && h.toLowerCase().includes('name')
        )
        const codeIndex = headers.findIndex(h => 
          h.toLowerCase().includes('dimension') && h.toLowerCase().includes('code')
        )

        if (nameIndex === -1 || codeIndex === -1) {
          alert(`Invalid CSV format. Expected columns: Dimension Name, Dimension Code. Found: ${headers.join(', ')}`)
          return
        }

        // Parse CSV and add dimensions
        const newDimensions: Dimension[] = []
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim())
          
          if (values.length < Math.max(nameIndex, codeIndex) + 1) {
            continue
          }

          const dimensionName = values[nameIndex]?.trim()
          const dimensionCode = values[codeIndex]?.trim()

          if (!dimensionName || !dimensionCode) {
            continue
          }

          // Check if dimension already exists (by name or code)
          const exists = formData.dimensions.some(
            d => d.name.toLowerCase() === dimensionName.toLowerCase() ||
                 d.code.toLowerCase() === dimensionCode.toLowerCase()
          )

          if (!exists) {
            newDimensions.push({
              id: `dim-${Date.now()}-${i}`,
              name: dimensionName,
              code: dimensionCode,
              parent_id: null,
            })
          }
        }

        if (newDimensions.length > 0) {
          setFormData(prev => ({
            ...prev,
            dimensions: [...prev.dimensions, ...newDimensions],
          }))
          alert(`Successfully loaded ${newDimensions.length} dimension(s) from CSV`)
        } else {
          alert('No new dimensions found in CSV. All dimensions may already exist.')
        }
      } catch (error) {
        console.error('Error parsing CSV:', error)
        alert(`Error parsing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    reader.onerror = () => {
      alert('Error reading file')
    }
    reader.readAsText(file)
    
    // Reset the input so the same file can be uploaded again
    event.target.value = ''
  }

  const handleAddField = (type: 'rich_text' | 'multiple_choice' | 'slider') => {
    setFormData(prev => ({
      ...prev,
      fields: normalizeFieldOrders([...prev.fields, createNewField(type, prev.fields.length + 1)]),
    }))
  }

  const handleInsertFieldAt = (insertAfterIndex: number, type: 'rich_text' | 'multiple_choice' | 'slider') => {
    setFormData(prev => {
      const nextFields = [...prev.fields]
      nextFields.splice(insertAfterIndex + 1, 0, createNewField(type, insertAfterIndex + 2))
      return {
        ...prev,
        fields: normalizeFieldOrders(nextFields),
      }
    })
  }

  const handleUpdateField = (id: string, field: keyof Field, value: string | 'rich_text' | 'multiple_choice' | 'slider' | Anchor[] | number | null) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      ),
    }))
  }

  const handleDeleteField = (id: string) => {
    setFormData(prev => ({
      ...prev,
      fields: normalizeFieldOrders(prev.fields.filter(f => f.id !== id)),
    }))
  }

  const reorderFields = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    setFormData(prev => {
      const nextFields = [...prev.fields]
      const [moved] = nextFields.splice(fromIndex, 1)
      nextFields.splice(toIndex, 0, moved)
      return {
        ...prev,
        fields: normalizeFieldOrders(nextFields),
      }
    })
  }

  const handleDropOnField = (dropTargetId: string) => {
    if (!draggedFieldId || draggedFieldId === dropTargetId) return
    const fromIndex = formData.fields.findIndex(f => f.id === draggedFieldId)
    const toIndex = formData.fields.findIndex(f => f.id === dropTargetId)
    if (fromIndex === -1 || toIndex === -1) return
    reorderFields(fromIndex, toIndex)
  }

  const handleAddAnchor = (fieldId: string) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem) return

    const newAnchor: Anchor = {
      id: `anchor-${Date.now()}`,
      name: '',
      value: fieldItem.anchors.length + 1,
      practice: false,
    }
    handleUpdateField(fieldId, 'anchors', [...fieldItem.anchors, newAnchor])
  }

  const handleUpdateAnchor = (fieldId: string, anchorId: string, fieldKey: keyof Anchor, value: string | number | boolean) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem) return

    const updatedAnchors = fieldItem.anchors.map(anchor =>
      anchor.id === anchorId ? { ...anchor, [fieldKey]: value } : anchor
    )
    handleUpdateField(fieldId, 'anchors', updatedAnchors)
  }

  const handleDeleteAnchor = (fieldId: string, anchorId: string) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem) return

    handleUpdateField(fieldId, 'anchors', fieldItem.anchors.filter(a => a.id !== anchorId))
  }

  const handleReverseAnchors = (fieldId: string) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem) return

    const reversedAnchors = [...fieldItem.anchors].reverse().map((anchor, index) => ({
      ...anchor,
      value: index + 1,
    }))
    handleUpdateField(fieldId, 'anchors', reversedAnchors)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'settings', label: 'Settings' },
    { id: 'dimensions', label: 'Dimensions' },
    // Fields tab hidden for Phase 1
    // { id: 'fields', label: 'Fields' },
  ] as const

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Information</CardTitle>
              <CardDescription>
                Basic information about the assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
                  Title
                </label>
                <p className="text-sm text-gray-500 mb-3">The name of the assessment.</p>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <p className="text-sm text-gray-500 mb-3">A brief description of the assessment. Supports rich text formatting.</p>
                <RichTextEditor
                  content={formData.description}
                  onChange={(content) => handleInputChange('description', content)}
                  placeholder="Enter assessment description..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding & Images</CardTitle>
              <CardDescription>
                Logo, background images, and brand colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div>
                <label htmlFor="logo" className="block text-sm font-medium text-gray-900 mb-2">
                  Logo
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Assessment logo. This will show up in the header of the assessment.
                </p>
                {logoPreview && (
                  <div className="mb-3">
                    <Image src={logoPreview} alt="Logo preview" width={80} height={80} className="h-20 w-auto rounded" />
                  </div>
                )}
                <input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={(e) => handleFileChange('logo', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Background */}
              <div>
                <label htmlFor="background" className="block text-sm font-medium text-gray-900 mb-2">
                  Background Image
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Assessment background image. This will show up in the header of the assessment.
                </p>
                {backgroundPreview && (
                  <div className="mb-3">
                    <Image src={backgroundPreview} alt="Background preview" width={200} height={100} className="h-20 w-auto rounded" />
                  </div>
                )}
                <input
                  type="file"
                  id="background"
                  accept="image/*"
                  onChange={(e) => handleFileChange('background', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Primary Color */}
              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-900 mb-2">
                  Primary Color
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  The primary color of the assessment.
                </p>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    placeholder="#2D2E30"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label htmlFor="accent_color" className="block text-sm font-medium text-gray-900 mb-2">
                  Accent Color
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  The secondary color of the assessment.
                </p>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="accent_color"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    placeholder="#FFBA00"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Settings</CardTitle>
            <CardDescription>
              Configure how the assessment behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Split Questions */}
            <div>
              <label htmlFor="split_questions" className="block text-sm font-medium text-gray-900 mb-2">
                Split Questions into Pages?
              </label>
              <p className="text-sm text-gray-500 mb-3">
                If enabled, questions will be split across multiple pages.
              </p>
              <select
                id="split_questions"
                value={formData.split_questions ? '1' : '0'}
                onChange={(e) => handleInputChange('split_questions', e.target.value === '1')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            {/* Questions Per Page */}
            {formData.split_questions && (
              <div>
                <label htmlFor="questions_per_page" className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Questions per Page
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  How many questions to show on each page.
                </p>
                <input
                  type="number"
                  id="questions_per_page"
                  value={formData.questions_per_page}
                  onChange={(e) => handleInputChange('questions_per_page', parseInt(e.target.value) || 10)}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Timed */}
            <div>
              <label htmlFor="timed" className="block text-sm font-medium text-gray-900 mb-2">
                Timed Assessment?
              </label>
              <p className="text-sm text-gray-500 mb-3">
                If enabled, the assessment will have a time limit.
              </p>
              <select
                id="timed"
                value={formData.timed ? '1' : '0'}
                onChange={(e) => handleInputChange('timed', e.target.value === '1')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            {/* Time Limit */}
            {formData.timed && (
              <div>
                <label htmlFor="time_limit" className="block text-sm font-medium text-gray-900 mb-2">
                  Time Limit (minutes)
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Maximum time allowed to complete the assessment.
                </p>
                <input
                  type="number"
                  id="time_limit"
                  value={formData.time_limit || ''}
                  onChange={(e) => handleInputChange('time_limit', e.target.value ? parseInt(e.target.value) : null)}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Target */}
            <div>
              <label htmlFor="target" className="block text-sm font-medium text-gray-900 mb-2">
                Target User
              </label>
              <p className="text-sm text-gray-500 mb-3">
                The target user for this assessment (optional).
              </p>
              <input
                type="text"
                id="target"
                value={formData.target}
                onChange={(e) => handleInputChange('target', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 360 Assessment */}
            <div>
              <label htmlFor="is_360" className="block text-sm font-medium text-gray-900 mb-2">
                360 Assessment?
              </label>
              <p className="text-sm text-gray-500 mb-3">
                If enabled, this is a 360-degree feedback assessment.
              </p>
              <select
                id="is_360"
                value={formData.is_360 ? '1' : '0'}
                onChange={(e) => handleInputChange('is_360', e.target.value === '1')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dimensions Tab */}
      {activeTab === 'dimensions' && (
        <Card>
          <CardHeader>
            <CardTitle>Dimensions</CardTitle>
            <CardDescription>
              Manage assessment dimensions for organizing questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button variant="outline" type="button" onClick={handleDownloadDimensionsTemplate}>
                  📥 Download Template
                </Button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleUploadDimensionsCSV}
                    className="hidden"
                    id="dimensions-csv-upload-input"
                  />
                  <Button variant="outline" type="button" onClick={() => document.getElementById('dimensions-csv-upload-input')?.click()}>
                    📤 Upload CSV
                  </Button>
                </label>
              </div>
              <Button type="button" onClick={handleAddDimension}>
                + Add Dimension
              </Button>
            </div>

            {formData.dimensions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No dimensions yet. Add your first dimension to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.dimensions.map((dimension) => (
                  <div key={dimension.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={dimension.name}
                          onChange={(e) => handleUpdateDimension(dimension.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Leadership"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Code
                        </label>
                        <input
                          type="text"
                          value={dimension.code}
                          onChange={(e) => handleUpdateDimension(dimension.id, 'code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., LEAD"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDeleteDimension(dimension.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fields Tab */}
      {activeTab === 'fields' && (
        <Card>
          <CardHeader>
            <CardTitle>Fields & Questions</CardTitle>
            <CardDescription>
              Add and manage assessment fields and questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button type="button" onClick={() => handleAddField('rich_text')}>
                + Rich Text
              </Button>
              <Button type="button" onClick={() => handleAddField('multiple_choice')}>
                + Multiple Choice
              </Button>
              <Button type="button" onClick={() => handleAddField('slider')}>
                + Slider
              </Button>
            </div>

            {formData.fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No fields yet. Add your first field to get started.
              </div>
            ) : (
              <div className="space-y-6">
                {formData.fields.map((field, index) => (
                  <div key={field.id} className="space-y-3">
                    <div
                      className={`border border-gray-200 rounded-lg p-4 ${draggedFieldId === field.id ? 'opacity-60' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggedFieldId(field.id)
                      }}
                      onDragEnd={() => setDraggedFieldId(null)}
                      onDragOver={(e) => {
                        // Required to allow drop
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDropOnField(field.id)
                        setDraggedFieldId(null)
                      }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5 text-gray-400" aria-hidden="true" title="Drag to reorder">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {field.type === 'rich_text'
                                ? 'Rich Text'
                                : field.type === 'multiple_choice'
                                  ? 'Multiple Choice'
                                  : 'Slider'}{' '}
                              Field #{index + 1}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Drag to reorder
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDeleteField(field.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>

                    {/* Dimension Selection */}
                    {formData.dimensions.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Dimension
                        </label>
                        <select
                          value={field.dimension_id || ''}
                          onChange={(e) => handleUpdateField(field.id, 'dimension_id', e.target.value || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">None</option>
                          {formData.dimensions.map((dim) => (
                            <option key={dim.id} value={dim.id}>
                              {dim.name} ({dim.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Content */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Content
                      </label>
                      {field.type === 'rich_text' ? (
                        <RichTextEditor
                          content={field.content}
                          onChange={(content) => handleUpdateField(field.id, 'content', content)}
                          placeholder="Enter rich text content..."
                        />
                      ) : (
                        <textarea
                          value={field.content}
                          onChange={(e) => handleUpdateField(field.id, 'content', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter field content or question text..."
                        />
                      )}
                    </div>

                    {/* Anchors for Multiple Choice and Slider */}
                    {(field.type === 'multiple_choice' || field.type === 'slider') && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-medium text-gray-900">
                            Anchors
                          </label>
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleReverseAnchors(field.id)}
                            >
                              Reverse Values
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddAnchor(field.id)}
                            >
                              + Add Anchor
                            </Button>
                          </div>
                        </div>

                        {field.anchors.length === 0 ? (
                          <div className="text-sm text-gray-500 py-2">
                            No anchors yet. Add anchors to define answer options.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {field.anchors.map((anchor) => (
                              <div key={anchor.id} className="grid grid-cols-4 gap-3 items-center">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Name
                                  </label>
                                  <input
                                    type="text"
                                    value={anchor.name}
                                    onChange={(e) => handleUpdateAnchor(field.id, anchor.id, 'name', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Anchor name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Value
                                  </label>
                                  <input
                                    type="number"
                                    value={anchor.value}
                                    onChange={(e) => handleUpdateAnchor(field.id, anchor.id, 'value', parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Practice
                                  </label>
                                  <select
                                    value={anchor.practice ? '1' : '0'}
                                    onChange={(e) => handleUpdateAnchor(field.id, anchor.id, 'practice', e.target.value === '1')}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  >
                                    <option value="0">No</option>
                                    <option value="1">Yes</option>
                                  </select>
                                </div>
                                <div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteAnchor(field.id, anchor.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    </div>

                    {/* Add field "between" and "below" controls */}
                    <div className="flex flex-wrap gap-2 justify-center rounded-md border border-dashed border-gray-300 p-3 bg-gray-50">
                      <span className="text-xs text-gray-500 w-full text-center">
                        Add a field below
                      </span>
                      <Button type="button" variant="outline" onClick={() => handleInsertFieldAt(index, 'rich_text')}>
                        + Rich Text
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleInsertFieldAt(index, 'multiple_choice')}>
                        + Multiple Choice
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleInsertFieldAt(index, 'slider')}>
                        + Slider
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitText}
        </Button>
      </div>
    </form>
  )
}

