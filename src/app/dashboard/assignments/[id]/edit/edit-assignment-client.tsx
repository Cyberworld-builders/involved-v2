'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface AssignmentData {
  id: string
  user_id: string
  assessment_id: string
  survey_id: string | null
  expires: string
  completed: boolean
  completed_at: string | null
  created_at: string
  url: string | null
  whitelabel: boolean | null
  user: {
    id: string
    name: string
    email: string
    username: string | null
  } | null
  assessment: {
    id: string
    title: string
    description: string | null
  } | null
}

interface EditAssignmentClientProps {
  assignment: AssignmentData
}

export default function EditAssignmentClient({ assignment }: EditAssignmentClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Editable fields
  const currentExpires = new Date(assignment.expires).toISOString().split('T')[0]
  const [expirationDate, setExpirationDate] = useState(currentExpires)

  const user = assignment.user
  const assessment = assignment.assessment

  const isExpired = new Date(assignment.expires) < new Date()
  const status = assignment.completed ? 'Completed' : isExpired ? 'Expired' : 'Pending'

  const handleUpdateExpiration = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expires: new Date(expirationDate + 'T23:59:59').toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update expiration')
      }

      setMessage('Expiration date updated successfully.')
      setMessageType('success')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setMessage('')

    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete assignment')
      }

      router.push('/dashboard/assignments')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
      setMessageType('error')
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Assignment</h1>
          <p className="text-gray-600">Manage assignment settings</p>
        </div>
        <Link href={`/dashboard/assignments/${assignment.id}`}>
          <Button variant="outline">Back to Assignment</Button>
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          messageType === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assignment Info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">User</label>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user?.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Assessment</label>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {assessment?.title || 'Unknown Assessment'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  status === 'Completed'
                    ? 'bg-green-100 text-green-800'
                    : status === 'Expired'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-orange-100 text-orange-800'
                }`}>
                  {status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Assigned</label>
              <p className="text-sm text-gray-900 mt-1">
                {assignment.created_at
                  ? new Date(assignment.created_at).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
            {assignment.completed_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Completed</label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(assignment.completed_at).toLocaleString()}
                </p>
              </div>
            )}
            {assignment.survey_id && (
              <div>
                <label className="text-sm font-medium text-gray-500">Survey ID</label>
                <p className="text-sm text-gray-500 mt-1 font-mono text-xs">
                  {assignment.survey_id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editable Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
                <Button
                  onClick={handleUpdateExpiration}
                  disabled={isLoading || expirationDate === currentExpires}
                  size="sm"
                >
                  {isLoading ? 'Saving...' : 'Update'}
                </Button>
              </div>
              {isExpired && !assignment.completed && (
                <p className="text-sm text-red-600 mt-1">
                  This assignment has expired. Extend the date to reactivate it.
                </p>
              )}
            </div>

            {/* Add Users to Survey */}
            {assignment.survey_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add Users to Survey
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Add more users to this same survey batch.
                </p>
                <Link href={`/dashboard/assignments/create?survey_id=${assignment.survey_id}`}>
                  <Button variant="outline" size="sm">
                    Add Users to Survey
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Assignment</p>
              <p className="text-sm text-gray-500">
                Permanently delete this assignment and all associated answers. This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent
          title="Delete Assignment"
          description="Are you sure you want to delete this assignment? This action cannot be undone."
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                <strong>User:</strong> {user?.name || 'Unknown'} ({user?.email || 'N/A'})
              </p>
              <p className="text-sm text-red-800">
                <strong>Assessment:</strong> {assessment?.title || 'Unknown'}
              </p>
              {assignment.completed && (
                <p className="text-sm text-red-800 mt-1">
                  This assignment has been completed. Deleting it will also remove the response data.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
