import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default async function EditAssessmentPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Edit Assessment"
        description="Assessment authoring/editing is not part of the Phase I deliverable. This area will be enabled in a later phase."
        icon="🧪"
      />
    </DashboardLayout>
  )
}
