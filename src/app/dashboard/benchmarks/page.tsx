import DashboardLayout from '@/components/layout/dashboard-layout'
import ComingSoon from '@/components/coming-soon'

export default function BenchmarksPage() {
  return (
    <DashboardLayout>
      <ComingSoon
        title="Benchmarks"
        description="Compare assessment results against industry benchmarks and track performance metrics over time."
        icon="📊"
      />
    </DashboardLayout>
  )
}

