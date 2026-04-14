export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          organization: string | null
          bio: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          organization?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          full_name?: string | null
          organization?: string | null
          bio?: string | null
          avatar_url?: string | null
        }
      }
      notes: {
        Row: {
          id: string
          author_id: string
          title: string
          description: string
          category: 'faith' | 'academic' | 'training' | 'leadership' | 'health'
          price: number
          is_paid: boolean
          file_path: string
          file_name: string
          file_size: number
          views: number
          downloads: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          description: string
          category: 'faith' | 'academic' | 'training' | 'leadership' | 'health'
          price?: number
          is_paid?: boolean
          file_path: string
          file_name: string
          file_size: number
          views?: number
          downloads?: number
          is_published?: boolean
        }
        Update: {
          title?: string
          description?: string
          category?: 'faith' | 'academic' | 'training' | 'leadership' | 'health'
          price?: number
          is_paid?: boolean
          is_published?: boolean
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          note_id: string
          stripe_payment_intent_id: string
          amount_paid: number
          status: 'pending' | 'completed' | 'refunded'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          note_id: string
          stripe_payment_intent_id: string
          amount_paid: number
          status?: 'pending' | 'completed' | 'refunded'
        }
        Update: {
          status?: 'pending' | 'completed' | 'refunded'
        }
      }
    }
  }
}
