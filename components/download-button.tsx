'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import type { Note } from '@/types'
import { formatPrice } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface DownloadButtonProps {
  note: Note
  canDownload: boolean
  userId?: string
  hasPurchased: boolean
}

export function DownloadButton({ note, canDownload, userId, hasPurchased }: DownloadButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    if (!userId) {
      router.push(`/auth/login?redirectTo=/notes/${note.id}`)
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch(`/api/download?noteId=${note.id}`)
    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Download failed')
      setLoading(false)
      return
    }

    window.open(data.url, '_blank')
    setLoading(false)
  }

  async function handlePurchase() {
    if (!userId) {
      router.push(`/auth/login?redirectTo=/notes/${note.id}`)
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId: note.id }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Checkout failed')
      setLoading(false)
      return
    }

    const stripe = await stripePromise
    if (!stripe) {
      setError('Payment service unavailable')
      setLoading(false)
      return
    }

    const { error: stripeError } = await stripe.confirmCardPayment(data.clientSecret)
    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed')
    } else {
      // Payment succeeded — wait a moment for webhook, then reload
      setTimeout(() => {
        router.refresh()
      }, 2000)
    }

    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {canDownload ? (
        <button
          onClick={handleDownload}
          disabled={loading}
          style={{ width: '100%', background: '#1a3a2a', color: '#fff', fontWeight: 500, padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
        >
          ↓ {loading ? 'Preparing download...' : 'Download Notes'}
        </button>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={loading}
          style={{ width: '100%', background: '#b8860b', color: '#fff', fontWeight: 500, padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
        >
          {loading ? 'Processing...' : `Buy for ${formatPrice(note.price)}`}
        </button>
      )}

      {error && (
        <p style={{ color: '#c0392b', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>{error}</p>
      )}

      {note.is_paid && !hasPurchased && !canDownload && (
        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '6px' }}>
          One-time purchase · Instant access after payment
        </p>
      )}
    </div>
  )
}
