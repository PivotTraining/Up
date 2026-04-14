'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StarRatingProps {
  noteId: string
  avg: number
  count: number
  interactive?: boolean
  size?: 'sm' | 'md'
}

export function StarRating({ noteId, avg, count, interactive = false, size = 'sm' }: StarRatingProps) {
  const router = useRouter()
  const [hover, setHover] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [localAvg, setLocalAvg] = useState(avg)
  const [localCount, setLocalCount] = useState(count)

  const starSize = size === 'sm' ? '13px' : '20px'
  const filled = hover || localAvg

  async function handleRate(rating: number) {
    if (!interactive || submitted) return

    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, rating }),
    })

    if (res.status === 401) {
      router.push('/auth/login')
      return
    }

    if (res.ok) {
      setSubmitted(true)
      // Optimistic update
      const newCount = localCount + 1
      setLocalAvg(Math.round(((localAvg * localCount) + rating) / newCount * 10) / 10)
      setLocalCount(newCount)
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '1px' }}>
        {[1, 2, 3, 4, 5].map(star => {
          const isFilled = interactive ? star <= (hover || 0) : star <= Math.round(localAvg)
          const isHalf = !interactive && star === Math.ceil(localAvg) && localAvg % 1 >= 0.25 && localAvg % 1 < 0.75

          return (
            <span
              key={star}
              onMouseEnter={() => interactive && !submitted && setHover(star)}
              onMouseLeave={() => interactive && setHover(0)}
              onClick={() => handleRate(star)}
              style={{
                fontSize: starSize,
                cursor: interactive && !submitted ? 'pointer' : 'default',
                color: isFilled ? '#f59e0b' : isHalf ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.1s',
                lineHeight: 1,
                display: 'inline-block',
              }}
            >
              {isHalf ? '⭐' : isFilled ? '★' : '☆'}
            </span>
          )
        })}
      </div>
      {localAvg > 0 && (
        <span style={{ fontSize: size === 'sm' ? '11px' : '13px', color: '#888', fontWeight: 600 }}>
          {localAvg.toFixed(1)}
          {localCount > 0 && <span style={{ fontWeight: 400, marginLeft: '2px' }}>({localCount})</span>}
        </span>
      )}
      {submitted && <span style={{ fontSize: '11px', color: '#2d6a4a', fontWeight: 600 }}>✓ Rated!</span>}
    </div>
  )
}
