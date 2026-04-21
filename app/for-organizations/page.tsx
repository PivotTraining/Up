import Link from 'next/link'

export default function ForOrganizationsPage() {
  return (
    <div style={{ background: '#f6f5f2' }}>

      {/* Hero */}
      <section style={{ background: '#1a3a2a', padding: '72px 24px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '350px', height: '350px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', marginBottom: '20px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Haven for Organizations
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '18px', letterSpacing: '-0.5px', maxWidth: '800px', margin: '0 auto 18px' }}>
          Your organization&apos;s notes.<br />
          <span style={{ color: '#4ade80' }}>Private. Organized. Always accessible.</span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '17px', maxWidth: '560px', margin: '0 auto 32px', lineHeight: 1.75 }}>
          Give your church, school, or conference a dedicated workspace. Members get instant access to every sermon, lecture, and session — with the admin controls and analytics leadership needs.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
          <Link href="/contact?plan=growth" className="btn btn-white btn-lg">
            Start free 14-day trial
          </Link>
          <Link href="/contact?plan=demo" className="btn btn-ghost btn-lg">
            Schedule a demo
          </Link>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {['🔒 Private by default', '🎨 Branded your way', '📊 Built-in analytics', '🚫 No long-term contract'].map(b => (
            <span key={b} style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>{b}</span>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 20px' }}>

        {/* ── Problem / Solution ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center', marginBottom: '80px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>The problem</p>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.2, marginBottom: '16px' }}>Your community&apos;s knowledge is disappearing</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Sermon notes scattered across personal phones — or not taken at all',
                'New members have no access to years of teaching history',
                'There\'s no way to know which content actually resonates',
                'Email threads, Google Drives, and Dropboxes no one can find',
                'Leadership spends hours searching for that one lesson from 2 years ago',
              ].map(p => (
                <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#3a3a3a', lineHeight: 1.6 }}>
                  <span style={{ color: '#c0392b', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✕</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#2d6a4a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>The Haven solution</p>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.2, marginBottom: '16px' }}>One private workspace. Infinite organizational memory.</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Every note posted instantly — visible to every member, forever',
                'New members join and immediately access the entire archive',
                'Real-time analytics: views, downloads, and engagement per note',
                'One organized, branded library that belongs to your org',
                'Search years of content in seconds by speaker, topic, or date',
              ].map(s => (
                <li key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#3a3a3a', lineHeight: 1.6 }}>
                  <span style={{ color: '#2d6a4a', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Feature split: Individual vs Admin ── */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f0f0f', marginBottom: '8px', textAlign: 'center' }}>Built for both sides of your community</h2>
          <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', marginBottom: '36px' }}>Haven serves every member individually — and gives leadership the tools to run the whole thing.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e0ddd8', overflow: 'hidden' }}>
              <div style={{ background: '#e8f2ec', padding: '20px 24px', borderBottom: '1px solid #e0ddd8' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👤</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#1a3a2a' }}>For every member</div>
                <div style={{ fontSize: '13px', color: '#2d6a4a', marginTop: '2px' }}>Individual features & benefits</div>
              </div>
              <ul style={{ listStyle: 'none', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  ['📚', 'Never miss a sermon or lecture again', 'Every note auto-saved to your org library'],
                  ['🔍', 'Find that lesson from 3 years ago', 'Search by speaker, topic, date, or tag'],
                  ['✏️', 'Make notes your own', 'Highlight, annotate, and bookmark personally'],
                  ['📱', 'Works everywhere', 'Phone, tablet (Apple Pencil!), and desktop'],
                  ['🔔', 'Stay connected between sessions', 'Notifications when new notes drop'],
                  ['💬', 'Discuss with your community', 'Comment threads on every note'],
                ].map(([icon, title, sub]) => (
                  <li key={title as string} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f0f0f', marginBottom: '2px' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{sub}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e0ddd8', overflow: 'hidden' }}>
              <div style={{ background: '#fdf8e8', padding: '20px 24px', borderBottom: '1px solid #e0ddd8' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏛️</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#b8860b' }}>For leadership & admins</div>
                <div style={{ fontSize: '13px', color: '#b8860b', marginTop: '2px', opacity: 0.8 }}>Team features & benefits</div>
              </div>
              <ul style={{ listStyle: 'none', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  ['🧠', 'Preserve institutional knowledge', 'Nothing gets lost when staff or teachers move on'],
                  ['📊', 'See what resonates', 'Per-note views, downloads, and engagement analytics'],
                  ['🛡️', 'Control the narrative', 'Approve contributors and manage viewer access by role'],
                  ['📁', 'Organize by series or semester', 'Curated libraries, not just a feed'],
                  ['🎨', 'Brand it as your own', 'Your logo, your colors, your domain'],
                  ['💰', 'Monetize beyond your walls', 'Sell content to non-members while keeping it free internally'],
                  ['🔗', 'Connect your existing systems', 'Sync with your member directory via SSO (Growth+)'],
                  ['📤', 'Your data, always', 'Export everything as PDF or CSV at any time'],
                ].map(([icon, title, sub]) => (
                  <li key={title as string} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f0f0f', marginBottom: '2px' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{sub}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Use cases ── */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f0f0f', marginBottom: '8px', textAlign: 'center' }}>Built for communities that run on shared knowledge</h2>
          <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px' }}>Haven fits wherever people gather to learn together.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {[
              {
                icon: '⛪',
                title: 'Churches & Ministries',
                points: ['Sermon notes live before the service ends', 'Bible study guides organized by series', 'Discipleship resources for every life stage', 'Accessible to members who miss a Sunday'],
                stat: '3.2×', statLabel: 'avg weekly member engagement with organized notes',
              },
              {
                icon: '🎓',
                title: 'Schools & Universities',
                points: ['Lecture notes organized by course & semester', 'Students who contribute earn from their notes', 'Professors share official materials securely', 'Accessible to students who miss a class'],
                stat: '23%', statLabel: 'higher outcomes for students with organized notes',
              },
              {
                icon: '🎤',
                title: 'Conferences & Events',
                points: ['Session notes shared in real time', 'Speaker decks & handouts, all in one place', 'Attendees access everything from any device', 'Build a growing archive across annual events'],
                stat: '8×', statLabel: 'more content accessed when properly organized',
              },
            ].map(uc => (
              <div key={uc.title} style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: '20px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '14px' }}>{uc.icon}</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f0f0f', marginBottom: '14px' }}>{uc.title}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {uc.points.map(p => (
                    <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#3a3a3a', lineHeight: 1.5 }}>
                      <span style={{ color: '#2d6a4a', fontWeight: 700, flexShrink: 0 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: '1px solid #e0ddd8', paddingTop: '16px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#1a3a2a' }}>{uc.stat}</span>
                  <span style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>{uc.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ background: '#1a3a2a', borderRadius: '24px', padding: '56px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', marginBottom: '14px', lineHeight: 1.2 }}>
            Ready to bring your community together?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', marginBottom: '32px', maxWidth: '440px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Start with a 14-day free trial. No credit card. No commitment. See how Haven fits your community.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <Link href="/contact?plan=growth" className="btn btn-white btn-lg">Start free trial</Link>
            <Link href="/contact?plan=demo" className="btn btn-ghost btn-lg">Schedule a demo</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {['No credit card required', '14-day free trial', 'Cancel anytime'].map(t => (
              <span key={t} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>✓ {t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
