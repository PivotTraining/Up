'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'

const POPULAR_SPEAKERS = [
  'T.D. Jakes', 'John Gray', 'Steven Furtick', 'Priscilla Shirer',
  'Craig Groeschel', 'Andy Stanley', 'Christine Caine', 'Louie Giglio',
  'Beth Moore', 'Francis Chan', 'Rick Warren', 'Joyce Meyer',
  'Tony Evans', 'Kirk Franklin', 'DeVon Franklin', 'Sarah Jakes Roberts',
]

const s: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #e0ddd8',
  borderRadius: '10px',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  fontSize: '14px',
  color: '#0f0f0f',
  background: '#fff',
  outline: 'none',
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#3a3a3a',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const required = <span style={{ color: '#c0392b', marginLeft: '2px' }}>*</span>
const optional = <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 400, textTransform: 'none', marginLeft: '4px' }}>(optional)</span>

interface QuickComposeProps {
  onClose: () => void
}

export function QuickCompose({ onClose }: QuickComposeProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [presenter, setPresenter] = useState('')
  const [presenterSuggestions, setPresenterSuggestions] = useState<string[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPaid, setIsPaid] = useState(false)
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const presenterRef = useRef<HTMLDivElement>(null)

  const youtubeValid = youtubeUrl && (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handlePresenterInput(val: string) {
    setPresenter(val)
    setPresenterSuggestions(
      val.length > 1
        ? POPULAR_SPEAKERS.filter(sp => sp.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
        : []
    )
  }

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
      if (!tags.includes(tag) && tags.length < 5) setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (!category) { setError('Category is required.'); return }
    if (!presenter.trim()) { setError('Presenter is required.'); return }
    if (!date) { setError('Date is required.'); return }

    setLoading(true)
    setError(null)

    const priceCents = isPaid && price ? Math.round(parseFloat(price) * 100) : 0

    const res = await fetch('/api/quick-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, presenter, date, category, location,
        youtubeUrl: youtubeUrl || null,
        description, tags, price: priceCents, isPaid,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 401) { router.push('/auth/login?redirectTo=/'); return }
      setError(data.error ?? 'Failed to post note')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => { onClose(); router.refresh() }, 1800)
  }

  if (success) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Note shared!</h3>
          <p style={{ color: '#888', fontSize: '14px' }}>Your note is now live in the community feed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f0f0f', marginBottom: '2px' }}>Share a Note</h2>
            <p style={{ fontSize: '13px', color: '#888' }}>Post to the Haven community</p>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f6f5f2', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#3a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
        </div>

        {/* Required fields callout */}
        <div style={{ margin: '0 28px 16px', background: '#e8f2ec', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>💡</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a2a', marginBottom: '4px' }}>4 required fields help your note get discovered</div>
            <div style={{ fontSize: '11px', color: '#2d6a4a', lineHeight: 1.5 }}>
              <strong>Title</strong> · <strong>Category</strong> · <strong>Presenter</strong> · <strong>Date</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* ── REQUIRED ── */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#ccc', letterSpacing: '1px', paddingBottom: '4px', borderBottom: '1px solid #f0ede8' }}>REQUIRED</div>

          {/* Title */}
          <div>
            <label style={lbl}>Title {required}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Romans 8 — Living in the Spirit" maxLength={120} style={s} autoFocus />
          </div>

          {/* Category */}
          <div>
            <label style={lbl}>Category {required}</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...s, cursor: 'pointer' }}>
              <option value="">Select a category...</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Presenter + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div ref={presenterRef} style={{ position: 'relative' }}>
              <label style={lbl}>Presenter / Speaker {required}</label>
              <input value={presenter} onChange={e => handlePresenterInput(e.target.value)} placeholder="e.g. Pastor Chris" style={s} />
              {presenterSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: '10px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                  {presenterSuggestions.map(sp => (
                    <button key={sp} type="button" onClick={() => { setPresenter(sp); setPresenterSuggestions([]) }}
                      style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#0f0f0f', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f6f5f2' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                    >{sp}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Date {required}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={s} />
            </div>
          </div>

          {/* ── OPTIONAL ── */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#ccc', letterSpacing: '1px', paddingBottom: '4px', borderBottom: '1px solid #f0ede8', marginTop: '4px' }}>OPTIONAL</div>

          {/* Location + YouTube */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Location {optional}</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Church, school, city..." style={s} />
            </div>
            <div>
              <label style={lbl}>YouTube Link {optional}</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  style={{ ...s, paddingRight: youtubeValid ? '80px' : s.padding }}
                />
                {youtubeValid && (
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                    ▶ Linked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Takeaways */}
          <div>
            <label style={lbl}>Key Takeaways {optional}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What were the main points or insights?" rows={3} maxLength={500} style={{ ...s, resize: 'vertical', lineHeight: '1.6' }} />
          </div>

          {/* Tags */}
          <div>
            <label style={lbl}>Tags / Keywords {optional}</label>
            <div style={{ border: '1.5px solid #e0ddd8', borderRadius: '10px', padding: '8px 10px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {tags.map(tag => (
                <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e8f2ec', color: '#1a3a2a', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' }}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2d6a4a', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder={tags.length === 0 ? "Type tag + Enter (e.g. romans, grace...)" : ""}
                style={{ border: 'none', outline: 'none', fontSize: '13px', fontFamily: '"Plus Jakarta Sans", sans-serif', flex: 1, minWidth: '120px', background: 'transparent', color: '#0f0f0f' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Press Enter or comma to add tags · Max 5</p>
          </div>

          {/* Paid toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f6f5f2', borderRadius: '10px', border: '1px solid #e0ddd8' }}>
              <div style={{ fontSize: '14px', color: '#3a3a3a' }}>
                <strong style={{ color: '#0f0f0f' }}>Paid access</strong> — set your own price
              </div>
              <label style={{ position: 'relative', width: '44px', height: '24px', cursor: 'pointer', display: 'inline-block', flexShrink: 0 }}>
                <input type="checkbox" checked={isPaid} onChange={e => { setIsPaid(e.target.checked); if (!e.target.checked) setPrice('') }} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                <div style={{ position: 'absolute', inset: 0, background: isPaid ? '#1a3a2a' : '#ccc9c3', borderRadius: '12px', transition: 'background 0.2s' }} />
                <div style={{ position: 'absolute', top: '3px', left: isPaid ? 'calc(100% - 21px)' : '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </label>
            </div>
            {isPaid && (
              <div style={{ marginTop: '10px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px', pointerEvents: 'none' }}>$</span>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="1" step="0.50" placeholder="5.00" style={{ ...s, paddingLeft: '26px' }} />
                <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>You keep 85% of every sale</p>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fdf0ee', border: '1px solid #f5c6c0', borderRadius: '10px', padding: '10px 14px' }}>
              <p style={{ color: '#c0392b', fontSize: '13px' }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '12px 20px', borderRadius: '10px', background: 'transparent', color: '#1a3a2a', border: '1.5px solid #1a3a2a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#1a3a2a', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, border: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {loading ? 'Sharing...' : isPaid ? `Share for $${price || '—'}` : 'Share for Free'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
