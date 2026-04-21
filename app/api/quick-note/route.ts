import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, presenter, date, category, location, youtubeUrl, description, tags, price, isPaid } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  if (!presenter?.trim()) return NextResponse.json({ error: 'Presenter is required' }, { status: 400 })
  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 })

  // Build description from structured fields
  const descParts: string[] = []
  if (presenter?.trim()) descParts.push(`Presenter: ${presenter.trim()}`)
  if (date) descParts.push(`Date: ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  if (location?.trim()) descParts.push(`Location: ${location.trim()}`)
  if (description?.trim()) descParts.push(description.trim())

  const fullDescription = descParts.join('\n') || 'Community note'
  const priceCents = isPaid && price > 0 ? price : 0

  const serviceClient = createServiceClient()

  const { data: note, error: dbError } = await serviceClient
    .from('notes')
    .insert({
      author_id: user.id,
      title: title.trim(),
      description: fullDescription,
      category,
      price: priceCents,
      is_paid: priceCents > 0,
      presenter: presenter?.trim() || null,
      location: location?.trim() || null,
      youtube_url: youtubeUrl || null,
      tags: Array.isArray(tags) ? tags : [],
      file_path: null,
      file_name: null,
      file_size: 0,
      is_published: true,
    })
    .select()
    .single()

  if (dbError) {
    console.error('Quick note DB error:', dbError)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }

  return NextResponse.json({ note }, { status: 201 })
}
