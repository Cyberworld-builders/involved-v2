# Dashboard Navigation Performance Optimization Plan

## Current Issues

### ✅ Fixed: Nested Navigation
- **Problem**: Pages were wrapping themselves in `<DashboardLayout>` while `layout.tsx` also wraps them
- **Solution**: Removed DashboardLayout wrappers from pages (layout.tsx handles it)
- **Status**: Fixed

### ⚠️ Still Slow: Duplicate Profile Fetches
- **Problem**: Every page calls `getUserProfile()` independently, even though layout.tsx already fetches it
- **Impact**: Each page navigation triggers 2+ database queries:
  1. Layout fetches profile (for Sidebar)
  2. Page fetches profile again (for its own logic)
- **Result**: Still slow navigation despite layout optimization

## Root Cause Analysis

### Why It's Still Slow

1. **Duplicate Database Queries**
   - Layout: `getUserProfile()` - ~50-100ms
   - Page: `getUserProfile()` - ~50-100ms
   - Total: ~100-200ms just for profile fetches

2. **No Caching**
   - Each `getUserProfile()` call hits the database
   - No React Cache or session storage
   - Profile is fetched fresh on every page

3. **Server Component Blocking**
   - Pages are server components that block until data is fetched
   - No streaming or progressive rendering
   - User waits for all data before seeing anything

## Solutions

### Option 1: Pass Profile from Layout to Pages (Recommended)

**Approach**: Use React Context or props to share profile data

**Implementation**:
```typescript
// layout.tsx
export default async function DashboardLayout({ children }) {
  const profile = await getUserProfile(...)
  
  return (
    <ProfileProvider profile={profile}>
      <DashboardLayout userProfile={profile}>
        {children}
      </DashboardLayout>
    </ProfileProvider>
  )
}

// pages can access via context
const profile = useProfile() // No fetch needed!
```

**Pros**:
- Eliminates duplicate fetches
- Profile fetched once per session
- Pages get instant access to profile

**Cons**:
- Requires Context setup
- Server components can't use React Context directly
- Need to pass via props or use a different pattern

### Option 2: Remove Profile Fetches from Pages (Simpler)

**Approach**: Pages that only need profile for auth can skip it (layout already did auth)

**Implementation**:
- Remove `getUserProfile()` from pages that only use it for auth checks
- Layout already does auth, so pages are guaranteed to have authenticated user
- Only pages that need profile data for business logic should fetch it

**Pros**:
- Simple to implement
- Eliminates most duplicate fetches
- No architectural changes needed

**Cons**:
- Pages that need profile data still fetch it
- Doesn't solve all performance issues

### Option 3: Cache Profile in Session/Cookies

**Approach**: Store profile in session or cookies, refresh periodically

**Implementation**:
- Fetch profile once, store in session
- Pages read from session instead of database
- Refresh every 5-10 minutes or on profile update

**Pros**:
- Very fast (no database query)
- Works across all pages
- Simple to implement

**Cons**:
- Session storage overhead
- Need to handle cache invalidation
- May show stale data briefly

## Recommended Implementation

### Phase 1: Remove Unnecessary Profile Fetches (Quick Win)

Pages that only fetch profile for auth checks can skip it:
- Layout already verified user is authenticated
- If page only needs to check `access_level` for redirects, we can pass that from layout

**Files to update**:
- Pages that only do `if (!profile) redirect('/auth/login')` - can remove
- Pages that check `access_level` for redirects - can receive from layout

### Phase 2: Share Profile Data (Better Solution)

Create a way to pass profile from layout to pages:
- Use Next.js `params` or create a shared data structure
- Or use React Server Component patterns to share data

### Phase 3: Implement Caching (Best Performance)

- Cache profile in session/cookies
- Refresh on demand or periodically
- Eliminates all duplicate queries

## Immediate Action Items

1. ✅ Remove DashboardLayout wrappers from pages (DONE)
2. ⚠️ Remove `getUserProfile()` from pages that only use it for auth (layout already did auth)
3. ⚠️ Pass `access_level` from layout to pages that need it for redirects
4. ⚠️ Only pages that need full profile data should fetch it

## Expected Performance After Fixes

- **Current**: ~200-500ms per navigation (duplicate fetches)
- **After Phase 1**: ~100-200ms (one fetch in layout)
- **After Phase 2**: ~50-100ms (shared data, no duplicate fetch)
- **After Phase 3**: ~10-50ms (cached data)

## Files That Need Updates

Pages that fetch profile but only use it for auth:
- `src/app/dashboard/resources/page.tsx` - only checks auth
- `src/app/dashboard/resources/[slug]/page.tsx` - only checks auth
- `src/app/dashboard/resources/upload/page.tsx` - checks access_level
- Many others...

Pages that need profile data for business logic (keep fetch, but optimize):
- `src/app/dashboard/assignments/page.tsx` - needs access_level for redirect
- `src/app/dashboard/clients/page.tsx` - needs access_level and client_id
- `src/app/dashboard/page.tsx` - needs access_level for redirect
