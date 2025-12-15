import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RESOURCE_POSTS } from '@/lib/resources/resources'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResourcesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const posts = [...RESOURCE_POSTS].sort((a, b) =>
    (b.publishedAt || '').localeCompare(a.publishedAt || '')
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
            <p className="text-gray-600">Short walkthrough videos and how-to guides.</p>
          </div>
          <Link href="/dashboard/resources/upload">
            <Button variant="outline">Upload video</Button>
          </Link>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No resources yet</CardTitle>
              <CardDescription>
                Upload a short clip, then add a post entry in <code>src/lib/resources/resources.ts</code>.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <Link key={post.slug} href={`/dashboard/resources/${post.slug}`} className="block">
                <Card className="h-full hover:border-indigo-300 hover:bg-gray-50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription>{post.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {post.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.publishedAt ? (
                      <span className="ml-auto text-xs text-gray-500">Published {post.publishedAt}</span>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


