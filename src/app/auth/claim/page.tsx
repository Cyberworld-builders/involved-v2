import { Suspense } from 'react'
import ClaimAccountClient from './claim-account-client'

export default function ClaimAccountPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ClaimAccountClient />
    </Suspense>
  )
}
