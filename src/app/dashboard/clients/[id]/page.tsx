import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface ClientPageProps {
  params: {
    id: string
  }
}

export default async function ClientPage({ params }: ClientPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch client from database
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
          <p className="text-gray-600 mb-4">The client you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard/clients">
            <Button>Back to Clients</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600">Client details and settings</p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/dashboard/users/create?client_id=${client.id}`}>
              <Button>Add Users</Button>
            </Link>
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Button variant="outline">Edit Client</Button>
            </Link>
            <Link href="/dashboard/clients">
              <Button variant="outline">Back to Clients</Button>
            </Link>
          </div>
        </div>

        {/* Client Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Client organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg text-gray-900">{client.name}</p>
              </div>
              {client.address && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-gray-900">{client.address}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(client.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">{new Date(client.updated_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Visual identity and colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.logo && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Logo</label>
                  <div className="mt-2">
                    <Image
                      src={client.logo}
                      alt={`${client.name} logo`}
                      width={64}
                      height={64}
                      className="h-16 w-auto rounded"
                    />
                  </div>
                </div>
              )}
              {client.background && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Background Image</label>
                  <div className="mt-2">
                    <Image
                      src={client.background}
                      alt={`${client.name} background`}
                      width={64}
                      height={64}
                      className="h-16 w-auto rounded"
                    />
                  </div>
                </div>
              )}
              {client.primary_color && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Primary Color</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: client.primary_color }}
                    ></div>
                    <span className="text-gray-900">{client.primary_color}</span>
                  </div>
                </div>
              )}
              {client.accent_color && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Accent Color</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: client.accent_color }}
                    ></div>
                    <span className="text-gray-900">{client.accent_color}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Client Settings</CardTitle>
            <CardDescription>Configuration and requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Require Profile</label>
                <p className="text-gray-900 mt-1">
                  {client.require_profile ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Users must complete their profile on first login
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Show Research Questions</label>
                <p className="text-gray-900 mt-1">
                  {client.require_research ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Display optional research questions to users
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Whitelabel</label>
                <p className="text-gray-900 mt-1">
                  {client.whitelabel ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Assessments are white-labeled with client branding
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
