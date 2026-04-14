'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'

export function Nav() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabaseRef = useRef<ReturnType<typeof import('@/lib/supabase/client').createClient> | null>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabaseRef.current = supabase
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
        setLoading(false)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    })
  }, [])

  async function handleSignOut() {
    if (!supabaseRef.current) return
    await supabaseRef.current.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Browse' },
    { href: '/for-organizations', label: 'For Organizations' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <nav style={{ background: '#1a3a2a', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <Link href="/" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
          Haven
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: pathname === link.href ? '#fff' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                background: pathname === link.href ? 'rgba(255,255,255,0.1)' : 'transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!loading && (
          <>
            {user ? (
              <>
                <Link href="/upload" className="btn btn-white btn-sm">+ Share Notes</Link>
                <Link href="/profile" className="btn btn-ghost btn-sm">Profile</Link>
                <button onClick={handleSignOut} className="btn btn-ghost btn-sm">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link href="/for-organizations" className="btn btn-ghost btn-sm" style={{ display: 'none' }}>For Orgs</Link>
                <Link href="/upload" className="btn btn-white btn-sm">+ Share Notes</Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  )
}
