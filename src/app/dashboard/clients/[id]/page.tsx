import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ClientTabs from './client-tabs'

interface ClientPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function ClientPage({ params, searchParams }: ClientPageProps) {
  const { id } = await params
  const { tab } = await searchParams
  
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
    .eq('id', id)
    .single()

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
        <p className="text-gray-600 mb-4">The client you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/clients">
          <Button>Back to Clients</Button>
        </Link>
      </div>
    )
  }

  const activeTab = tab || 'details'

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600">Client details and settings</p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Button variant="outline">Edit Client</Button>
            </Link>
            <Link href="/dashboard/clients">
              <Button variant="outline">Back to Clients</Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <ClientTabs clientId={client.id} activeTab={activeTab} client={client} />
      </div>
  )
}
