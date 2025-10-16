'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface IndustryFormData {
  name: string
}

interface IndustryFormProps {
  initialData?: Partial<IndustryFormData>
  onSubmit: (data: IndustryFormData) => void
  isLoading?: boolean
  submitText?: string
}

export default function IndustryForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitText = 'Add Industry'
}: IndustryFormProps) {
  const [formData, setFormData] = useState<IndustryFormData>({
    name: initialData?.name || '',
  })

  const handleInputChange = (field: keyof IndustryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Industry Information</CardTitle>
          <CardDescription>
            Basic information about the industry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Industry Name
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Enter a unique industry name (e.g., Technology, Healthcare, Finance)
            </p>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="e.g., Technology"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitText}
        </Button>
      </div>
    </form>
  )
}
