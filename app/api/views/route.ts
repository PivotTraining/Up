import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { noteId } = await request.json()

  if (!noteId) {
    return NextResponse.json({ error: 'Missing noteId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Atomic increment via RPC (fire-and-forget)
  void supabase.rpc('increment_views', { note_id: noteId })

  return NextResponse.json({ ok: true })
}
