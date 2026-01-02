import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GroupPageProps {
  params: Promise<{
    id: string
  }>
}

interface GroupMember {
  id: string
  profile_id: string
  role: string | null
  profiles?: {
    id: string
    name: string
    email: string
    username?: string
  }
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GroupPage({ params }: GroupPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC' })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch group with related data
  const { data: group, error } = await supabase
    .from('groups')
    .select(`
      *,
      clients!groups_client_id_fkey(id, name),
      group_members(
        id,
        profile_id,
        role,
        profiles(id, name, email, username)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !group) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Not Found</h1>
        <p className="text-gray-600 mb-4">The group you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/clients">
          <Button>Back to Clients</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-gray-600">Group details and members</p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/dashboard/clients/${group.client_id}`}>
              <Button variant="outline">View Client</Button>
            </Link>
          </div>
        </div>

        {/* Group Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{group.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{group.description || 'No description provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Client</label>
                <p className="text-gray-900">{group.clients?.name || 'Client information unavailable'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Members</label>
                <p className="text-gray-900">{group.group_members?.length || 0} member(s)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{formatDate(group.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">{formatDate(group.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
            </CardHeader>
            <CardContent>
              {group.group_members && group.group_members.length > 0 ? (
                <div className="space-y-3">
                  {(group.group_members as GroupMember[]).map((member) => (
                    <div key={member.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{member.profiles?.name || 'Name not available'}</p>
                          <p className="text-sm text-gray-500">{member.profiles?.email || ''}</p>
                          {member.role && (
                            <p className="text-xs text-gray-400 mt-1">Role: {member.role}</p>
                          )}
                        </div>
                        <Link href={`/dashboard/users/${member.profile_id}`}>
                          <Button variant="outline" size="sm">View Profile</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No members in this group yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
