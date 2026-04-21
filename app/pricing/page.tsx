import Link from 'next/link'

const CHECK = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="8" cy="8" r="8" fill="#e8f2ec" />
    <path d="M5 8l2 2 4-4" stroke="#1a3a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const DASH = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="8" cy="8" r="8" fill="#f0ede8" />
    <path d="M5 8h6" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

function Feature({ included, children }: { included: boolean; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: included ? '#3a3a3a' : '#aaa' }}>
      {included ? <CHECK /> : <DASH />}
      <span>{children}</span>
    </li>
  )
}

export default function PricingPage() {
  return (
    <div style={{ background: '#f6f5f2', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: '#1a3a2a', padding: '56px 24px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Pricing</p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '14px', letterSpacing: '-0.5px' }}>
          Simple pricing for every community
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '16px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
          Start free and earn from your notes. Or give your organization a private, branded workspace built for growth.
        </p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 20px' }}>

        {/* ── Individual Plans ── */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ display: 'inline-block', background: '#e8f2ec', color: '#1a3a2a', fontSize: '11px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>For Individuals</span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f0f0f', marginBottom: '8px' }}>Share your knowledge. Earn from it.</h2>
            <p style={{ fontSize: '15px', color: '#888', maxWidth: '480px', margin: '0 auto' }}>Post notes publicly, build your audience, and get paid — or join your organization&apos;s private workspace.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxWidth: '640px', margin: '0 auto' }}>
            {/* Free */}
            <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: '20px', padding: '28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Free</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1 }}>$0</span>
                  <span style={{ fontSize: '14px', color: '#888' }}>/month</span>
                </div>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>Forever free. No card needed.</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <Feature included>Post notes to the public marketplace</Feature>
                <Feature included>Earn 85% on every paid download</Feature>
                <Feature included>Basic search & discovery</Feature>
                <Feature included>In-app note editor</Feature>
                <Feature included>Tags, presenter, location fields</Feature>
                <Feature included={false}>Advanced analytics</Feature>
                <Feature included={false}>Priority search placement</Feature>
                <Feature included={false}>Bulk upload</Feature>
              </ul>
              <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', border: '1.5px solid #1a3a2a', color: '#1a3a2a', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Get started free
              </Link>
            </div>

            {/* Creator Pro */}
            <div style={{ background: '#1a3a2a', border: '1px solid #1a3a2a', borderRadius: '20px', padding: '28px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#4ade80', color: '#1a3a2a', fontSize: '11px', fontWeight: 800, padding: '4px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                Most popular
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Creator Pro</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>$9</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>/month</span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginTop: '6px' }}>Billed monthly. Cancel anytime.</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {[
                  'Everything in Free',
                  'Advanced analytics dashboard',
                  'Priority placement in search',
                  'Custom creator profile page',
                  'Bulk note upload',
                  'Early access to new features',
                  'Creator badge on all notes',
                  'Monthly payout reports',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="8" cy="8" r="8" fill="rgba(74,222,128,0.2)" />
                      <path d="M5 8l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', borderRadius: '10px', background: '#fff', color: '#1a3a2a', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                Start 14-day free trial
              </button>
            </div>
          </div>
        </div>

        {/* ── Organization Plans ── */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ display: 'inline-block', background: '#fdf8e8', color: '#b8860b', fontSize: '11px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>For Organizations</span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f0f0f', marginBottom: '8px' }}>Private workspaces for churches, schools & conferences</h2>
            <p style={{ fontSize: '15px', color: '#888', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
              Your community&apos;s notes stay in-house. Members get a branded, searchable library. Leadership gets the analytics and controls they need.
            </p>
          </div>

          {/* Org benefits strips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e0ddd8', padding: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#2d6a4a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>👤 For Your Members</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Every sermon & lecture, organized forever',
                  'Search years of content in seconds',
                  'Highlight, annotate, and bookmark personally',
                  'Access on any device — phone, tablet, desktop',
                  'Get notified when new notes drop',
                  'Comment and discuss within your community',
                ].map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#3a3a3a' }}>
                    <CHECK /><span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e0ddd8', padding: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#b8860b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>🏛️ For Leadership & Admins</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Stop losing institutional knowledge',
                  'See what content resonates — per-note analytics',
                  'Control who posts and who views',
                  'Organize by series, semester, or event',
                  'Brand the workspace with your logo & colors',
                  'Optionally monetize content for non-members',
                  'Sync with your member directory (SSO)',
                  'Export and backup — your data, always yours',
                ].map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#3a3a3a' }}>
                    <CHECK /><span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Org pricing cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            {/* Starter */}
            <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: '20px', padding: '28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Starter</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1 }}>$49</span>
                  <span style={{ fontSize: '14px', color: '#888' }}>/month</span>
                </div>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>Up to 50 members</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <Feature included>Private org workspace</Feature>
                <Feature included>Member management & invites</Feature>
                <Feature included>Admin controls & roles</Feature>
                <Feature included>Basic analytics</Feature>
                <Feature included>5 GB storage</Feature>
                <Feature included>Email support</Feature>
                <Feature included={false}>Custom branding</Feature>
                <Feature included={false}>Series/event organization</Feature>
                <Feature included={false}>Advanced analytics</Feature>
                <Feature included={false}>SSO / directory sync</Feature>
              </ul>
              <Link href="/contact?plan=starter" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', border: '1.5px solid #1a3a2a', color: '#1a3a2a', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Start 14-day free trial
              </Link>
            </div>

            {/* Growth */}
            <div style={{ background: '#fff', border: '2px solid #1a3a2a', borderRadius: '20px', padding: '28px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#1a3a2a', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 14px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                Most popular
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a2a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Growth</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1 }}>$149</span>
                  <span style={{ fontSize: '14px', color: '#888' }}>/month</span>
                </div>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>Up to 250 members</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <Feature included>Everything in Starter</Feature>
                <Feature included>Custom branding — logo & colors</Feature>
                <Feature included>Series & event organization</Feature>
                <Feature included>Advanced analytics dashboard</Feature>
                <Feature included>25 GB storage</Feature>
                <Feature included>Priority email + chat support</Feature>
                <Feature included>API access</Feature>
                <Feature included>Content monetization controls</Feature>
                <Feature included={false}>SSO / directory sync</Feature>
                <Feature included={false}>Dedicated account manager</Feature>
              </ul>
              <Link href="/contact?plan=growth" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', background: '#1a3a2a', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Start 14-day free trial
              </Link>
            </div>

            {/* Enterprise */}
            <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: '20px', padding: '28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Enterprise</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f0f0f', lineHeight: 1.2 }}>Custom</span>
                </div>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>Unlimited members · Custom SLA</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                <Feature included>Everything in Growth</Feature>
                <Feature included>Unlimited members</Feature>
                <Feature included>White-label option</Feature>
                <Feature included>SSO / member directory sync</Feature>
                <Feature included>Dedicated account manager</Feature>
                <Feature included>Custom integrations</Feature>
                <Feature included>Uptime SLA guarantee</Feature>
                <Feature included>Unlimited storage</Feature>
                <Feature included>Custom contract & billing</Feature>
                <Feature included>On-site onboarding available</Feature>
              </ul>
              <Link href="/contact?plan=enterprise" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', border: '1.5px solid #1a3a2a', color: '#1a3a2a', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Contact sales
              </Link>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#888' }}>
            All organization plans include a 14-day free trial · No credit card required · Cancel anytime
          </p>
        </div>

        {/* ── Who it's for ── */}
        <div style={{ marginTop: '64px', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f0f0f', marginBottom: '24px', textAlign: 'center' }}>Built for communities that run on shared knowledge</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {[
              { icon: '🏛️', type: 'Churches & Ministries', body: 'Sermon notes, Bible study guides, and discipleship resources — all in one place for your congregation. Members access Sunday\'s notes before leaving the parking lot.', stat: '3.2× / week', statLabel: 'avg member engagement' },
              { icon: '🎓', type: 'Schools & Universities', body: 'Course notes, lecture recordings, and study guides organized by semester and course. Students who contribute notes earn; professors share official materials securely.', stat: '23% higher', statLabel: 'outcomes with organized notes' },
              { icon: '📋', type: 'Conferences & Events', body: 'Session notes, speaker decks, and workshop handouts shared instantly with attendees. Build your library across years of events for a growing archive.', stat: '8× more', statLabel: 'content accessed when organized' },
            ].map(uc => (
              <div key={uc.type} style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{uc.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f0f0f', marginBottom: '8px' }}>{uc.type}</div>
                <p style={{ fontSize: '13px', color: '#3a3a3a', lineHeight: 1.7, marginBottom: '16px' }}>{uc.body}</p>
                <div style={{ borderTop: '1px solid #e0ddd8', paddingTop: '14px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#1a3a2a' }}>{uc.stat}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>{uc.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ background: '#1a3a2a', borderRadius: '24px', padding: '48px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.2 }}>
            Ready to bring your community together?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', marginBottom: '28px', maxWidth: '440px', margin: '0 auto 28px', lineHeight: 1.7 }}>
            Start with a free workspace. No credit card. No commitment. See how Haven fits your community in 14 days.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact?plan=growth" className="btn btn-white btn-lg">
              Start free trial
            </Link>
            <Link href="/contact?plan=demo" className="btn btn-ghost btn-lg">
              Schedule a demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
