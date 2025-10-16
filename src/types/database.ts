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
      }
       users: {
         Row: {
           id: string
           auth_user_id: string | null
           username: string
           name: string
           email: string
           client_id: string | null
           industry_id: string | null
           language_id: string | null
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
           last_login_at?: string | null
           completed_profile?: boolean
           accepted_terms?: boolean | null
           accepted_at?: string | null
           accepted_signature?: string | null
           created_at?: string
           updated_at?: string
         }
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
