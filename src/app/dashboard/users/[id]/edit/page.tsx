import EditUserClient from './edit-user-client'

interface EditUserPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params
  return <EditUserClient id={id} />
}
