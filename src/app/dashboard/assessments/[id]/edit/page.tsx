import EditAssessmentClient from './edit-client'

interface EditAssessmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditAssessmentPage({ params }: EditAssessmentPageProps) {
  const { id } = await params
  return <EditAssessmentClient id={id} />
}
