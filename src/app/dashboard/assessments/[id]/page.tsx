import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default async function AssessmentPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Assessment Details"
        description="Assessment detail and configuration pages are not part of the Phase I deliverable. This area will be enabled in a later phase."
        icon="🧪"
      />
    </DashboardLayout>
  )
}


