'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface SearchBarProps {
  defaultValue?: string
}

export function SearchBar({ defaultValue }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const handleSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (term) {
        params.set('q', term)
      } else {
        params.delete('q')
      }
      startTransition(() => {
        router.push(`/?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '16px', pointerEvents: 'none' }}>
        🔍
      </span>
      <input
        type="search"
        placeholder="Search notes, topics, creators..."
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="form-input"
        style={{ paddingLeft: '40px' }}
      />
    </div>
  )
}
