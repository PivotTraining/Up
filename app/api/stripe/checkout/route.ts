import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { noteId } = await request.json()

  if (!noteId) {
    return NextResponse.json({ error: 'Missing noteId' }, { status: 400 })
  }

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .select('id, title, price, is_paid, author_id')
    .eq('id', noteId)
    .single()

  if (noteError || !note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  if (!note.is_paid || note.price === 0) {
    return NextResponse.json({ error: 'This note is free' }, { status: 400 })
  }

  if (note.author_id === user.id) {
    return NextResponse.json({ error: 'Cannot purchase your own note' }, { status: 400 })
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('note_id', noteId)
    .eq('status', 'completed')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: note.price,
    currency: 'usd',
    metadata: {
      noteId,
      userId: user.id,
    },
    description: `Haven: ${note.title}`,
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
