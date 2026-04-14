import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadForm } from '@/components/upload-form'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/upload')
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 800, color: '#0f0f0f', marginBottom: '6px' }}>Upload Notes</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>Share your knowledge with the Haven community.</p>
      </div>
      <UploadForm userId={user.id} />
    </div>
  )
}
