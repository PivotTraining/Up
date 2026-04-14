import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const { noteId, userId } = paymentIntent.metadata

    if (!noteId || !userId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('purchases').insert({
      user_id: userId,
      note_id: noteId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_paid: paymentIntent.amount,
      status: 'completed',
    })

    if (error) {
      console.error('Failed to record purchase:', error)
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
