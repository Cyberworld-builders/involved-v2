'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/rich-text-editor'
import { GripVertical, Edit2, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

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

export interface AnchorTemplate {
  id: string
  name: string
  description?: string
  anchors: Omit<Anchor, 'id'>[]  // Anchors without IDs (will be generated)
}

// Anchor templates for quick population
export const ANCHOR_TEMPLATES: AnchorTemplate[] = [
  {
    id: 'expectations',
    name: 'Performance Expectations',
    description: '5-level performance rating scale',
    anchors: [
      { name: 'Below Expectations', value: 1, practice: false },
      { name: 'Slightly Below Expectations', value: 2, practice: false },
      { name: 'Meets Expectations', value: 3, practice: false },
      { name: 'Slightly Exceeds Expectations', value: 4, practice: false },
      { name: 'Exceeds Expectations', value: 5, practice: false },
    ],
  },
  {
    id: 'frequency',
    name: 'Frequency Scale',
    description: '5-level frequency rating scale',
    anchors: [
      { name: 'Rarely', value: 1, practice: false },
      { name: 'Sometimes', value: 2, practice: false },
      { name: 'Most of the Time', value: 3, practice: false },
      { name: 'Almost All of the Time', value: 4, practice: false },
      { name: 'Always', value: 5, practice: false },
    ],
  },
  {
    id: 'agreement',
    name: 'Agreement Scale',
    description: '5-level agreement rating scale (Likert)',
    anchors: [
      { name: 'Strongly Disagree', value: 1, practice: false },
      { name: 'Disagree', value: 2, practice: false },
      { name: 'Neither Agree Nor Disagree', value: 3, practice: false },
      { name: 'Agree', value: 4, practice: false },
      { name: 'Strongly Agree', value: 5, practice: false },
    ],
  },
]

// Question types matching legacy system
export type QuestionType = 
  | 'multiple_choice' | '1' | 'choice'  // Legacy type 1
  | 'description' | '2' | 'desc'        // Legacy type 2
  | 'text_input' | '3' | 'input'        // Legacy type 3
  | 'letter_sequence' | '4' | 'ls'      // Legacy type 4
  | 'math_equation' | '5' | 'eq'        // Legacy type 5
  | 'math_letters' | '6' | 'eqls'       // Legacy type 6
  | 'square_sequence' | '7' | 'sq'       // Legacy type 7
  | 'symmetry' | '8' | 'sy'             // Legacy type 8
  | 'symmetry_squares' | '9' | 'sysq'     // Legacy type 9
  | 'instructions' | '10' | 'instruct'   // Legacy type 10
  | 'slider' | '11'                       // Legacy type 11
  | 'rich_text'                           // V2 alias for description
  | 'page_break'                          // Page break (not displayed to user)

export interface QuestionTypeInfo {
  id: string
  name: string
  icon: string
  description: string
  default: string
  showPage: boolean
  showContent: boolean
  requiresAnchors: boolean
  isWMType: boolean
}

export const QUESTION_TYPES: Record<string, QuestionTypeInfo> = {
  'multiple_choice': {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    icon: 'fa-list-ul',
    description: 'A question with multiple answer options',
    default: 'This is a sample question',
    showPage: true,
    showContent: true,
    requiresAnchors: true,
    isWMType: false,
  },
  'description': {
    id: 'description',
    name: 'Description',
    icon: 'fa-align-left',
    description: 'A descriptive text block (not a question)',
    default: 'This is a description',
    showPage: false,
    showContent: true,
    requiresAnchors: false,
    isWMType: false,
  },
  'text_input': {
    id: 'text_input',
    name: 'Text Input',
    icon: 'fa-square-o',
    description: 'A question asking for text input',
    default: 'This is a question asking for input',
    showPage: true,
    showContent: true,
    requiresAnchors: false,
    isWMType: false,
  },
  'slider': {
    id: 'slider',
    name: 'Slider',
    icon: 'fa-sliders',
    description: 'A slider question with range values',
    default: 'This is a slider question',
    showPage: true,
    showContent: true,
    requiresAnchors: true,
    isWMType: false,
  },
  'instructions': {
    id: 'instructions',
    name: 'Instructions',
    icon: 'fa-list-alt',
    description: 'Instructional text with continue button',
    default: '{"text":"Here are some instructions. Click HERE to edit this text.","next":"Continue"}',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  // WM types (for future implementation)
  'letter_sequence': {
    id: 'letter_sequence',
    name: 'Letter Sequence',
    icon: 'fa-font',
    description: 'A sequence of letters (WM type)',
    default: 'X,Y,Z',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  'math_equation': {
    id: 'math_equation',
    name: 'Math Equation',
    icon: 'fa-superscript',
    description: 'A math equation (WM type)',
    default: '(2*2)+2=2',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  'math_letters': {
    id: 'math_letters',
    name: 'Math and Letters',
    icon: 'fa-list-ol',
    description: 'Letters with equations (WM type)',
    default: 'X,Y,Z',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  'square_sequence': {
    id: 'square_sequence',
    name: 'Square Sequence',
    icon: 'fa-th-large',
    description: 'Square sequence pattern (WM type)',
    default: '',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  'symmetry': {
    id: 'symmetry',
    name: 'Symmetry',
    icon: 'fa-columns',
    description: 'Symmetry pattern (WM type)',
    default: '',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  'symmetry_squares': {
    id: 'symmetry_squares',
    name: 'Symmetry Squares',
    icon: 'fa-th',
    description: 'Symmetry squares pattern (WM type)',
    default: '',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: true,
  },
  'page_break': {
    id: 'page_break',
    name: 'Page Break',
    icon: 'fa-file-o',
    description: 'Page break - splits assessment into separate pages',
    default: '',
    showPage: false,
    showContent: false,
    requiresAnchors: false,
    isWMType: false,
  },
}

export interface Field {
  id: string
  type: QuestionType
  content: string
  dimension_id: string | null
  anchors: Anchor[]
  order: number
  number?: number  // Question number (legacy compatibility)
  practice?: boolean  // Practice question flag
  insights_table?: string[][]  // Additional insights table: array of rows, each row is array of cell values (one per anchor)
}

export interface CustomField {
  tag: string
  default: string
}

export interface AssessmentFormData {
  // Details
  title: string
  description: string
  logo: File | null
  background: File | null
  removeLogo?: boolean  // Flag to indicate logo should be set to null
  removeBackground?: boolean  // Flag to indicate background should be set to null
  primary_color: string
  accent_color: string
  
  // Settings
  status: 'draft' | 'active' | 'completed' | 'archived'
  split_questions: boolean
  questions_per_page: number
  timed: boolean
  time_limit: number | null
  target: 'self' | 'other_user' | 'group_leader' | ''  // Legacy: 0=self, 1=other_user, 2=group_leader
  is_360: boolean
  number_of_questions: number | null  // For non-360 assessments: number of questions to randomly select
  use_custom_fields: boolean
  custom_fields: CustomField[]
  
  // Dimensions
  dimensions: Dimension[]
  
  // Fields (Questions)
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
  // Define normalizeFieldOrders before using it in useState
  const normalizeFieldOrders = (fields: Field[]): Field[] => {
    // Preserve the array order and set order/number based on position
    return fields.map((f, idx) => ({ 
      ...f, 
      order: idx + 1,  // Order is always based on array position
      number: idx + 1  // Number should match order for consistency
    }))
  }

  const [activeTab, setActiveTab] = useState<'details' | 'settings' | 'dimensions' | 'fields'>('fields')
  const [formData, setFormData] = useState<AssessmentFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    logo: initialData?.logo || null,
    background: initialData?.background || null,
    primary_color: initialData?.primary_color || '#2D2E30',
    accent_color: initialData?.accent_color || '#FFBA00',
    status: (initialData?.status as 'draft' | 'active' | 'completed' | 'archived') || 'draft',
    split_questions: initialData?.split_questions || false,
    questions_per_page: initialData?.questions_per_page || 10,
    timed: initialData?.timed || false,
    time_limit: initialData?.time_limit || null,
    target: (initialData?.target as 'self' | 'other_user' | 'group_leader') || '',
    is_360: initialData?.is_360 || false,
    number_of_questions: initialData?.number_of_questions || null,
    use_custom_fields: initialData?.use_custom_fields || false,
    custom_fields: initialData?.custom_fields || [],
    dimensions: initialData?.dimensions || [],
    // Normalize field orders on initialization to ensure they're sequential
    fields: initialData?.fields ? normalizeFieldOrders(initialData.fields) : [],
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(existingLogoUrl || null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(existingBackgroundUrl || null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)

  const handleInputChange = (field: keyof AssessmentFormData, value: string | number | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value as never }))
  }

  const createNewField = (type: QuestionType, nextOrder: number): Field => {
    const typeInfo = QUESTION_TYPES[type] || QUESTION_TYPES['multiple_choice']
    const defaultContent = typeInfo.default || ''
    
    return {
      id: `field-${Date.now()}`,
      type,
      content: defaultContent,
      dimension_id: null,
      anchors:
        typeInfo.requiresAnchors
          ? [
              { id: `anchor-${Date.now()}-1`, name: '', value: 1, practice: false },
              { id: `anchor-${Date.now()}-2`, name: '', value: 2, practice: false },
            ]
          : [],
      order: nextOrder,
      number: nextOrder,
      practice: false,
    }
  }

  const handleFileChange = (field: 'logo' | 'background', file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }))
    
    // Clear remove flag when new file is selected
    if (field === 'logo') {
      setRemoveLogo(false)
    } else {
      setRemoveBackground(false)
    }
    
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

  const handleRemoveImage = (field: 'logo' | 'background') => {
    if (field === 'logo') {
      setRemoveLogo(true)
      setLogoPreview(null)
      setFormData(prev => ({ ...prev, logo: null }))
      // Clear file input
      const logoInput = document.getElementById('logo') as HTMLInputElement
      if (logoInput) logoInput.value = ''
    } else {
      setRemoveBackground(true)
      setBackgroundPreview(null)
      setFormData(prev => ({ ...prev, background: null }))
      // Clear file input
      const backgroundInput = document.getElementById('background') as HTMLInputElement
      if (backgroundInput) backgroundInput.value = ''
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
      dimensions: prev.dimensions
        .filter(dim => dim.id !== id)
        .map(dim => dim.parent_id === id ? { ...dim, parent_id: null } : dim), // Remove parent reference if parent is deleted
      fields: prev.fields.filter(field => field.dimension_id !== id),
    }))
  }

  const handleMoveDimension = (dimensionId: string, newParentId: string | null) => {
    // Prevent circular reference: a dimension can't be its own parent or ancestor
    if (newParentId === dimensionId) {
      return
    }
    
    // Check if newParentId would create a circular reference
    const wouldCreateCycle = (() => {
      if (!newParentId) return false
      let currentParentId: string | null = newParentId
      while (currentParentId) {
        if (currentParentId === dimensionId) return true
        const parent = formData.dimensions.find(d => d.id === currentParentId)
        currentParentId = parent?.parent_id || null
      }
      return false
    })()
    
    if (wouldCreateCycle) {
      alert('Cannot move dimension: This would create a circular reference.')
      return
    }

    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.map(dim =>
        dim.id === dimensionId ? { ...dim, parent_id: newParentId } : dim
      ),
    }))
  }

  // Organize dimensions hierarchically for display
  const getDimensionTree = () => {
    const dimensionMap = new Map(formData.dimensions.map(d => [d.id, d]))
    const rootDimensions: Dimension[] = []
    const childrenMap = new Map<string, Dimension[]>()

    // Build children map
    formData.dimensions.forEach(dim => {
      if (dim.parent_id) {
        if (!childrenMap.has(dim.parent_id)) {
          childrenMap.set(dim.parent_id, [])
        }
        childrenMap.get(dim.parent_id)!.push(dim)
      } else {
        rootDimensions.push(dim)
      }
    })

    // Sort dimensions
    const sortDimensions = (dims: Dimension[]) => {
      return dims.sort((a, b) => a.name.localeCompare(b.name))
    }

    return {
      roots: sortDimensions(rootDimensions),
      getChildren: (parentId: string) => sortDimensions(childrenMap.get(parentId) || []),
    }
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

  const handleAddField = (type: QuestionType) => {
    setFormData(prev => ({
      ...prev,
      fields: normalizeFieldOrders([...prev.fields, createNewField(type, prev.fields.length + 1)]),
    }))
  }

  const handleInsertFieldAt = (insertBeforeIndex: number, type: QuestionType) => {
    setFormData(prev => {
      const nextFields = [...prev.fields]
      // Button is positioned above field at insertBeforeIndex (0-based array index)
      // To insert BEFORE that field, we insert at insertBeforeIndex
      // This will place the new field at the current field's position, pushing it down
      const insertPosition = insertBeforeIndex
      nextFields.splice(insertPosition, 0, createNewField(type, insertPosition))
      return {
        ...prev,
        fields: normalizeFieldOrders(nextFields),
      }
    })
  }

  const handleUpdateField = (id: string, field: keyof Field, value: string | QuestionType | Anchor[] | number | boolean | string[][] | null) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      ),
    }))
  }
  
  const handleAddCustomField = () => {
    setFormData(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { tag: '', default: '' }],
    }))
  }
  
  const handleUpdateCustomField = (index: number, field: 'tag' | 'default', value: string) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map((cf, idx) =>
        idx === index ? { ...cf, [field]: value } : cf
      ),
    }))
  }
  
  const handleDeleteCustomField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, idx) => idx !== index),
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

  const handleMoveFieldUp = (fieldId: string) => {
    const currentIndex = formData.fields.findIndex(f => f.id === fieldId)
    if (currentIndex <= 0) return
    reorderFields(currentIndex, currentIndex - 1)
  }

  const handleMoveFieldDown = (fieldId: string) => {
    const currentIndex = formData.fields.findIndex(f => f.id === fieldId)
    if (currentIndex < 0 || currentIndex >= formData.fields.length - 1) return
    reorderFields(currentIndex, currentIndex + 1)
  }

  const handleMoveFieldToTop = (fieldId: string) => {
    const currentIndex = formData.fields.findIndex(f => f.id === fieldId)
    if (currentIndex <= 0) return
    reorderFields(currentIndex, 0)
  }

  const handleMoveFieldToBottom = (fieldId: string) => {
    const currentIndex = formData.fields.findIndex(f => f.id === fieldId)
    if (currentIndex < 0 || currentIndex >= formData.fields.length - 1) return
    reorderFields(currentIndex, formData.fields.length - 1)
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

  /**
   * Apply an anchor template to a field
   * Replaces existing anchors with the template's anchors
   */
  const handleApplyAnchorTemplate = (fieldId: string, template: AnchorTemplate) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem) return

    // Generate new anchors from template with unique IDs
    const newAnchors: Anchor[] = template.anchors.map((anchor, index) => ({
      id: `anchor-${Date.now()}-${index}`,
      name: anchor.name,
      value: anchor.value,
      practice: anchor.practice,
    }))

    handleUpdateField(fieldId, 'anchors', newAnchors)
  }

  /**
   * Parse HTML table and extract comments to populate the insights_table
   * Each row in the HTML table becomes a row in the insights_table
   * Each column in the HTML table maps to an anchor (button)
   */
  const parseHtmlTableToAnchors = (fieldId: string, htmlContent: string) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem) return

    // Ensure we have anchors to map columns to
    if (!fieldItem.anchors || fieldItem.anchors.length === 0) {
      console.warn('No anchors found. Please add anchors first before pasting the table.')
      return
    }

    try {
      // Create a temporary DOM element to parse HTML
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      const table = doc.querySelector('table')
      
      if (!table) {
        console.warn('No table found in pasted HTML')
        return
      }

      // Extract all rows
      const rows = Array.from(table.querySelectorAll('tbody tr, tr'))
      if (rows.length === 0) {
        console.warn('No rows found in table')
        return
      }

      // Find the maximum number of columns across all rows
      let maxColumns = 0
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'))
        maxColumns = Math.max(maxColumns, cells.length)
      })

      if (maxColumns === 0) {
        console.warn('No columns found in table')
        return
      }

      // Map HTML columns sequentially to anchors (preserving empty cells as placeholders)
      // Column 0 -> Anchor 0, Column 1 -> Anchor 1, etc.
      // Only map up to the number of anchors we have
      const numAnchors = fieldItem.anchors.length
      const columnsToMap = Math.min(maxColumns, numAnchors)

      // Parse each row into an insights table row
      // Each row in the HTML table becomes a row in insights_table
      const insightsTableRows: string[][] = []
      
      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'))
        // Initialize row data with empty strings for all anchors
        const rowData: string[] = new Array(numAnchors).fill('')
        
        // Map HTML columns sequentially to anchor positions (preserving empty cells)
        for (let htmlColIndex = 0; htmlColIndex < columnsToMap; htmlColIndex++) {
          const cell = cells[htmlColIndex]
          if (cell) {
            let text = cell.textContent || cell.innerText || ''
            text = text.trim()
            text = text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
            // Preserve empty cells as empty strings (don't skip them)
            rowData[htmlColIndex] = text
          }
        }
        
        // Only add row if it has at least one non-empty cell
        if (rowData.some(cell => cell && cell.length > 0)) {
          insightsTableRows.push(rowData)
        }
      })

      if (insightsTableRows.length === 0) {
        console.warn('No valid rows found in table')
        return
      }

      // Update the insights_table field
      handleUpdateField(fieldId, 'insights_table', insightsTableRows)
    } catch (error) {
      console.error('Error parsing HTML table:', error)
    }
  }

  const handleReverseAnchors = (fieldId: string) => {
    const fieldItem = formData.fields.find(f => f.id === fieldId)
    if (!fieldItem || fieldItem.anchors.length === 0) return

    // Check if values are in descending order (already reversed)
    const isDescending = fieldItem.anchors.every((anchor, index) => {
      if (index === 0) return true
      return anchor.value <= fieldItem.anchors[index - 1].value
    })

    // If descending, reverse back to ascending (1, 2, 3, ...)
    // If ascending, reverse to descending (n, n-1, ..., 1)
    const maxValue = fieldItem.anchors.length
    const reversedAnchors = fieldItem.anchors.map((anchor, index) => ({
      ...anchor,
      value: isDescending ? index + 1 : maxValue - index,
    }))
    handleUpdateField(fieldId, 'anchors', reversedAnchors)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure all fields have correct order before submitting
    // The array order is the source of truth - normalize based on current position
    const normalizedData = {
      ...formData,
      fields: normalizeFieldOrders(formData.fields),
      removeLogo,
      removeBackground,
    }
    // Log the order being submitted for debugging
    console.log('Submitting fields in order:', normalizedData.fields.map((f, idx) => ({
      index: idx,
      id: f.id,
      order: f.order,
      number: f.number,
      content: f.content?.substring(0, 30)
    })))
    onSubmit(normalizedData)
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'settings', label: 'Settings' },
    { id: 'dimensions', label: 'Dimensions' },
    { id: 'fields', label: 'Questions' },
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

              {/* Instructions Field */}
              {(() => {
                // Find the instructions field (type 'instructions' or '10')
                const instructionsField = formData.fields.find(f => 
                  f.type === 'instructions' || f.type === '10'
                )
                
                // Parse instructions JSON
                let instructionText = ''
                let continueButtonText = 'Continue'
                if (instructionsField) {
                  try {
                    const parsed = JSON.parse(instructionsField.content)
                    instructionText = parsed.text || ''
                    continueButtonText = parsed.next || 'Continue'
                  } catch {
                    instructionText = instructionsField.content
                  }
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Instructions
                      </label>
                      {!instructionsField && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddField('instructions')}
                        >
                          + Add Instructions
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      Instructions shown at the beginning of the assessment. Supports rich text formatting.
                    </p>
                    {instructionsField ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Instruction Text
                          </label>
                          <RichTextEditor
                            content={instructionText}
                            onChange={(content) => {
                              const updated = JSON.stringify({ text: content, next: continueButtonText })
                              handleUpdateField(instructionsField.id, 'content', updated)
                            }}
                            placeholder="Enter instruction text..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Continue Button Text
                          </label>
                          <input
                            type="text"
                            value={continueButtonText}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(instructionsField.content)
                                const updated = JSON.stringify({ ...parsed, next: e.target.value })
                                handleUpdateField(instructionsField.id, 'content', updated)
                              } catch {
                                handleUpdateField(instructionsField.id, 'content', JSON.stringify({ text: '', next: e.target.value }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Continue"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No instructions field added yet. Click &quot;+ Add Instructions&quot; to create one.
                      </div>
                    )}
                  </div>
                )
              })()}
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
                {(logoPreview || existingLogoUrl) && !removeLogo && (
                  <div className="mb-3 relative inline-block">
                    <Image 
                      src={logoPreview || existingLogoUrl || ''} 
                      alt="Logo preview" 
                      width={80} 
                      height={80} 
                      className="h-20 w-auto rounded" 
                      style={{ width: 'auto', height: '80px' }} 
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('logo')}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                      title="Remove logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                {(backgroundPreview || existingBackgroundUrl) && !removeBackground && (
                  <div className="mb-3 relative inline-block">
                    <Image 
                      src={backgroundPreview || existingBackgroundUrl || ''} 
                      alt="Background preview" 
                      width={200} 
                      height={100} 
                      className="h-20 w-auto rounded" 
                      style={{ width: 'auto', height: '80px' }} 
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('background')}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                      title="Remove background"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                Assessment Target
              </label>
              <p className="text-sm text-gray-500 mb-3">
                The target is the User to which the scores of this assessment will apply to.
              </p>
              <select
                id="target"
                value={formData.target}
                onChange={(e) => {
                  const targetValue = e.target.value as 'self' | 'other_user' | 'group_leader' | ''
                  handleInputChange('target', targetValue)
                  // Auto-configure custom fields based on target
                  if (targetValue === 'self') {
                    setFormData(prev => ({ ...prev, use_custom_fields: false, custom_fields: [] }))
                  } else if (targetValue === 'other_user') {
                    setFormData(prev => ({
                      ...prev,
                      use_custom_fields: true,
                      custom_fields: [
                        { tag: 'name', default: '' },
                        { tag: 'email', default: '' },
                      ],
                    }))
                  } else if (targetValue === 'group_leader') {
                    setFormData(prev => ({
                      ...prev,
                      use_custom_fields: true,
                      custom_fields: [
                        { tag: 'name', default: '' },
                        { tag: 'email', default: '' },
                        { tag: 'grouprole', default: '' },
                      ],
                    }))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select target...</option>
                <option value="self">Self</option>
                <option value="other_user">Other User</option>
                <option value="group_leader">Group Leader</option>
              </select>
            </div>
            
            {/* Custom Fields */}
            {formData.use_custom_fields && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      You can use custom fields anywhere in the Assessment by using the tags you specify surrounded with square brackets. For example <code className="bg-gray-100 px-1 rounded">[name]</code>.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomField}
                  >
                    + Add Custom Field
                  </Button>
                </div>
                
                {formData.custom_fields.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No custom fields yet. Add custom fields to use dynamic placeholders in your assessment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.custom_fields.map((customField, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Tag
                          </label>
                          <input
                            type="text"
                            value={customField.tag}
                            onChange={(e) => handleUpdateCustomField(index, 'tag', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Default Value
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customField.default}
                              onChange={(e) => handleUpdateCustomField(index, 'default', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Default value"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteCustomField(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {/* Number of Questions (for non-360 assessments) */}
            {!formData.is_360 && (
              <div>
                <label htmlFor="number_of_questions" className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Questions to Include
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  For non-360 assessments, specify how many questions to randomly select from the pool for each assignment. 
                  Each participant will receive a unique random set of questions. Leave empty to include all questions.
                </p>
                <input
                  type="number"
                  id="number_of_questions"
                  min="1"
                  value={formData.number_of_questions ?? ''}
                  onChange={(e) => handleInputChange('number_of_questions', e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Leave empty to include all questions"
                />
              </div>
            )}

            {/* Status */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-900 mb-2">
                Assessment Status
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Only <strong>active</strong> assessments can be assigned to users. Draft assessments are not visible in assignment creation.
              </p>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'draft' | 'active' | 'completed' | 'archived')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active (Published)</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
              {formData.status === 'draft' && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This assessment is in draft status. It will not appear in assignment creation until it is set to <strong>Active</strong>.
                  </p>
                </div>
              )}
              {formData.status === 'active' && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✓ This assessment is active and can be assigned to users.
                  </p>
                </div>
              )}
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button type="button" onClick={handleAddDimension}>
                  + Add Dimension
                </Button>
              </div>

              {/* Template Download and Sample Table */}
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Use the template below to format your CSV file. Required fields are: <strong>Dimension Name</strong> and <strong>Dimension Code</strong>.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Download Button */}
                  <div className="flex items-start">
                    <div className="flex space-x-2">
                      <Button variant="outline" type="button" onClick={handleDownloadDimensionsTemplate}>
                        <span className="mr-2">📥</span>
                        Download Template
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
                          <span className="mr-2">📤</span>
                          Upload CSV
                        </Button>
                      </label>
                    </div>
                  </div>

                  {/* Sample Table Preview */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-700">CSV Format Preview</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Dimension Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Dimension Code</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-3 py-2 text-gray-900">Leadership</td>
                            <td className="px-3 py-2 text-gray-900">LEAD</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 text-gray-900">Communication</td>
                            <td className="px-3 py-2 text-gray-900">COMM</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 text-gray-900">Problem Solving</td>
                            <td className="px-3 py-2 text-gray-900">PROB</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 text-gray-900">Teamwork</td>
                            <td className="px-3 py-2 text-gray-900">TEAM</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Required:</span> Dimension Name, Dimension Code
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {formData.dimensions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No dimensions yet. Add your first dimension to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const tree = getDimensionTree()
                  
                  const renderDimension = (dimension: Dimension, level: number = 0) => {
                    const children = tree.getChildren(dimension.id)
                    const indentStyle = level > 0 ? { marginLeft: `${level * 1.5}rem` } : {}
                    
                    // Get available parent options (exclude self and descendants)
                    const getAvailableParents = () => {
                      const excludeIds = new Set([dimension.id])
                      // Add all descendants
                      const addDescendants = (parentId: string) => {
                        tree.getChildren(parentId).forEach(child => {
                          excludeIds.add(child.id)
                          addDescendants(child.id)
                        })
                      }
                      addDescendants(dimension.id)
                      
                      return formData.dimensions.filter(d => !excludeIds.has(d.id))
                    }

                    return (
                      <div key={dimension.id} style={indentStyle} className={level > 0 ? 'border-l-2 border-indigo-200 pl-4 ml-4' : ''}>
                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-900 mb-2">
                                Name {level > 0 && <span className="text-xs text-gray-500">(Child)</span>}
                              </label>
                              <input
                                type="text"
                                value={dimension.name}
                                onChange={(e) => handleUpdateDimension(dimension.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                                placeholder="e.g., LEAD"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-900 mb-2">
                                Parent Dimension
                              </label>
                              <select
                                value={dimension.parent_id || ''}
                                onChange={(e) => handleMoveDimension(dimension.id, e.target.value || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                              >
                                <option value="">None (Top Level)</option>
                                {getAvailableParents().map(parent => (
                                  <option key={parent.id} value={parent.id}>
                                    {parent.name} ({parent.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between items-center">
                            {children.length > 0 && (
                              <div className="text-sm text-gray-600">
                                {children.length} child dimension{children.length !== 1 ? 's' : ''}
                              </div>
                            )}
                            <div className="flex gap-2 ml-auto">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newChild: Dimension = {
                                    id: `dim-${Date.now()}`,
                                    name: '',
                                    code: '',
                                    parent_id: dimension.id,
                                  }
                                  setFormData(prev => ({
                                    ...prev,
                                    dimensions: [...prev.dimensions, newChild],
                                  }))
                                }}
                                className="text-indigo-600 hover:text-indigo-700"
                              >
                                + Add Child
                              </Button>
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
                        </div>
                        {children.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {children.map(child => renderDimension(child, level + 1))}
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  return tree.roots.map(root => renderDimension(root, 0))
                })()}
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
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => handleAddField('multiple_choice')}>
                + Multiple Choice
              </Button>
              <Button type="button" onClick={() => handleAddField('description')}>
                + Description
              </Button>
              <Button type="button" onClick={() => handleAddField('text_input')}>
                + Text Input
              </Button>
              <Button type="button" onClick={() => handleAddField('slider')}>
                + Slider
              </Button>
              <Button type="button" onClick={() => handleAddField('page_break')} variant="outline">
                + Page Break
              </Button>
            </div>

            {formData.fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No questions yet. Add your first question to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.fields
                  .filter(field => {
                    // Filter out instructions field - it's shown in details tab
                    // Show page breaks in the list so users can see and manage them
                    const fieldType = field.type as string
                    return fieldType !== 'instructions' && fieldType !== '10'
                  })
                  .map((field) => {
                  // Find the actual index in the original array (not the filtered array)
                  // This is important because page breaks and other filtered fields affect the index
                  const actualIndex = formData.fields.findIndex(f => f.id === field.id)
                  
                  const dimension = field.dimension_id 
                    ? formData.dimensions.find(d => d.id === field.dimension_id)
                    : null
                  
                  // Get a preview of the content (first 80 chars, strip HTML)
                  const contentPreview = field.content
                    ? field.content.replace(/<[^>]*>/g, '').substring(0, 80) + (field.content.length > 80 ? '...' : '')
                    : 'No content'

                  return (
                    <div key={field.id}>
                      {/* Insert Question Above - Compact */}
                      <div className="mb-2 flex items-center justify-center">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInsertFieldAt(actualIndex, 'multiple_choice')}
                            className="text-xs"
                          >
                            + MC
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInsertFieldAt(actualIndex, 'text_input')}
                            className="text-xs"
                          >
                            + Text
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInsertFieldAt(actualIndex, 'description')}
                            className="text-xs"
                          >
                            + Description
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInsertFieldAt(actualIndex, 'slider')}
                            className="text-xs"
                          >
                            + Slider
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInsertFieldAt(actualIndex, 'page_break')}
                            className="text-xs"
                          >
                            + Page
                          </Button>
                        </div>
                      </div>
                      
                      {/* Compact Question Preview */}
                      <div
                        className={`border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors ${draggedFieldId === field.id ? 'opacity-60' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggedFieldId(field.id)
                        }}
                        onDragEnd={() => setDraggedFieldId(null)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          handleDropOnField(field.id)
                          setDraggedFieldId(null)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Drag Handle */}
                          <div className="text-gray-400 cursor-move" aria-hidden="true" title="Drag to reorder">
                            <GripVertical className="h-5 w-5" />
                          </div>
                          
                          {/* Question Number */}
                          {field.number && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-medium">
                              {field.number}
                            </div>
                          )}
                          
                          {/* Question Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {QUESTION_TYPES[field.type]?.name || field.type}
                              </span>
                              {field.type === 'page_break' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                  Page Break
                                </span>
                              )}
                              {field.practice && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                  Practice
                                </span>
                              )}
                              {dimension && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  {dimension.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {contentPreview}
                            </p>
                            {QUESTION_TYPES[field.type]?.requiresAnchors && field.anchors.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {field.anchors.length} anchor{field.anchors.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Move Controls */}
                            <div className="flex items-center gap-0.5 border-r border-gray-200 pr-3 mr-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleMoveFieldToTop(field.id)}
                                disabled={actualIndex === 0}
                                className="h-10 w-10 p-0"
                                title="Move to top"
                              >
                                <ChevronsUp className="h-6 w-6 stroke-[2.5]" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleMoveFieldUp(field.id)}
                                disabled={actualIndex === 0}
                                className="h-10 w-10 p-0"
                                title="Move up"
                              >
                                <ArrowUp className="h-6 w-6 stroke-[2.5]" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleMoveFieldDown(field.id)}
                                disabled={actualIndex === formData.fields.length - 1}
                                className="h-10 w-10 p-0"
                                title="Move down"
                              >
                                <ArrowDown className="h-6 w-6 stroke-[2.5]" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleMoveFieldToBottom(field.id)}
                                disabled={actualIndex === formData.fields.length - 1}
                                className="h-10 w-10 p-0"
                                title="Move to bottom"
                              >
                                <ChevronsDown className="h-6 w-6 stroke-[2.5]" />
                              </Button>
                            </div>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingFieldId(field.id)}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteField(field.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {/* Add Question at End */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="text-xs text-gray-500 w-full text-center mb-2">
                      Add question at end
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddField('multiple_choice')}>
                      + Multiple Choice
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddField('description')}>
                      + Description
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddField('text_input')}>
                      + Text Input
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddField('slider')}>
                      + Slider
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddField('page_break')}>
                      + Page
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Edit Question Modal */}
            {editingFieldId && (() => {
              const field = formData.fields.find(f => f.id === editingFieldId)
              if (!field) return null
              
              return (
                <Dialog
                  open={editingFieldId !== null}
                  onOpenChange={(open) => !open && setEditingFieldId(null)}
                >
                  <DialogContent
                    title={`Edit Question #${field.number || formData.fields.findIndex(f => f.id === editingFieldId) + 1}`}
                    description={QUESTION_TYPES[field.type]?.description}
                    onClose={() => setEditingFieldId(null)}
                  >
                    <div className="space-y-6">
                      {/* Question Type Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Question Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newType = e.target.value as QuestionType
                            const typeInfo = QUESTION_TYPES[newType]
                            handleUpdateField(field.id, 'type', newType)
                            // Update anchors if type requires them
                            if (typeInfo?.requiresAnchors && field.anchors.length === 0) {
                              handleUpdateField(field.id, 'anchors', [
                                { id: `anchor-${Date.now()}-1`, name: '', value: 1, practice: false },
                                { id: `anchor-${Date.now()}-2`, name: '', value: 2, practice: false },
                              ])
                            } else if (!typeInfo?.requiresAnchors) {
                              handleUpdateField(field.id, 'anchors', [])
                            }
                            // Update content to default if empty
                            if (!field.content && typeInfo?.default) {
                              handleUpdateField(field.id, 'content', typeInfo.default)
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {Object.values(QUESTION_TYPES).map((typeInfo) => (
                            <option key={typeInfo.id} value={typeInfo.id}>
                              {typeInfo.name} {typeInfo.isWMType ? '(WM)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Practice Question Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Question Type
                        </label>
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant={field.practice ? "default" : "outline"}
                            onClick={() => handleUpdateField(field.id, 'practice', !field.practice)}
                          >
                            {field.practice ? 'Practice Question' : 'Test Question'}
                          </Button>
                          <span className="text-sm text-gray-500">
                            {field.practice ? 'This question will not be scored' : 'This question will be scored'}
                          </span>
                        </div>
                      </div>

                      {/* Dimension Selection */}
                      {formData.dimensions.length > 0 && (
                        <div>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Content
                        </label>
                        {field.type === 'instructions' || field.type === '10' ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Instruction Text
                              </label>
                              <RichTextEditor
                                content={(() => {
                                  try {
                                    const parsed = JSON.parse(field.content)
                                    return parsed.text || ''
                                  } catch {
                                    return field.content
                                  }
                                })()}
                                onChange={(content) => {
                                  try {
                                    const parsed = JSON.parse(field.content)
                                    const updated = JSON.stringify({ ...parsed, text: content })
                                    handleUpdateField(field.id, 'content', updated)
                                  } catch {
                                    handleUpdateField(field.id, 'content', JSON.stringify({ text: content, next: 'Continue' }))
                                  }
                                }}
                                placeholder="Enter instruction text..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Continue Button Text
                              </label>
                              <input
                                type="text"
                                value={(() => {
                                  try {
                                    const parsed = JSON.parse(field.content)
                                    return parsed.next || 'Continue'
                                  } catch {
                                    return 'Continue'
                                  }
                                })()}
                                onChange={(e) => {
                                  try {
                                    const parsed = JSON.parse(field.content)
                                    const updated = JSON.stringify({ ...parsed, next: e.target.value })
                                    handleUpdateField(field.id, 'content', updated)
                                  } catch {
                                    handleUpdateField(field.id, 'content', JSON.stringify({ text: '', next: e.target.value }))
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Continue"
                              />
                            </div>
                          </div>
                        ) : (
                          <RichTextEditor
                            content={field.content}
                            onChange={(content) => handleUpdateField(field.id, 'content', content)}
                            placeholder="Enter question content..."
                          />
                        )}
                      </div>

                      {/* Anchors for Multiple Choice and Slider */}
                      {QUESTION_TYPES[field.type]?.requiresAnchors && (
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
                          
                          {/* Anchor Templates */}
                          {ANCHOR_TEMPLATES.length > 0 && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Quick Templates
                              </label>
                              <p className="text-xs text-gray-500 mb-2">
                                Apply a template to quickly populate anchors:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {ANCHOR_TEMPLATES.map((template) => (
                                  <Button
                                    key={template.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyAnchorTemplate(field.id, template)}
                                    className="text-xs"
                                    title={template.description}
                                  >
                                    {template.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

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
                          
                          {/* HTML Table Parser for Multiple Choice */}
                          {(field.type === 'multiple_choice' || field.type === '1') && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Paste HTML Table to Auto-Populate Insights Table
                              </label>
                              <textarea
                                id={`html-table-paste-${field.id}`}
                                placeholder="Paste HTML table here... (e.g., from Word/Excel)"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                rows={4}
                                onPaste={async (e) => {
                                  const pastedText = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain')
                                  if (pastedText.includes('<table') || pastedText.includes('<tr')) {
                                    e.preventDefault()
                                    parseHtmlTableToAnchors(field.id, pastedText)
                                    // Clear the textarea after parsing
                                    const textarea = document.getElementById(`html-table-paste-${field.id}`) as HTMLTextAreaElement
                                    if (textarea) textarea.value = ''
                                  }
                                }}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Paste an HTML table to populate the insights table below. Each row becomes an insights row, and each column maps to an anchor button.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Insights Table for Multiple Choice */}
                      {(field.type === 'multiple_choice' || field.type === '1') && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-900">
                              Additional Insights Table
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentTable = field.insights_table || []
                                const numColumns = field.anchors.length || 5
                                const newRow = Array(numColumns).fill('')
                                handleUpdateField(field.id, 'insights_table', [...currentTable, newRow])
                              }}
                            >
                              + Add Row
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            Provide additional insight into what each selection means. Each row can contain descriptions for different aspects.
                          </p>
                          {field.anchors.length === 0 ? (
                            <div className="text-sm text-gray-500 py-2">
                              Add anchors first to create the insights table.
                            </div>
                          ) : (field.insights_table || []).length === 0 ? (
                            <div className="text-sm text-gray-500 py-2">
                              No insights table yet. Click &quot;+ Add Row&quot; to create one.
                            </div>
                          ) : (
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      {field.anchors.map((anchor, colIndex) => (
                                        <th
                                          key={anchor.id}
                                          className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                        >
                                          {anchor.name || `Option ${colIndex + 1}`}
                                        </th>
                                      ))}
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 w-20"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {(field.insights_table || []).map((row, rowIndex) => (
                                      <tr key={rowIndex}>
                                        {field.anchors.map((anchor, colIndex) => (
                                          <td key={anchor.id} className="px-3 py-2">
                                            <textarea
                                              value={row[colIndex] || ''}
                                              onChange={(e) => {
                                                const currentTable = field.insights_table || []
                                                const updatedTable = [...currentTable]
                                                const updatedRow = [...updatedTable[rowIndex]]
                                                updatedRow[colIndex] = e.target.value
                                                updatedTable[rowIndex] = updatedRow
                                                handleUpdateField(field.id, 'insights_table', updatedTable)
                                              }}
                                              rows={3}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                              placeholder="Enter description..."
                                            />
                                          </td>
                                        ))}
                                        <td className="px-3 py-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const currentTable = field.insights_table || []
                                              const updatedTable = currentTable.filter((_, idx) => idx !== rowIndex)
                                              handleUpdateField(field.id, 'insights_table', updatedTable)
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            Delete
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Modal Actions */}
                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingFieldId(null)}
                        >
                          Close
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setEditingFieldId(null)}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            })()}
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

