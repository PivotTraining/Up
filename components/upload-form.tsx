'use client'

import { useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileDropZone } from '@/components/file-drop-zone'
import { CATEGORIES } from '@/lib/utils'

const POPULAR_SPEAKERS = [
  'T.D. Jakes', 'John Gray', 'Steven Furtick', 'Priscilla Shirer',
  'Craig Groeschel', 'Andy Stanley', 'Christine Caine', 'Beth Moore',
  'Francis Chan', 'Rick Warren', 'Joyce Meyer', 'Tony Evans',
]

const inp: React.CSSProperties = {
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

interface UploadFormProps {
  userId: string
}

export function UploadForm({ userId: _userId }: UploadFormProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [presenter, setPresenter] = useState('')
  const [presenterSuggestions, setPresenterSuggestions] = useState<string[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPaid, setIsPaid] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const youtubeValid = youtubeUrl && (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))

  function handlePresenterInput(val: string) {
    setPresenter(val)
    setPresenterSuggestions(
      val.length > 1
        ? POPULAR_SPEAKERS.filter(sp => sp.toLowerCase().includes(val.toLowerCase())).slice(0, 4)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (!category) { setError('Category is required.'); return }
    if (!presenter.trim()) { setError('Presenter is required.'); return }
    if (!date) { setError('Date is required.'); return }

    setLoading(true)
    setError(null)

    const priceCents = isPaid && priceInput ? Math.round(parseFloat(priceInput) * 100) : 0

    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', category)
    formData.append('presenter', presenter)
    formData.append('date', date)
    formData.append('location', location)
    formData.append('youtubeUrl', youtubeUrl)
    formData.append('tags', JSON.stringify(tags))
    formData.append('price', String(priceCents))

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Upload failed')
      setLoading(false)
      return
    }

    router.push(`/notes/${data.note.id}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e0ddd8', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Required callout */}
      <div style={{ background: '#e8f2ec', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>💡</span>
        <div style={{ fontSize: '12px', color: '#1a3a2a', lineHeight: 1.5 }}>
          <strong>Required:</strong> Title · Category · Presenter · Date
        </div>
      </div>

      {/* Section: Required */}
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#ccc', letterSpacing: '1px', borderBottom: '1px solid #f0ede8', paddingBottom: '4px' }}>REQUIRED</div>

      {/* Title */}
      <div>
        <label style={lbl}>Title <span style={{ color: '#c0392b' }}>*</span></label>
        <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} placeholder="e.g. Romans Series — Week 3: Grace & Identity" style={inp} />
      </div>

      {/* Category */}
      <div>
        <label style={lbl}>Category <span style={{ color: '#c0392b' }}>*</span></label>
        <select value={category} onChange={e => setCategory(e.target.value)} required style={{ ...inp, cursor: 'pointer' }}>
          <option value="">Select category...</option>
          {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
        </select>
      </div>

      {/* Presenter + Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <label style={lbl}>Presenter / Speaker <span style={{ color: '#c0392b' }}>*</span></label>
          <input value={presenter} onChange={e => handlePresenterInput(e.target.value)} placeholder="e.g. Pastor Chris" style={inp} />
          {presenterSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: '10px', zIndex: 50, marginTop: '4px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
              {presenterSuggestions.map(sp => (
                <button key={sp} type="button" onClick={() => { setPresenter(sp); setPresenterSuggestions([]) }}
                  style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#0f0f0f' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f6f5f2' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >{sp}</button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={lbl}>Date <span style={{ color: '#c0392b' }}>*</span></label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
        </div>
      </div>

      {/* Section: Optional */}
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#ccc', letterSpacing: '1px', borderBottom: '1px solid #f0ede8', paddingBottom: '4px' }}>OPTIONAL</div>

      {/* File */}
      <div>
        <label style={lbl}>Attach File <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 400, textTransform: 'none' }}>(PDF, Word, image — up to 20MB)</span></label>
        <FileDropZone onFileSelect={setFile} selectedFile={file} />
      </div>

      {/* Location + YouTube */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={lbl}>Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Church, school, city..." style={inp} />
        </div>
        <div>
          <label style={lbl}>YouTube Link</label>
          <div style={{ position: 'relative' }}>
            <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..." style={{ ...inp, paddingRight: youtubeValid ? '80px' : inp.padding }} />
            {youtubeValid && (
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                ▶ Linked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={lbl}>Key Takeaways / Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={500} placeholder="What's in these notes? Who would benefit?" style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }} />
      </div>

      {/* Tags */}
      <div>
        <label style={lbl}>Tags / Keywords</label>
        <div style={{ border: '1.5px solid #e0ddd8', borderRadius: '10px', padding: '8px 10px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {tags.map(tag => (
            <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e8f2ec', color: '#1a3a2a', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' }}>
              #{tag}
              <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2d6a4a', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder={tags.length === 0 ? "Type + Enter to add tags..." : ""} style={{ border: 'none', outline: 'none', fontSize: '13px', fontFamily: '"Plus Jakarta Sans", sans-serif', flex: 1, minWidth: '120px', background: 'transparent', color: '#0f0f0f' }} />
        </div>
        <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Press Enter or comma to add · Max 5 tags</p>
      </div>

      {/* Paid toggle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f6f5f2', borderRadius: '10px', border: '1px solid #e0ddd8' }}>
          <div style={{ fontSize: '14px', color: '#3a3a3a' }}>
            <strong style={{ color: '#0f0f0f' }}>Paid access</strong> — charge for these notes
          </div>
          <label style={{ position: 'relative', width: '44px', height: '24px', cursor: 'pointer', display: 'inline-block', flexShrink: 0 }}>
            <input type="checkbox" checked={isPaid} onChange={e => { setIsPaid(e.target.checked); if (!e.target.checked) setPriceInput('') }} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
            <div style={{ position: 'absolute', inset: 0, background: isPaid ? '#1a3a2a' : '#ccc9c3', borderRadius: '12px', transition: 'background 0.2s' }} />
            <div style={{ position: 'absolute', top: '3px', left: isPaid ? 'calc(100% - 21px)' : '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </label>
        </div>
        {isPaid && (
          <div style={{ marginTop: '10px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px', pointerEvents: 'none' }}>$</span>
            <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)} min="1" step="0.50" placeholder="5.00" style={{ ...inp, paddingLeft: '26px' }} />
            <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>You keep 85% of every sale</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fdf0ee', border: '1px solid #f5c6c0', borderRadius: '10px', padding: '12px 14px' }}>
          <p style={{ color: '#c0392b', fontSize: '13px' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={() => router.back()} style={{ padding: '12px 20px', borderRadius: '10px', background: 'transparent', color: '#1a3a2a', border: '1.5px solid #1a3a2a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#1a3a2a', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, border: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          {loading ? 'Publishing...' : 'Publish Notes'}
        </button>
      </div>
    </form>
  )
}
