import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NoteGrid } from '@/components/note-grid'
import { SearchBar } from '@/components/search-bar'
import { CategoryFilter } from '@/components/category-filter'
import { ComposeButton } from '@/components/compose-button'
import { OrgSection } from '@/components/org-section'
import type { Note } from '@/types'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q, category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('notes')
    .select('*, profiles(full_name, organization, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  if (category) query = query.eq('category', category)

  const [{ data: allNotes }, { data: notes }] = await Promise.all([
    supabase.from('notes').select('id, author_id, views').eq('is_published', true),
    query.limit(50),
  ])

  const noteCount = allNotes?.length ?? 0
  const contributorCount = new Set(allNotes?.map(n => n.author_id)).size
  const totalViews = allNotes?.reduce((sum, n) => sum + (n.views || 0), 0) ?? 0

  return (
    <>
      {/* ── Hero ── */}
      <section style={{ background: '#1a3a2a', padding: '60px 24px 52px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-40px', width: '250px', height: '250px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', marginBottom: '20px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          ● Knowledge is currency
        </div>

        <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.5px' }}>
          Share notes.<br />
          Build <span style={{ color: '#4ade80' }}>community.</span><br />
          Get paid.
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.7 }}>
          Upload church notes, class notes, training guides, and more.
          Reach your community and earn from what you already know.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/upload" className="btn btn-white btn-lg">
            Upload your notes
          </Link>
          <a href="#browse" className="btn btn-ghost btn-lg">
            Browse notes ↓
          </a>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e0ddd8' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#2d6a4a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>How Haven works</p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.2 }}>
              From your notes to your community<br />in three steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {[
              { num: '01', icon: '✍️', title: 'Post your notes', body: 'Share sermon notes, class notes, or training guides with just a title, presenter, and date. Add a file or keep it as a text post — up to you.' },
              { num: '02', icon: '💰', title: 'Set your price', body: 'Share freely with your community or set a price and earn. You keep 85% of every sale, paid out directly to your account.' },
              { num: '03', icon: '🌱', title: 'Grow together', body: 'Your notes reach people searching for faith, academic, or training content. Build your reputation and your audience at the same time.' },
            ].map(step => (
              <div key={step.num} style={{ background: '#f6f5f2', borderRadius: '16px', padding: '28px 24px', position: 'relative', border: '1px solid #e0ddd8' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#ccc9c3', letterSpacing: '1px', marginBottom: '12px' }}>{step.num}</div>
                <div style={{ fontSize: '28px', marginBottom: '14px' }}>{step.icon}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f0f0f', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: '#3a3a3a', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>

          {/* ── Video walkthrough ── */}
          <div style={{ background: '#1a3a2a', borderRadius: '20px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: '280px' }}>
            {/* Left: copy */}
            <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Watch the walkthrough</p>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '14px' }}>
                See how easy it is to share and earn
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '24px' }}>
                From posting your first note to getting paid — watch the full flow in under 2 minutes.
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>2 min · No signup required to watch</span>
              </div>
            </div>

            {/* Right: video placeholder */}
            <div style={{ background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '280px' }}>
              {/* grid pattern */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <div
                  style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 12px', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '26px', marginLeft: '4px' }}>▶</span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3px' }}>Demo coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OrgSection />

      {/* ── Browse + Compose ── */}
      <div id="browse" style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 20px' }}>

        {/* Compose bar */}
        <div style={{ marginBottom: '24px' }}>
          <ComposeButton />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { num: noteCount, label: 'Notes Published' },
            { num: contributorCount, label: 'Contributors' },
            { num: totalViews, label: 'Total Views' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: '14px', padding: '16px 20px' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f0f0f', marginBottom: '2px', lineHeight: 1 }}>{stat.num}</div>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Suspense fallback={<div style={{ height: '42px', background: '#eee', borderRadius: '10px' }} />}>
              <SearchBar defaultValue={q} />
            </Suspense>
          </div>
          <Suspense fallback={<div style={{ height: '42px', width: '320px', background: '#eee', borderRadius: '10px' }} />}>
            <CategoryFilter selected={category} />
          </Suspense>
        </div>

        <NoteGrid notes={(notes as Note[]) ?? []} />
      </div>
    </>
  )
}
