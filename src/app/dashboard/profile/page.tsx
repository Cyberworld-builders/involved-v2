import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileInformationUpdateClient from './profile-information-update-client'
import ProfilePasswordUpdateClient from './profile-password-update-client'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  // Get client name if client_id exists
  let clientName = null
  if (profile?.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', profile.client_id)
      .single()
    clientName = client?.name || null
  }

  // Get industry name if industry_id exists
  let industryName = null
  if (profile?.industry_id) {
    const { data: industry } = await supabase
      .from('industries')
      .select('name')
      .eq('id', profile.industry_id)
      .single()
    industryName = industry?.name || null
  }

  // Derive access level (for display)
  const accessLevel =
    profile?.access_level ||
    (profile?.role === 'admin'
      ? 'super_admin'
      : profile?.role === 'manager' || profile?.role === 'client'
        ? 'client_admin'
        : 'member')

  // Prepare initial profile data for the form
  const initialProfile = {
    name: profile?.name || '',
    username: profile?.username || '',
    email: profile?.email || user.email || '',
    access_level: accessLevel,
    client_id: profile?.client_id || null,
    client_name: clientName,
    industry_id: profile?.industry_id || null,
    industry_name: industryName,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account settings and password</p>
      </div>

      {/* Profile Information Update */}
      <ProfileInformationUpdateClient initialProfile={initialProfile} />

      {/* Password Update */}
      <ProfilePasswordUpdateClient />
    </div>
  )
}
