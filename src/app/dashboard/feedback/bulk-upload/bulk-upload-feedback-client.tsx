'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BulkUploadFeedbackClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!file) {
      setError('Please select a file')
      setLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/feedback/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload feedback')
      }

      setMessage(
        `Successfully uploaded ${data.inserted} feedback ${data.inserted === 1 ? 'entry' : 'entries'}${
          data.errors && data.errors.length > 0
            ? `. ${data.errors.length} ${data.errors.length === 1 ? 'row had' : 'rows had'} errors.`
            : ''
        }`
      )

      if (data.errors && data.errors.length > 0) {
        console.warn('Upload errors:', data.errors)
      }

      // Clear file
      setFile(null)
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Redirect after a delay
      setTimeout(() => {
        router.push('/dashboard/feedback')
      }, 3000)
    } catch (err) {
      console.error('Error uploading feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV File</CardTitle>
        <CardDescription>
          Upload a CSV file with feedback entries. The file should have the following columns:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements:</h3>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>Assessment</strong> (required): Assessment name or ID</li>
              <li><strong>Dimension</strong> (required for Specific type): Dimension name, code, or "Overall"</li>
              <li><strong>Type</strong> (required): "Overall" or "Specific"</li>
              <li><strong>Feedback</strong> (required): Feedback content (text)</li>
              <li><strong>Min Score</strong> (optional): Minimum score threshold</li>
              <li><strong>Max Score</strong> (optional): Maximum score threshold</li>
            </ul>
            <p className="text-xs text-blue-600 mt-3">
              <strong>Note:</strong> The first row should contain column headers. Use "Overall" in the Dimension column for overall feedback.
            </p>
          </div>

          {/* Example CSV */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Example CSV:</h3>
            <pre className="text-xs text-gray-700 overflow-x-auto">
{`Assessment,Dimension,Type,Feedback,Min Score,Max Score
Leadership Assessment,Communication,Specific,"Great communication skills, keep it up!",,,
Leadership Assessment,,Overall,"Overall strong performance across all dimensions.",,,
Leadership Assessment,Teamwork,Specific,"Works well in teams, could improve collaboration.",2.0,5.0`}
            </pre>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File <span className="text-red-500">*</span>
              </label>
              <input
                id="file-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                required
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !file}>
                {loading ? 'Uploading...' : 'Upload Feedback'}
              </Button>
              <Link href="/dashboard/feedback">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
