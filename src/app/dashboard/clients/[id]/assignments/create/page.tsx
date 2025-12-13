import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default async function CreateAssignmentPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Assignments"
        description="Assignments are not part of the Phase I deliverable. This area will be enabled in a later phase."
        icon="🗓️"
      />
    </DashboardLayout>
  )
}

