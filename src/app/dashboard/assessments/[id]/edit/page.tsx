import EditAssessmentClient from './edit-client'

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditAssessmentClient id={id} />
}
