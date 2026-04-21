'use client'

import { useState } from 'react'
import { QuickCompose } from '@/components/quick-compose'

export function ComposeButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '14px 18px',
          background: '#fff',
          border: '1.5px solid #e0ddd8',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2d6a4a'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(45,106,74,0.08)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0ddd8'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
        }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e8f2ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '18px' }}>✍️</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: '#888', fontWeight: 400 }}>Share a note with the community...</div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: '#1a3a2a', padding: '4px 12px', borderRadius: '20px', flexShrink: 0 }}>
          + Post
        </span>
      </button>

      {open && <QuickCompose onClose={() => setOpen(false)} />}
    </>
  )
}
