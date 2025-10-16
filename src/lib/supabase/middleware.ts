import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not authenticated and trying to access protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/'
  ) {
    // Redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check if they have a profile in our users table
  if (user && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/api')) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    // If no profile exists, try to create one (fallback for trigger issues)
    if (!userProfile) {
      console.log('User authenticated but no profile found, creating fallback profile:', user.id)
      
      try {
        const { error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            username: user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now()}`,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            language_id: null, // Default to English
            completed_profile: false,
          })
        
        if (createError) {
          console.error('Failed to create fallback user profile:', createError)
        } else {
          console.log('Fallback user profile created successfully')
        }
      } catch (error) {
        console.error('Error in fallback profile creation:', error)
      }
    }
  }

  // If user is authenticated and on auth pages, redirect to dashboard
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/auth/login') ||
     request.nextUrl.pathname.startsWith('/auth/signup'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}
