import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('noteId')

  if (!noteId) {
    return NextResponse.json({ error: 'Missing noteId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .select('id, is_paid, file_path, file_name, author_id')
    .eq('id', noteId)
    .single()

  if (noteError || !note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  // Check access for paid notes
  if (note.is_paid && note.author_id !== user.id) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('note_id', noteId)
      .eq('status', 'completed')
      .single()

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase required' }, { status: 403 })
    }
  }

  const serviceClient = createServiceClient()

  const { data: signedUrl, error: urlError } = await serviceClient.storage
    .from('haven-files')
    .createSignedUrl(note.file_path, 60, {
      download: note.file_name,
    })

  if (urlError || !signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  // Atomic download increment (fire-and-forget, ignore errors)
  void serviceClient.rpc('increment_downloads', { note_id: noteId })

  return NextResponse.json({ url: signedUrl.signedUrl })
}
