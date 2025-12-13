import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default async function AssessmentsPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Assessments"
        description="Assessment authoring and management is not part of the Phase I deliverable. This area will be enabled in a later phase."
        icon="🧪"
      />
    </DashboardLayout>
  )
}

