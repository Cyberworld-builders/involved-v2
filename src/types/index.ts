export type { Database } from './database'

export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: 'admin' | 'manager' | 'client' | 'user' | 'unverified'
  access_level: 'member' | 'client_admin' | 'super_admin'
  created_at: string
  updated_at: string
}

export interface Assessment {
  id: string
  title: string
  description?: string
  type: '360' | 'blockers' | 'leader' | 'custom'
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_by: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  assessment_id: string
  text: string
  type: 'multiple_choice' | 'rating' | 'text' | 'boolean'
  order: number
  required: boolean
  options?: string[]
  created_at: string
  updated_at: string
}

export interface AssessmentResponse {
  id: string
  assessment_id: string
  user_id: string
  responses: Record<string, unknown>
  completed_at?: string
  created_at: string
  updated_at: string
}
