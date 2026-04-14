import Link from 'next/link'

export function OrgSection() {
  return (
    <section style={{ background: '#fff', borderTop: '1px solid #e0ddd8', borderBottom: '1px solid #e0ddd8' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 20px' }}>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'inline-block', background: '#fdf8e8', color: '#b8860b', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
              For Organizations
            </span>
            <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.2, marginBottom: '8px' }}>
              Keep your community&apos;s knowledge<br />private, organized, and always on.
            </h2>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.7, maxWidth: '480px' }}>
              Churches, schools, and conferences get a private branded workspace. Members access every sermon, lecture, and session — leadership gets analytics and full control.
            </p>
          </div>
          <Link
            href="/for-organizations"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '11px 20px', background: '#1a3a2a', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Learn more →
          </Link>
        </div>

        {/* 3 use-case cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {[
            {
              icon: '⛪',
              title: 'Churches & Ministries',
              body: 'Every sermon note live and searchable — before members leave the parking lot. Organized by series, searchable across years.',
              tag: 'faith',
            },
            {
              icon: '🎓',
              title: 'Schools & Universities',
              body: 'Lecture notes organized by course and semester. Students contribute and earn; professors share official materials securely.',
              tag: 'academic',
            },
            {
              icon: '🎤',
              title: 'Conferences & Events',
              body: 'Session notes and speaker decks shared instantly with every attendee. Build a growing archive across annual events.',
              tag: 'training',
            },
          ].map(uc => (
            <div key={uc.title} style={{ background: '#f6f5f2', border: '1px solid #e0ddd8', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '26px', marginBottom: '10px' }}>{uc.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f0f0f', marginBottom: '6px' }}>{uc.title}</div>
              <p style={{ fontSize: '13px', color: '#3a3a3a', lineHeight: 1.65 }}>{uc.body}</p>
            </div>
          ))}
        </div>

        {/* Bottom strip: individual + team benefits */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: '#e8f2ec', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#1a3a2a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>👤 For every member</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {['Never miss a sermon or lecture again', 'Search years of content in seconds', 'Highlight, annotate & bookmark personally', 'Works on phone, tablet (Apple Pencil!) & desktop'].map(b => (
                <li key={b} style={{ fontSize: '13px', color: '#1a3a2a', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, fontWeight: 700 }}>✓</span>{b}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: '#fdf8e8', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#b8860b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>🏛️ For leadership & admins</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {['Stop losing institutional knowledge', 'See what content resonates — per-note analytics', 'Control who posts and who views', 'Brand the workspace with your logo & colors'].map(b => (
                <li key={b} style={{ fontSize: '13px', color: '#b8860b', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, fontWeight: 700 }}>✓</span>{b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pricing teaser */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f6f5f2', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e0ddd8', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '14px', color: '#3a3a3a' }}>
            Starting at <strong style={{ color: '#0f0f0f' }}>$49/month</strong> for up to 50 members · 14-day free trial · No credit card
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/pricing" style={{ fontSize: '13px', fontWeight: 600, color: '#1a3a2a', padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #1a3a2a', textDecoration: 'none' }}>
              See pricing
            </Link>
            <Link href="/contact?plan=demo" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', padding: '8px 16px', borderRadius: '8px', background: '#1a3a2a', textDecoration: 'none' }}>
              Get a demo
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
