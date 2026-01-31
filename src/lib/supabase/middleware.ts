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

  // Check for service role token in query params (for PDF generation from Edge Function)
  const serviceRoleToken = request.nextUrl.searchParams.get('service_role_token')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const isServiceRole = serviceRoleToken && 
                       serviceRoleKey && 
                       serviceRoleToken === serviceRoleKey

  // #region agent log
  if (request.nextUrl.pathname.startsWith('/reports') && serviceRoleToken) {
    console.log('[DEBUG] Middleware - Token comparison:', {
      tokenLength: serviceRoleToken.length,
      keyLength: serviceRoleKey?.length || 0,
      tokenPrefix: serviceRoleToken.substring(0, 20) + '...',
      keyPrefix: serviceRoleKey?.substring(0, 20) + '...' || 'missing',
      tokensMatch: serviceRoleToken === serviceRoleKey
    })
  }
  // #endregion

  // #region agent log
  if (request.nextUrl.pathname.startsWith('/reports')) {
    console.log('[DEBUG] Middleware - reports path:', {
      pathname: request.nextUrl.pathname,
      hasUser: !!user,
      hasServiceRoleToken: !!serviceRoleToken,
      hasServiceRoleKey: !!serviceRoleKey,
      isServiceRole,
      willRedirect: !user && !isServiceRole && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/assignment') && request.nextUrl.pathname !== '/'
    })
  }
  // #endregion

  // If user is not authenticated and trying to access protected routes
  // Exclude /assignment routes, /auth/callback, and /reports routes with service_role_token
  // They handle their own authentication flow
  if (
    !user &&
    !isServiceRole &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/assignment') &&
    request.nextUrl.pathname !== '/'
  ) {
    // #region agent log
    if (request.nextUrl.pathname.startsWith('/reports')) {
      console.log('[DEBUG] Middleware - REDIRECTING to login (no user, no service role)')
    }
    // #endregion
    // Redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // #region agent log
  if (request.nextUrl.pathname.startsWith('/reports') && isServiceRole) {
    console.log('[DEBUG] Middleware - ALLOWING service role access to reports')
  }
  // #endregion

  // If user is authenticated, check if they have a profile in our profiles table
  if (user && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/api')) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    // If no profile exists, redirect to profile setup (or allow access for now)
    // For now, we'll allow access but this could redirect to a profile setup page
    if (!userProfile) {
      console.log('User authenticated but no profile found:', user.id)
      // You could redirect to a profile setup page here if needed
    }
  }

  // Allow auth callback to proceed without redirect (it handles its own redirect)
  // This must come before the authenticated user redirect check
  if (request.nextUrl.pathname === '/auth/callback') {
    return supabaseResponse
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
