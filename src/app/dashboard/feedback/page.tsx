import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default function FeedbackPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Feedback"
        description="View and manage feedback from assessments, track development progress, and generate comprehensive reports."
        icon="💬"
      />
    </DashboardLayout>
  )
}

