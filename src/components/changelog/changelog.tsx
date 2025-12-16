'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Phase1Feature {
  title: string
  description: string
  commits: string[]
  resources?: {
    slug: string
    title: string
    video?: string
  }[]
  status: 'completed' | 'in-progress'
}

const phase1Features: Phase1Feature[] = [
  {
    title: 'User Management & Onboarding',
    description: 'Complete user management system with single and bulk user creation, invites, password resets, and role-based access control.',
    status: 'completed',
    commits: [
      'eed4bb5 - Add client admin user management features',
      '4c7d766 - Member class user "my assignments" home screen and access restrictions',
      '0e04178 - User onboarding video',
      '8487a27 - Scope client admin views to their own client and update user onboarding docs',
      '442c3f4 - Add user invite UI and improve user creation error handling',
      '3fd11d5 - Fix username auto-generation and bulk upload flow',
      '8560efe - Implement user access levels (member/client_admin/super_admin)',
      '8be9aec - Implement RBAC role management for user administration',
    ],
    resources: [
      {
        slug: 'user-onboarding',
        title: 'User onboarding (single + bulk) — end-to-end',
        video: 'phase-1/onboarding.mp4',
      },
    ],
  },
  {
    title: 'Client Management',
    description: 'Full CRUD operations for client organizations with branding, settings, and user management capabilities.',
    status: 'completed',
    commits: [
      '459f56e - Fix client user count display and Mailpit SMTP port exposure',
      'cf4b369 - User count',
      '1e4a6a0 - Hide Assignments tab from client detail page',
      'b0edc29 - Hide Assignments tab from client page',
    ],
    resources: [
      {
        slug: 'clients-setup',
        title: 'Clients: create, view, edit & delete',
        video: 'phase-1/clients.mp4',
      },
    ],
  },
  {
    title: 'Industry Management',
    description: 'Complete industry category management system for organizing users and benchmarks.',
    status: 'completed',
    commits: [
      '7b5b1aa - Implement delete industry functionality with UI and test coverage',
    ],
    resources: [
      {
        slug: 'industries-phase-1',
        title: 'Industries: create, view, edit & delete',
        video: 'phase-1/industries.mp4',
      },
    ],
  },
  {
    title: 'Assessment Management (Phase 1)',
    description: 'Assessment lifecycle management with details and dimensions. Fields and Settings tabs are intentionally hidden for Phase 1.',
    status: 'completed',
    commits: [
      'bc234e0 - Restore assessment edit + dimensions for benchmarks',
      '387dafc - Remove View/Edit buttons from assessments table, add Manage Benchmarks button',
      'f2fe589 - Restore assessment detail pages and fix benchmark manage navigation',
      '8fec846 - Hide incomplete features for Phase 1: Feedback navigation and Fields tab',
      '2ec68f7 - Hide Feedback link and Fields tab, enable assessments page',
      '4756068 - Chore: gate non-Phase I pages and improve assessment fields',
      '0388b5b - Strip HTML tags from assessment descriptions in table view',
      'c5229c2 - Add HTML stripping utility and update AssessmentsTable to strip HTML tags',
    ],
    resources: [
      {
        slug: 'assessments-phase-1',
        title: 'Assessments: create, view, edit & delete (details + dimensions)',
        video: 'phase-1/assessments-dimensions.mp4',
      },
    ],
  },
  {
    title: 'Benchmark Management',
    description: 'Complete benchmark value management system with industry-specific benchmarks, CSV upload/download, and bulk operations.',
    status: 'completed',
    commits: [
      'caff397 - Add view for single benchmark details with test coverage',
      'a57d49b - Implement benchmark filtering by assessment_id via dimensions join',
      '0a9876d - Add bulk benchmark upload feature from spreadsheet',
      '021ea40 - Add comprehensive unit tests for bulk benchmark CSV upload functionality',
      '65956bd - Verify and document Phase 1 delete benchmark functionality',
      'f577865 - Fix #63: add delete benchmark action',
      '3d41425 - Implement benchmark filtering by assessment_id with comprehensive tests',
      '418e85c - Document Phase 1 benchmark update implementation status',
    ],
    resources: [
      {
        slug: 'benchmarks-phase-1',
        title: 'Benchmarks: create, view, edit, delete & bulk upload',
        video: 'phase-1/benchmarks.mp4',
      },
    ],
  },
  {
    title: 'Email Infrastructure',
    description: 'Email service integration with Resend and AWS SES support, including local testing with Mailpit.',
    status: 'completed',
    commits: [
      'eb3f0f2 - Add Terraform infrastructure for AWS SES email sending',
      '9c2d9be - Switch email service to Resend',
      '0ad8c34 - Add SMTP email support with Mailpit for local testing',
      '26b8422 - Improve email error messages for better debugging',
    ],
  },
  {
    title: 'Role-Based Access Control (RBAC)',
    description: 'Comprehensive access control system with three access levels: member, client_admin, and super_admin.',
    status: 'completed',
    commits: [
      '8560efe - Implement user access levels (member/client_admin/super_admin)',
      '8be9aec - Implement RBAC role management for user administration',
      'f85a2da - Fix users page RBAC to use access_level',
      '4c7d766 - Member class user "my assignments" home screen and access restrictions',
    ],
  },
]

export default function Changelog() {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set())

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedFeatures)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedFeatures(newExpanded)
  }

  const getCommitUrl = (commitHash: string) => {
    return `https://github.com/Cyberworld-builders/involved-v2/commit/${commitHash}`
  }

  const getResourceUrl = (slug: string) => {
    return `/dashboard/resources/${slug}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase 1 Completion Breakdown</CardTitle>
        <CardDescription>
          Comprehensive overview of Phase 1 features, implementation commits, and resource materials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {phase1Features.map((feature, index) => (
            <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        feature.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {feature.status === 'completed' ? '✓ Completed' : 'In Progress'}
                    </span>
                  </div>
                  <p className="text-gray-700 mt-1">{feature.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(index)}
                  className="text-indigo-600 hover:text-indigo-700 ml-4"
                >
                  {expandedFeatures.has(index) ? 'Collapse' : 'Expand'}
                </Button>
              </div>

              {expandedFeatures.has(index) && (
                <div className="mt-4 space-y-4">
                  {/* Commits Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span>📝</span>
                      Implementation Commits
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1.5">
                      {feature.commits.map((commit, commitIndex) => {
                        const [hash, ...messageParts] = commit.split(' - ')
                        const message = messageParts.join(' - ')
                        return (
                          <li key={commitIndex} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>
                              <a
                                href={getCommitUrl(hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline font-mono text-xs"
                              >
                                {hash}
                              </a>
                              {' - '}
                              <span>{message}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {/* Resources Section */}
                  {feature.resources && feature.resources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span>📚</span>
                        Resource Materials & Media
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-2">
                        {feature.resources.map((resource, resourceIndex) => (
                          <li key={resourceIndex} className="flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            <div className="flex-1">
                              <Link
                                href={getResourceUrl(resource.slug)}
                                className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                              >
                                {resource.title}
                              </Link>
                              {resource.video && (
                                <div className="text-xs text-gray-500 mt-1">
                                  📹 Video: <span className="font-mono">{resource.video}</span>
                                </div>
                              )}
                            </div>
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

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">📊 Phase 1 Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Features:</span>
                <span className="ml-2 font-semibold text-gray-900">{phase1Features.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Completed:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {phase1Features.filter((f) => f.status === 'completed').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Commits:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {phase1Features.reduce((sum, f) => sum + f.commits.length, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Resource Guides:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {phase1Features.reduce((sum, f) => sum + (f.resources?.length || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
