export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          role: 'admin' | 'client' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'client' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'client' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      assessments: {
        Row: {
          id: string
          title: string
          description: string | null
          type: '360' | 'blockers' | 'leader' | 'custom'
          status: 'draft' | 'active' | 'completed' | 'archived'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: '360' | 'blockers' | 'leader' | 'custom'
          status?: 'draft' | 'active' | 'completed' | 'archived'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: '360' | 'blockers' | 'leader' | 'custom'
          status?: 'draft' | 'active' | 'completed' | 'archived'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          assessment_id: string
          text: string
          type: 'multiple_choice' | 'rating' | 'text' | 'boolean'
          order: number
          required: boolean
          options: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          text: string
          type: 'multiple_choice' | 'rating' | 'text' | 'boolean'
          order: number
          required?: boolean
          options?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          text?: string
          type?: 'multiple_choice' | 'rating' | 'text' | 'boolean'
          order?: number
          required?: boolean
          options?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
