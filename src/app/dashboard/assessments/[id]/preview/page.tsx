import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default async function AssessmentPreviewPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Assessment Preview"
        description="Assessment preview is not part of the Phase I deliverable. This area will be enabled in a later phase."
        icon="🧪"
      />
    </DashboardLayout>
  )
}
