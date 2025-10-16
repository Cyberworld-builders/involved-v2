'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ChangelogEntry {
  date: string
  title: string
  description: string
  features: string[]
  technical?: string[]
}

const changelogData: ChangelogEntry[] = [
  {
    date: '2025-10-16',
    title: 'User Management System & Authentication Integration',
    description: 'Complete user management system with proper Supabase Auth integration and simplified forms.',
    features: [
      'Removed job title and job family fields from user forms',
      'Removed language selector (defaults to English)',
      'Created comprehensive industry management system',
      'Fixed authentication checks on all client-side pages',
      'Implemented database trigger for automatic user profile creation',
      'Linked Supabase Auth to custom users table'
    ],
    technical: [
      'Database trigger automatically creates user profiles on signup',
      'Proper TypeScript types for auth user integration',
      'Enhanced middleware with profile existence checks',
      'Simplified user forms focusing on essential fields'
    ]
  },
  {
    date: '2025-10-16',
    title: 'Client Management System',
    description: 'Complete client management system with familiar UX patterns from the original Laravel application.',
    features: [
      'Client CRUD operations with image upload support',
      'Branding management (logo, background, colors)',
      'Settings configuration (profile requirements, research questions, whitelabel)',
      'Familiar navigation sidebar matching original design',
      'Responsive design for all devices'
    ],
    technical: [
      'Supabase integration for database and file storage',
      'Row Level Security for data protection',
      'TypeScript types for full type safety',
      'Image upload handling with preview functionality'
    ]
  },
  {
    date: '2025-10-16',
    title: 'Project Foundation & Authentication',
    description: 'Initial project setup with Next.js 14, Supabase integration, and working authentication flow.',
    features: [
      'Next.js 14 project with TypeScript and Tailwind CSS',
      'Supabase Auth integration with email/password and OAuth',
      'Protected routes with middleware',
      'Login and signup forms with proper validation',
      'Dashboard with session management'
    ],
    technical: [
      'App Router for modern React development',
      'SSR support with Supabase client',
      'Custom UI components with accessibility focus',
      'Environment configuration structure'
    ]
  }
]

export default function Changelog() {
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedEntries(newExpanded)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Development Changelog</CardTitle>
        <CardDescription>
          Recent updates and improvements to the Involved Talent platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {changelogData.map((entry, index) => (
            <div key={index} className="border-l-4 border-indigo-200 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{entry.title}</h3>
                  <p className="text-sm text-gray-500">{entry.date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(index)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {expandedEntries.has(index) ? 'Show Less' : 'Show Details'}
                </Button>
              </div>
              
              <p className="text-gray-700 mt-2">{entry.description}</p>
              
              {expandedEntries.has(index) && (
                <div className="mt-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {entry.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {entry.technical && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Technical Details</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {entry.technical.map((tech, techIndex) => (
                          <li key={techIndex} className="flex items-start">
                            <span className="text-blue-500 mr-2">⚙️</span>
                            {tech}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            For the complete development history, see{' '}
            <a 
              href="https://github.com/Cyberworld-builders/involved-v2/blob/main/docs/development-history.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              development-history.md
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
