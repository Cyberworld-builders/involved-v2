export type ResourcePost = {
  slug: string
  title: string
  description: string
  /** ISO date string for display/sorting */
  publishedAt?: string
  tags?: string[]
  video: {
    bucket: 'resources-videos'
    /** Path inside the bucket (e.g. "getting-started/welcome.mp4") */
    path: string
  }
}

/**
 * Hard-coded "Resources" posts.
 *
 * Upload videos to the `resources-videos` Supabase Storage bucket, then paste the
 * storage path here (no CMS needed).
 */
export const RESOURCE_POSTS: ResourcePost[] = [
  // Example starter post (replace path after you upload a clip)
  {
    slug: 'welcome',
    title: 'Welcome & quick tour',
    description: 'A quick walkthrough of the dashboard and the Phase I workflow.',
    publishedAt: '2025-01-01',
    tags: ['Getting Started'],
    video: { bucket: 'resources-videos', path: 'getting-started/welcome.mp4' },
  },
]

export function getResourcePostBySlug(slug: string) {
  return RESOURCE_POSTS.find((p) => p.slug === slug) || null
}

