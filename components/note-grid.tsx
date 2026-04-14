import { NoteCard } from '@/components/note-card'
import type { Note } from '@/types'

interface NoteGridProps {
  notes: Note[]
}

export function NoteGrid({ notes }: NoteGridProps) {
  if (notes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
        <div style={{ fontSize: '16px', color: '#3a3a3a', fontWeight: 500 }}>No notes found</div>
        <div style={{ fontSize: '14px', color: '#888', marginTop: '6px' }}>
          Try a different search or be the first to upload in this category
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}
