import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface IndustryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch industry from database
  const { data: industry, error } = await supabase
    .from('industries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !industry) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Industry Not Found</h1>
          <p className="text-gray-600 mb-4">The industry you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard/industries">
            <Button>Back to Industries</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{industry.name}</h1>
            <p className="text-gray-600">Industry details and information</p>
          </div>
          <div className="flex space-x-2">
            <Link href={`/dashboard/industries/${industry.id}/edit`}>
              <Button variant="outline">Edit Industry</Button>
            </Link>
            <Link href="/dashboard/industries">
              <Button variant="outline">Back to Industries</Button>
            </Link>
          </div>
        </div>

        {/* Industry Details */}
        <Card>
          <CardHeader>
            <CardTitle>Industry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{industry.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">{new Date(industry.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-gray-900">{new Date(industry.updated_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
