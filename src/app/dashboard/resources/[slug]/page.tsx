import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getResourcePostBySlug } from '@/lib/resources/resources'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  if (signedError) {
    console.error('Failed to create signed URL:', {
      bucket: post.video.bucket,
      path: post.video.path,
      error: signedError.message,
    })
  }

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
                <div className="font-semibold">Failed to load video URL.</div>
                {signedError?.message ? (
                  <div className="mt-2 text-sm">
                    <div className="font-medium">Error:</div>
                    <div>{signedError.message}</div>
                  </div>
                ) : null}
                <div className="mt-2 text-xs text-red-600">
                  <div>Bucket: {post.video.bucket}</div>
                  <div>Path: {post.video.path}</div>
                </div>
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

        {post.bodyMarkdown ? (
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>Step-by-step guide you can follow while recording.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tailwind's preflight resets heading/list styles; render with explicit styling. */}
              <div className="space-y-4 text-sm text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: (props) => <h2 className="mt-6 text-base font-semibold text-gray-900" {...props} />,
                    h3: (props) => <h3 className="mt-5 text-sm font-semibold text-gray-900" {...props} />,
                    p: (props) => <p className="leading-6 text-gray-800" {...props} />,
                    ul: (props) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                    ol: (props) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                    li: (props) => <li className="leading-6" {...props} />,
                    hr: (props) => <hr className="my-6 border-gray-200" {...props} />,
                    table: (props) => (
                      <div className="overflow-x-auto rounded-md border border-gray-200">
                        <table className="w-full border-collapse text-sm" {...props} />
                      </div>
                    ),
                    thead: (props) => <thead className="bg-gray-50" {...props} />,
                    tbody: (props) => <tbody className="bg-white" {...props} />,
                    tr: (props) => <tr className="border-t border-gray-200" {...props} />,
                    th: (props) => (
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" {...props} />
                    ),
                    td: (props) => <td className="px-3 py-2 align-top text-sm text-gray-800" {...props} />,
                    blockquote: (props) => (
                      <blockquote className="rounded-md border border-gray-200 bg-gray-50 p-3 text-gray-700" {...props} />
                    ),
                    code: (props) => (
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800" {...props} />
                    ),
                  }}
                >
                  {post.bodyMarkdown.trim()}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  )
}


