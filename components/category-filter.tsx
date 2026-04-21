'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'
import { useTransition } from 'react'

interface CategoryFilterProps {
  selected?: string
}

export function CategoryFilter({ selected }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('category', value)
    } else {
      params.delete('category')
    }
    startTransition(() => {
      router.push(`/?${params.toString()}`)
    })
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button
        onClick={() => handleClick('')}
        className={`filter-pill${!selected ? ' active' : ''}`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => handleClick(cat.value)}
          className={`filter-pill${selected === cat.value ? ' active' : ''}`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
