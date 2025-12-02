import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default function AssessmentsPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Assessments"
        description="Create and manage talent assessments, including 360° feedback, leadership evaluations, and custom assessment tools."
        icon="📋"
      />
    </DashboardLayout>
  )
}

