'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ClientFormData {
  name: string
  address: string
  logo: File | null
  background: File | null
  primary_color: string
  accent_color: string
  require_profile: boolean
  require_research: boolean
  whitelabel: boolean
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData>
  onSubmit: (data: ClientFormData) => void
  isLoading?: boolean
  submitText?: string
}

export default function ClientForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitText = 'Add Client'
}: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    logo: initialData?.logo || null,
    background: initialData?.background || null,
    primary_color: initialData?.primary_color || '#2D2E30',
    accent_color: initialData?.accent_color || '#FFBA00',
    require_profile: initialData?.require_profile || false,
    require_research: initialData?.require_research || false,
    whitelabel: initialData?.whitelabel || false,
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)

  const handleInputChange = (field: keyof ClientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Basic information about the client organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Name
            </label>
            <p className="text-sm text-gray-500 mb-3">The name of the client.</p>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-2">
              Address
            </label>
            <p className="text-sm text-gray-500 mb-3">Global office address of the client.</p>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              Client logo. This will show up in the header of any white-labeled assessments assigned to this client&apos;s users.
            </p>
            {logoPreview && (
              <div className="mb-3">
                <img src={logoPreview} alt="Logo preview" className="h-20 w-auto rounded" />
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
              Client background image. This will show up in the header of any white-labeled assessments assigned to this client&apos;s users.
            </p>
            {backgroundPreview && (
              <div className="mb-3">
                <img src={backgroundPreview} alt="Background preview" className="h-20 w-auto rounded" />
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
              The primary color of the client. This will affect the look of white-labeled assessments and Client Dashboard.
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
              The secondary color of the client. This will affect the look of white-labeled assessments and Client Dashboard.
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

      <Card>
        <CardHeader>
          <CardTitle>Client Settings</CardTitle>
          <CardDescription>
            Configure client-specific behavior and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Require Profile */}
          <div>
            <label htmlFor="require_profile" className="block text-sm font-medium text-gray-900 mb-2">
              Require users to complete their profile?
            </label>
            <p className="text-sm text-gray-500 mb-3">
              If set to Yes, upon initial login, users will be asked to fill out their personal information as well as specify an email and change their password.
            </p>
            <select
              id="require_profile"
              value={formData.require_profile ? '1' : '0'}
              onChange={(e) => handleInputChange('require_profile', e.target.value === '1')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>

          {/* Show Research Questions */}
          <div>
            <label htmlFor="require_research" className="block text-sm font-medium text-gray-900 mb-2">
              Show research questions?
            </label>
            <p className="text-sm text-gray-500 mb-3">
              If set to Yes, upon initial login, users will be asked to fill out optional research questions.
            </p>
            <select
              id="require_research"
              value={formData.require_research ? '1' : '0'}
              onChange={(e) => handleInputChange('require_research', e.target.value === '1')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>

          {/* Whitelabel */}
          <div>
            <label htmlFor="whitelabel" className="block text-sm font-medium text-gray-900 mb-2">
              Whitelabel client-assigned assessments?
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Specify whether all assessments assigned by a Client Admin will be white-labeled or not.
            </p>
            <select
              id="whitelabel"
              value={formData.whitelabel ? '1' : '0'}
              onChange={(e) => handleInputChange('whitelabel', e.target.value === '1')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitText}
        </Button>
      </div>
    </form>
  )
}
