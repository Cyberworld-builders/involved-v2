import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default function TestSupabasePage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Supabase Connection Test"
        description="This is an internal engineering/debug page and is not part of the Phase I deliverable."
        icon="🧰"
      />
    </DashboardLayout>
  )
}

