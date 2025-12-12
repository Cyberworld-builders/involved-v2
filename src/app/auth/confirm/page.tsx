import { Suspense } from 'react'
import ConfirmEmailClient from './confirm-email-client'

export default function ConfirmEmailPage() {
  // Next.js requires `useSearchParams()` usage to be wrapped in a Suspense boundary
  // when it causes a CSR bailout at the page level.
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>}>
      <ConfirmEmailClient />
    </Suspense>
  )
}
