import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default function CreateAssessmentPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Create Assessment"
        description="Assessment authoring is not part of the Phase I deliverable. This will be enabled in a later phase."
        icon="🧪"
      />
    </DashboardLayout>
  )
}

