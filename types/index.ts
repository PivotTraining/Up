export type Category = 'faith' | 'academic' | 'training' | 'leadership' | 'health'

export type Note = {
  id: string
  author_id: string
  title: string
  description: string
  category: Category
  price: number
  is_paid: boolean
  file_path: string | null
  file_name: string | null
  file_size: number
  views: number
  downloads: number
  is_published: boolean
  created_at: string
  updated_at: string
  // v2 fields
  tags?: string[]
  presenter?: string | null
  location?: string | null
  youtube_url?: string | null
  rating_avg?: number | null
  rating_count?: number | null
  profiles?: Profile
}

export type Profile = {
  id: string
  full_name: string | null
  organization: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export type Purchase = {
  id: string
  user_id: string
  note_id: string
  stripe_payment_intent_id: string
  amount_paid: number
  status: 'pending' | 'completed' | 'refunded'
  created_at: string
}

export type Rating = {
  id: string
  user_id: string
  note_id: string
  rating: number
  created_at: string
}
