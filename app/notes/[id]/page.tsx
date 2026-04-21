import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, formatFileSize, formatDate } from '@/lib/utils'
import type { Note } from '@/types'
import { DownloadButton } from '@/components/download-button'
import { StarRating } from '@/components/star-rating'

const CATEGORY_BADGE: Record<string, string> = {
  faith: 'badge-faith',
  academic: 'badge-academic',
  training: 'badge-training',
  leadership: 'badge-leadership',
  health: 'badge-health',
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return match?.[1] ?? null
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { id } = await params
  const { preview } = await searchParams
  const isPreview = preview === '1'

  const supabase = await createClient()

  const { data: note, error } = await supabase
    .from('notes')
    .select('*, profiles(full_name, organization, avatar_url)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !note) notFound()

  // Increment view count (fire-and-forget)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId: id }),
  }).catch(() => {})

  const { data: { user } } = await supabase.auth.getUser()

  let hasPurchased = false
  if (user && note.is_paid) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('note_id', id)
      .eq('status', 'completed')
      .single()
    hasPurchased = !!purchase
  }

  const canDownload = !note.is_paid || hasPurchased || note.author_id === user?.id
  const typedNote = note as Note & { profiles: { full_name: string | null; organization: string | null } }
  const authorName = typedNote.profiles?.full_name ?? 'Anonymous'
  const badgeClass = CATEGORY_BADGE[note.category] ?? 'badge-faith'
  const isPaid = note.is_paid && note.price > 0
  const tags: string[] = note.tags ?? []
  const youtubeId = note.youtube_url ? getYouTubeId(note.youtube_url) : null
  const hasRating = (note.rating_avg ?? 0) > 0

  // In preview mode, show teaser only — blur/lock the rest if paid
  const showFullContent = !isPreview || canDownload

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Back link */}
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1a3a2a', textDecoration: 'none', marginBottom: '20px' }}>
        ← Back to notes
      </Link>

      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e0ddd8', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>

        {/* Green header */}
        <div style={{ background: '#1a3a2a', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span className={`badge ${badgeClass}`} style={{ fontSize: '10px' }}>
              {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
            </span>
            {note.youtube_url && (
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(220,38,38,0.2)', color: '#fca5a5', padding: '3px 9px', borderRadius: '20px' }}>
                ▶ YouTube
              </span>
            )}
            {isPreview && (
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(184,134,11,0.2)', color: '#fcd34d', padding: '3px 9px', borderRadius: '20px' }}>
                Preview Mode
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '12px' }}>
            {note.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getInitials(authorName)}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{authorName}</div>
              {(note.presenter || typedNote.profiles?.organization) && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                  {note.presenter ?? typedNote.profiles?.organization}
                </div>
              )}
            </div>
            {note.location && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>
                📍 {note.location}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {tags.map(tag => (
                <span key={tag} style={{ fontSize: '12px', color: '#2d6a4a', background: '#e8f2ec', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Rating */}
          <div style={{ marginBottom: '20px' }}>
            <StarRating
              noteId={note.id}
              avg={note.rating_avg ?? 0}
              count={note.rating_count ?? 0}
              interactive={!!user && note.author_id !== user?.id}
              size="md"
            />
            {user && note.author_id !== user?.id && !hasRating && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Click to rate this note</p>
            )}
          </div>

          {/* YouTube embed */}
          {youtubeId && (
            <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Session video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
            </div>
          )}

          {/* Description / preview */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', color: '#3a3a3a', lineHeight: 1.7, padding: '16px', background: '#f6f5f2', borderRadius: '10px', borderLeft: '3px solid #2d6a4a' }}>
              {note.description}
            </div>

            {/* Blur overlay for paid preview */}
            {isPreview && isPaid && !canDownload && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to bottom, transparent, rgba(246,245,242,0.95) 60%, #f6f5f2)' }} />
            )}
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: '#f6f5f2', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', fontWeight: 600 }}>Category</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f0f0f' }}>{note.category.charAt(0).toUpperCase() + note.category.slice(1)}</div>
            </div>
            <div style={{ background: '#f6f5f2', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', fontWeight: 600 }}>Uploaded</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f0f0f' }}>{formatDate(note.created_at)}</div>
            </div>
            <div style={{ background: '#f6f5f2', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', fontWeight: 600 }}>Views</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f0f0f' }}>{note.views}</div>
            </div>
            <div style={{ background: '#f6f5f2', padding: '10px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', fontWeight: 600 }}>File size</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f0f0f' }}>{note.file_size ? formatFileSize(note.file_size) : 'Text note'}</div>
            </div>
          </div>

          {/* Price / free section */}
          {isPaid ? (
            <div style={{ background: '#fdf8e8', border: '1.5px solid #e8c84a', borderRadius: '16px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#b8860b', marginBottom: '6px' }}>{formatPrice(note.price)}</div>
              <div style={{ fontSize: '13px', color: '#3a3a3a', marginBottom: '4px' }}>One-time purchase · Yours forever</div>
              {isPreview && !canDownload && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  You&apos;re viewing a preview · Purchase to see the full notes
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#e8f2ec', border: '1.5px solid #a8d5b5', borderRadius: '16px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a3a2a', marginBottom: '4px' }}>Free Download</div>
              <div style={{ fontSize: '13px', color: '#3a3a3a' }}>Shared freely with the community</div>
            </div>
          )}

          <DownloadButton
            note={typedNote}
            canDownload={canDownload}
            userId={user?.id}
            hasPurchased={hasPurchased}
          />

          {/* YouTube link (if no embed) */}
          {note.youtube_url && !youtubeId && (
            <a
              href={note.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#dc2626', textDecoration: 'none', padding: '10px 14px', background: '#fee2e2', borderRadius: '10px' }}
            >
              ▶ Watch session on YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
