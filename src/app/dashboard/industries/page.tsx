import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import IndustriesListClient from './industries-list-client'

export default async function IndustriesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch industries from database
  const { data: industries, error } = await supabase
    .from('industries')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching industries:', error)
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Industries</h1>
            <p className="text-gray-600">Manage industry categories for user classification.</p>
          </div>
          <Link href="/dashboard/industries/create">
            <Button>
              <span className="mr-2">+</span>
              Add Industry
            </Button>
          </Link>
        </div>

        {/* Supabase Setup Notice */}
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Supabase Not Configured
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    To save industries to the database, please set up Supabase by following the instructions in{' '}
                    <code className="bg-blue-100 px-1 rounded">SUPABASE_SETUP.md</code>.
                  </p>
                  <p className="mt-1">
                    The form will work in demo mode until Supabase is configured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Industries
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Industries List */}
        <Card>
          <CardHeader>
            <CardTitle>All Industries</CardTitle>
            <CardDescription>
              Manage industry categories for user classification
              {industries && industries.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({industries.length} industr{industries.length !== 1 ? 'ies' : 'y'})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IndustriesListClient industries={industries || []} />
          </CardContent>
        </Card>
      </div>
  )
}
