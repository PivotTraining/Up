'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const ORG_TYPES = ['Church / Ministry', 'School / University', 'Conference / Event', 'Other']
const TEAM_SIZES = ['1–25 members', '26–100 members', '101–500 members', '500+ members']
const PLANS = ['starter', 'growth', 'enterprise', 'demo']

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #e0ddd8', borderRadius: '10px',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  fontSize: '14px', color: '#0f0f0f', background: '#fff', outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700,
  color: '#3a3a3a', marginBottom: '6px',
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

function ContactForm() {
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') ?? 'growth'
  const isDemo = planParam === 'demo'

  const [form, setForm] = useState({
    name: '', email: '', orgName: '', orgType: '',
    teamSize: '', plan: PLANS.includes(planParam) ? planParam : 'growth',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulate submission (wire to email/CRM in production)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f0f0f', marginBottom: '10px' }}>You&apos;re on the list!</h2>
        <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.7, marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
          We&apos;ll be in touch within 24 hours to get your workspace set up. Check your inbox.
        </p>
        <Link href="/" style={{ display: 'inline-flex', padding: '12px 24px', background: '#1a3a2a', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
          Back to Haven
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={lbl}>Your Name *</label>
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Pastor Chris" style={inp} />
        </div>
        <div>
          <label style={lbl}>Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="chris@church.org" style={inp} />
        </div>
      </div>

      <div>
        <label style={lbl}>Organization Name *</label>
        <input name="orgName" value={form.orgName} onChange={handleChange} required placeholder="Lakewood Church" style={inp} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={lbl}>Organization Type *</label>
          <select name="orgType" value={form.orgType} onChange={handleChange} required style={{ ...inp, cursor: 'pointer' }}>
            <option value="">Select type...</option>
            {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Team Size *</label>
          <select name="teamSize" value={form.teamSize} onChange={handleChange} required style={{ ...inp, cursor: 'pointer' }}>
            <option value="">Select size...</option>
            {TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={lbl}>Interested Plan</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: 'starter', label: 'Starter — $49/mo' },
            { value: 'growth', label: 'Growth — $149/mo' },
            { value: 'enterprise', label: 'Enterprise — Custom' },
            { value: 'demo', label: 'Just show me a demo' },
          ].map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, plan: p.value }))}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif',
                background: form.plan === p.value ? '#1a3a2a' : '#fff',
                color: form.plan === p.value ? '#fff' : '#3a3a3a',
                border: form.plan === p.value ? '1.5px solid #1a3a2a' : '1.5px solid #e0ddd8',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={lbl}>Anything else we should know? {isDemo && <span style={{ fontWeight: 400, color: '#aaa', textTransform: 'none' }}>(What would you like to see in the demo?)</span>}</label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={3}
          placeholder={isDemo ? 'e.g. We have 200 members, weekly sermons, some small groups...' : 'Any questions or context about your organization...'}
          style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ width: '100%', padding: '13px', borderRadius: '10px', background: '#1a3a2a', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: '"Plus Jakarta Sans", sans-serif', marginTop: '4px' }}
      >
        {loading ? 'Sending...' : isDemo ? 'Request a demo →' : 'Get started →'}
      </button>
    </form>
  )
}

export default function ContactPage() {
  return (
    <div style={{ background: '#f6f5f2', minHeight: '100vh' }}>
      <div style={{ background: '#1a3a2a', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Get started</p>
        <h1 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: '10px', lineHeight: 1.15 }}>
          Let&apos;s set up your workspace
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', maxWidth: '420px', margin: '0 auto' }}>
          14-day free trial · No credit card · We&apos;ll reach out within 24 hours
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 20px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e0ddd8', padding: '36px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <Suspense fallback={<div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading...</div>}>
            <ContactForm />
          </Suspense>
        </div>

        {/* Trust signals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '24px' }}>
          {[
            { icon: '🔒', text: 'Private & secure by default' },
            { icon: '🚫', text: 'No long-term contracts' },
            { icon: '📤', text: 'Export your data anytime' },
          ].map(t => (
            <div key={t.text} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0ddd8', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{t.icon}</div>
              <div style={{ fontSize: '12px', color: '#888', fontWeight: 500, lineHeight: 1.4 }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
