import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import UploadResourceVideoClient from './upload-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UploadResourceVideoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level, role')
    .eq('auth_user_id', user.id)
    .single()

  const accessLevel =
    profile?.access_level ||
    (profile?.role === 'admin'
      ? 'super_admin'
      : (profile?.role === 'manager' || profile?.role === 'client')
        ? 'client_admin'
        : 'member')

  if (accessLevel !== 'super_admin') {
    redirect('/dashboard/resources')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload resource video</h1>
            <p className="text-gray-600">Upload a clip to Supabase Storage and paste the path into a post.</p>
          </div>
          <Link href="/dashboard/resources">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Video upload</CardTitle>
            <CardDescription>
              Files upload to the private <code>resources-videos</code> bucket. The Resources pages stream videos using signed URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadResourceVideoClient />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


