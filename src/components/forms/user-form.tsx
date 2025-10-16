'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UserFormData {
  username: string
  name: string
  email: string
  password: string
  client_id: string
  job_title: string
  job_family: string
  industry_id: string
  language_id: string
}

interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSubmit: (data: UserFormData) => void
  isLoading?: boolean
  submitText?: string
  clients?: Array<{ id: string; name: string }>
  industries?: Array<{ id: string; name: string }>
  languages?: Array<{ id: string; name: string }>
}

export default function UserForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitText = 'Add User',
  clients = [],
  industries = [],
  languages = []
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: initialData?.username || '',
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: initialData?.password || '',
    client_id: initialData?.client_id || '',
    job_title: initialData?.job_title || '',
    job_family: initialData?.job_family || '',
    industry_id: initialData?.industry_id || '',
    language_id: initialData?.language_id || '',
  })

  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  // Generate username from name if not provided
  useEffect(() => {
    if (!formData.username && formData.name) {
      const generatedUsername = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20)
      setFormData(prev => ({ ...prev, username: generatedUsername }))
    }
  }, [formData.name, formData.username])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            Basic information about the user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-2">
              Username
            </label>
            <p className="text-sm text-gray-500 mb-3">The username that identifies this user.</p>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Full Name
            </label>
            <p className="text-sm text-gray-500 mb-3">The full name of this user.</p>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
              Email Address
            </label>
            <p className="text-sm text-gray-500 mb-3">This user&apos;s email. This will be used to email the user their assessments.</p>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
              Password
            </label>
            <p className="text-sm text-gray-500 mb-3">The user&apos;s login password.</p>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                required
                minLength={4}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="text-gray-400">
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization & Role</CardTitle>
          <CardDescription>
            Client association and job information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client */}
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-900 mb-2">
              Client Organization
            </label>
            <p className="text-sm text-gray-500 mb-3">The client organization this user belongs to.</p>
            <select
              id="client_id"
              value={formData.client_id}
              onChange={(e) => handleInputChange('client_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="job_title" className="block text-sm font-medium text-gray-900 mb-2">
              Job Title
            </label>
            <p className="text-sm text-gray-500 mb-3">The user&apos;s current job title.</p>
            <input
              type="text"
              id="job_title"
              value={formData.job_title}
              onChange={(e) => handleInputChange('job_title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Job Family */}
          <div>
            <label htmlFor="job_family" className="block text-sm font-medium text-gray-900 mb-2">
              Job Family
            </label>
            <p className="text-sm text-gray-500 mb-3">The user&apos;s job family or category.</p>
            <input
              type="text"
              id="job_family"
              value={formData.job_family}
              onChange={(e) => handleInputChange('job_family', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Industry and language preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Industry */}
          <div>
            <label htmlFor="industry_id" className="block text-sm font-medium text-gray-900 mb-2">
              Industry
            </label>
            <p className="text-sm text-gray-500 mb-3">The industry this user works in.</p>
            <select
              id="industry_id"
              value={formData.industry_id}
              onChange={(e) => handleInputChange('industry_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select an industry...</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language_id" className="block text-sm font-medium text-gray-900 mb-2">
              Preferred Language
            </label>
            <p className="text-sm text-gray-500 mb-3">The user&apos;s preferred language for the interface.</p>
            <select
              id="language_id"
              value={formData.language_id}
              onChange={(e) => handleInputChange('language_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a language...</option>
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name}
                </option>
              ))}
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
