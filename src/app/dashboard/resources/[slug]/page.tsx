import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getResourcePostBySlug } from '@/lib/resources/resources'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getResourcePostBySlug(slug)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
            <Link href="/dashboard/resources">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
            Resource not found.
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(post.video.bucket)
    .createSignedUrl(post.video.path, 60 * 60) // 1 hour

  const signedUrl = signed?.signedUrl || null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/dashboard/resources" className="text-gray-500 hover:text-gray-700">
                Resources
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{post.title}</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
            <p className="text-gray-600">{post.description}</p>
          </div>
          <Link href="/dashboard/resources">
            <Button variant="outline">Back to Resources</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Video</CardTitle>
            <CardDescription>Streaming from Supabase Storage.</CardDescription>
          </CardHeader>
          <CardContent>
            {!signedUrl ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
                Failed to load video URL.
                {signedError?.message ? <div className="mt-1 text-sm">{signedError.message}</div> : null}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
                <video
                  controls
                  preload="metadata"
                  className="w-full"
                  src={signedUrl}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

