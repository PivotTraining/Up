import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { noteId, rating } = await request.json()

  if (!noteId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Upsert rating (update if user already rated)
  const { error } = await serviceClient
    .from('ratings')
    .upsert({ user_id: user.id, note_id: noteId, rating }, { onConflict: 'user_id,note_id' })

  if (error) {
    console.error('Rating error:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
