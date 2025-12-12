export interface Database {
  public: {
    Tables: {
      assessments: {
        Row: {
          id: string
          title: string
          description: string | null
          logo: string | null
          background: string | null
          primary_color: string
          accent_color: string
          split_questions: boolean
          questions_per_page: number
          timed: boolean
          time_limit: number | null
          target: string | null
          is_360: boolean
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
          logo?: string | null
          background?: string | null
          primary_color?: string
          accent_color?: string
          split_questions?: boolean
          questions_per_page?: number
          timed?: boolean
          time_limit?: number | null
          target?: string | null
          is_360?: boolean
          type?: '360' | 'blockers' | 'leader' | 'custom'
          status?: 'draft' | 'active' | 'completed' | 'archived'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          logo?: string | null
          background?: string | null
          primary_color?: string
          accent_color?: string
          split_questions?: boolean
          questions_per_page?: number
          timed?: boolean
          time_limit?: number | null
          target?: string | null
          is_360?: boolean
          type?: '360' | 'blockers' | 'leader' | 'custom'
          status?: 'draft' | 'active' | 'completed' | 'archived'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimensions: {
        Row: {
          id: string
          assessment_id: string
          name: string
          code: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          name: string
          code: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          name?: string
          code?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fields: {
        Row: {
          id: string
          assessment_id: string
          dimension_id: string | null
          type: 'rich_text' | 'multiple_choice' | 'slider'
          content: string
          order: number
          anchors: Array<{
            id: string
            name: string
            value: number
            practice: boolean
          }>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          dimension_id?: string | null
          type: 'rich_text' | 'multiple_choice' | 'slider'
          content: string
          order: number
          anchors?: Array<{
            id: string
            name: string
            value: number
            practice: boolean
          }>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          dimension_id?: string | null
          type?: 'rich_text' | 'multiple_choice' | 'slider'
          content?: string
          order?: number
          anchors?: Array<{
            id: string
            name: string
            value: number
            practice: boolean
          }>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          address: string | null
          logo: string | null
          background: string | null
          primary_color: string | null
          accent_color: string | null
          require_profile: boolean
          require_research: boolean
          whitelabel: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          logo?: string | null
          background?: string | null
          primary_color?: string | null
          accent_color?: string | null
          require_profile?: boolean
          require_research?: boolean
          whitelabel?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          logo?: string | null
          background?: string | null
          primary_color?: string | null
          accent_color?: string | null
          require_profile?: boolean
          require_research?: boolean
          whitelabel?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
         Row: {
           id: string
           auth_user_id: string | null
           username: string
           name: string
           email: string
           client_id: string | null
           industry_id: string | null
           language_id: string | null
           role: 'admin' | 'client' | 'user'
           last_login_at: string | null
           completed_profile: boolean
           accepted_terms: boolean | null
           accepted_at: string | null
           accepted_signature: string | null
           created_at: string
           updated_at: string
         }
         Insert: {
           id?: string
           auth_user_id?: string | null
           username: string
           name: string
           email: string
           client_id?: string | null
           industry_id?: string | null
           language_id?: string | null
           role?: 'admin' | 'client' | 'user'
           last_login_at?: string | null
           completed_profile?: boolean
           accepted_terms?: boolean | null
           accepted_at?: string | null
           accepted_signature?: string | null
           created_at?: string
           updated_at?: string
         }
         Update: {
           id?: string
           auth_user_id?: string | null
           username?: string
           name?: string
           email?: string
           client_id?: string | null
           industry_id?: string | null
           language_id?: string | null
           role?: 'admin' | 'client' | 'user'
           last_login_at?: string | null
           completed_profile?: boolean
           accepted_terms?: boolean | null
           accepted_at?: string | null
           accepted_signature?: string | null
           created_at?: string
           updated_at?: string
         }
         Relationships: []
       }
      industries: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          id: string
          name: string
          code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          profile_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          profile_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          profile_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      benchmarks: {
        Row: {
          id: string
          dimension_id: string
          industry_id: string
          value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dimension_id: string
          industry_id: string
          value: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dimension_id?: string
          industry_id?: string
          value?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          user_id: string
          assessment_id: string
          target_id: string | null
          custom_fields: Record<string, unknown> | null
          expires: string
          whitelabel: boolean
          job_id: string | null
          url: string | null
          completed: boolean
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assessment_id: string
          target_id?: string | null
          custom_fields?: Record<string, unknown> | null
          expires: string
          whitelabel?: boolean
          job_id?: string | null
          url?: string | null
          completed?: boolean
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assessment_id?: string
          target_id?: string | null
          custom_fields?: Record<string, unknown> | null
          expires?: string
          whitelabel?: boolean
          job_id?: string | null
          url?: string | null
          completed?: boolean
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          id: string
          profile_id: string
          token: string
          expires_at: string
          status: 'pending' | 'accepted' | 'expired' | 'revoked'
          invited_by: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          token: string
          expires_at: string
          status?: 'pending' | 'accepted' | 'expired' | 'revoked'
          invited_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          token?: string
          expires_at?: string
          status?: 'pending' | 'accepted' | 'expired' | 'revoked'
          invited_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
