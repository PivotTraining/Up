import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile-form'
import { NoteGrid } from '@/components/note-grid'
import type { Note } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/profile')
  }

  const [{ data: profile }, { data: notes }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('notes')
      .select('*, profiles(full_name, organization, avatar_url)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
        <p className="text-gray-500 text-sm">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Edit Profile</h2>
            <ProfileForm profile={profile} userId={user.id} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">My Notes ({notes?.length ?? 0})</h2>
          <NoteGrid notes={(notes as Note[]) ?? []} />
        </div>
      </div>
    </div>
  )
}
