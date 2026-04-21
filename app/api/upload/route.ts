import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const price = parseInt(formData.get('price') as string || '0', 10)
  const isPaid = price > 0

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
  }

  if (!title || !description || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`
  const serviceClient = createServiceClient()

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await serviceClient.storage
    .from('haven-files')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
  }

  const { data: note, error: dbError } = await serviceClient
    .from('notes')
    .insert({
      author_id: user.id,
      title,
      description,
      category,
      price,
      is_paid: isPaid,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      is_published: true,
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file on DB error
    await serviceClient.storage.from('haven-files').remove([filePath])
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }

  return NextResponse.json({ note }, { status: 201 })
}
