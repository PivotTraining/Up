import Link from 'next/link'
import type { Note } from '@/types'
import { formatPrice } from '@/lib/utils'

interface NoteCardProps {
  note: Note
}

const CATEGORY_BADGE: Record<string, string> = {
  faith: 'badge-faith',
  academic: 'badge-academic',
  training: 'badge-training',
  leadership: 'badge-leadership',
  health: 'badge-health',
}

const AVATAR_COLORS = [
  '#1a3a2a', '#2d6a4a', '#1565c0', '#6a1b9a', '#e65100', '#c62828', '#00695c', '#283593',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function renderStars(avg: number) {
  const rounded = Math.round(avg)
  return [1, 2, 3, 4, 5].map(s => (
    <span key={s} style={{ color: s <= rounded ? '#f59e0b' : '#d1d5db', fontSize: '11px' }}>★</span>
  ))
}

export function NoteCard({ note }: NoteCardProps) {
  const author = note.profiles as { full_name?: string | null; organization?: string | null } | undefined
  const authorName = author?.full_name ?? 'Anonymous'
  const initials = getInitials(authorName)
  const avatarColor = getAvatarColor(authorName)
  const badgeClass = CATEGORY_BADGE[note.category] ?? 'badge-faith'
  const isPaid = note.is_paid && note.price > 0
  const hasRating = (note.rating_avg ?? 0) > 0
  const tags = note.tags ?? []
  const hasYoutube = !!note.youtube_url
  const presenter = note.presenter

  return (
    <div
      className="note-card"
      style={{
        background: '#fff',
        border: '1px solid #e0ddd8',
        borderRadius: '16px',
        padding: '18px',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top row: badge + price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${badgeClass}`}>
            {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
          </span>
          {hasYoutube && (
            <span style={{ fontSize: '10px', fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.3px' }}>
              ▶ YouTube
            </span>
          )}
        </div>
        {isPaid ? (
          <span style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '13px', fontWeight: 700, color: '#1a3a2a', flexShrink: 0 }}>
            {formatPrice(note.price)}
          </span>
        ) : (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2d6a4a', background: '#e8f2ec', padding: '3px 8px', borderRadius: '20px', flexShrink: 0 }}>
            Free
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f0f0f', marginBottom: '4px', lineHeight: 1.35 }}>
        {note.title}
      </h3>

      {/* Presenter + meta */}
      {presenter && (
        <div style={{ fontSize: '12px', color: '#2d6a4a', fontWeight: 600, marginBottom: '4px' }}>
          {presenter}
        </div>
      )}

      {/* Rating */}
      {hasRating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          {renderStars(note.rating_avg ?? 0)}
          <span style={{ fontSize: '11px', color: '#888', marginLeft: '2px' }}>
            {(note.rating_avg ?? 0).toFixed(1)} ({note.rating_count})
          </span>
        </div>
      )}

      {/* Excerpt */}
      <p className="line-clamp-2" style={{ fontSize: '13px', color: '#3a3a3a', lineHeight: 1.6, flex: 1, marginBottom: '10px' }}>
        {note.description}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {tags.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: '11px', color: '#2d6a4a', background: '#e8f2ec', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #e0ddd8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: avatarColor, color: '#fff', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initials}
          </div>
          <span style={{ fontSize: '12px', color: '#3a3a3a', fontWeight: 500 }}>{authorName}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Link
            href={`/notes/${note.id}?preview=1`}
            style={{ fontSize: '12px', fontWeight: 600, color: '#1a3a2a', padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #1a3a2a', textDecoration: 'none', background: 'transparent' }}
          >
            Preview
          </Link>
          <Link
            href={`/notes/${note.id}`}
            style={{ fontSize: '12px', fontWeight: 600, color: '#fff', padding: '4px 10px', borderRadius: '6px', background: '#1a3a2a', textDecoration: 'none' }}
          >
            {isPaid ? 'Get' : 'Download'}
          </Link>
        </div>
      </div>

      {/* Locked overlay */}
      {isPaid && (
        <div className="locked-overlay">
          <Link
            href={`/notes/${note.id}?preview=1`}
            style={{ background: '#1a3a2a', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            Preview · {formatPrice(note.price)}
          </Link>
        </div>
      )}
    </div>
  )
}
