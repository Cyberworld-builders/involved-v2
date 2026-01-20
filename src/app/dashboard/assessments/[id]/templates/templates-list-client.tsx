'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface Template {
  id: string
  name: string
  is_default: boolean
  components: Record<string, boolean>
  labels: Record<string, string>
  styling: Record<string, any>
  created_at: string
  updated_at: string
}

interface TemplatesListClientProps {
  assessmentId: string
}

export default function TemplatesListClient({ assessmentId }: TemplatesListClientProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true)
      setMessage('')
      try {
        const response = await fetch(`/api/templates/assessment/${assessmentId}`)
        if (!response.ok) {
          throw new Error('Failed to load templates')
        }
        const data = await response.json()
        setTemplates(data.templates || [])
      } catch (error) {
        console.error('Error loading templates:', error)
        setMessage('Failed to load templates')
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [assessmentId])

  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/set-default`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to set default template')
      }
      // Reload templates
      const response2 = await fetch(`/api/templates/assessment/${assessmentId}`)
      const data = await response2.json()
      setTemplates(data.templates || [])
      setMessage('Default template updated')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error setting default template:', error)
      setMessage('Failed to set default template')
    }
  }

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete template')
      }
      // Reload templates
      const response2 = await fetch(`/api/templates/assessment/${assessmentId}`)
      const data = await response2.json()
      setTemplates(data.templates || [])
      setMessage('Template deleted')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting template:', error)
      setMessage('Failed to delete template')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('successfully') || message.includes('updated') || message.includes('deleted')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No templates found.</p>
            <Link href={`/dashboard/assessments/${assessmentId}/templates/create`}>
              <Button>Create Your First Template</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!template.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Link href={`/dashboard/assessments/${assessmentId}/templates/${template.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Enabled Components:</p>
                    <ul className="text-gray-600 space-y-1">
                      {Object.entries(template.components || {}).map(([key, value]) => (
                        <li key={key}>
                          {value ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Custom Labels:</p>
                    <ul className="text-gray-600 space-y-1">
                      {Object.keys(template.labels || {}).length > 0 ? (
                        Object.entries(template.labels || {}).map(([key, value]) => (
                          <li key={key}>
                            {key}: {value}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-400">None</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
