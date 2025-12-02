import BenchmarksManageClient from './benchmarks-manage-client'

interface BenchmarksManagePageProps {
  params: Promise<{
    assessmentId: string
    industryId: string
  }>
}

export default async function BenchmarksManagePage({ params }: BenchmarksManagePageProps) {
  const { assessmentId, industryId } = await params
  return <BenchmarksManageClient assessmentId={assessmentId} industryId={industryId} />
}
