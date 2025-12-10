import CreateAssignmentClient from './create-assignment-client'

interface CreateAssignmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CreateAssignmentPage({ params }: CreateAssignmentPageProps) {
  const { id } = await params
  return <CreateAssignmentClient clientId={id} />
}

