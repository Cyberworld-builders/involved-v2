import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RESOURCE_POSTS } from '@/lib/resources/resources'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResourcesPage() {
  // Note: Auth check is done in layout.tsx, so we can skip it here
  // This eliminates a duplicate getUserProfile() call, improving performance
  
  const allPosts = [...RESOURCE_POSTS].sort((a, b) =>
    (b.publishedAt || '').localeCompare(a.publishedAt || '')
  )

  // Separate posts by phase
  const phase1Posts = allPosts.filter(post => 
    post.tags?.some(tag => tag.toLowerCase().includes('phase 1')) || 
    !post.tags?.some(tag => tag.toLowerCase().includes('phase 2'))
  )
  
  const phase2Posts = allPosts.filter(post => 
    post.tags?.some(tag => tag.toLowerCase().includes('phase 2'))
  )

  return (
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

        {allPosts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No resources yet</CardTitle>
              <CardDescription>
                Upload a short clip, then add a post entry in <code>src/lib/resources/resources.ts</code>.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Phase 2 Section */}
            {phase2Posts.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h2 className="text-xl font-semibold text-gray-900">Phase 2: Assessment Management & Assignment</h2>
                  <p className="text-sm text-gray-600 mt-1">Assessment creation, assignment, completion, and management features.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {phase2Posts.map((post) => (
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
              </div>
            )}

            {/* Phase 1 Section */}
            {phase1Posts.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h2 className="text-xl font-semibold text-gray-900">Phase 1: Foundation & Setup</h2>
                  <p className="text-sm text-gray-600 mt-1">User onboarding, assessments, benchmarks, clients, and industries.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {phase1Posts.map((post) => (
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
              </div>
            )}
          </div>
        )}
      </div>
  )
}


