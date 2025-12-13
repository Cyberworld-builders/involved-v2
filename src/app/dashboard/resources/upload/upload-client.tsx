'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\.[a-z0-9]+$/i, '') // remove extension
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function UploadResourceVideoClient() {
  const supabase = useMemo(() => createClient(), [])

  const [file, setFile] = useState<File | null>(null)
  const [folder, setFolder] = useState('getting-started')
  const [baseName, setBaseName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [uploadedPath, setUploadedPath] = useState<string>('')

  const suggestedName = file ? slugify(file.name) : ''

  const onPickFile = (picked: File | null) => {
    setFile(picked)
    setMessage('')
    setUploadedPath('')
    if (picked && !baseName) {
      setBaseName(slugify(picked.name))
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setMessage('')
    setUploadedPath('')

    try {
      // Basic client-side validation
      const maxBytes = 100 * 1024 * 1024 // 100MB
      if (file.size > maxBytes) {
        throw new Error('File is too large. Please keep clips under ~100MB.')
      }
      if (!file.type.startsWith('video/')) {
        throw new Error('Please upload a video file (mp4/webm recommended).')
      }

      const safeFolder = slugify(folder || 'resources') || 'resources'
      const safeBase = slugify(baseName || suggestedName || 'clip') || 'clip'
      const ext = file.name.split('.').pop() || 'mp4'
      const path = `${safeFolder}/${safeBase}-${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('resources-videos')
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type || undefined,
          upsert: false,
        })

      if (error) {
        throw new Error(error.message)
      }

      setUploadedPath(path)
      setMessage('Upload complete. Copy the path into your resources post.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const snippet = uploadedPath
    ? `video: { bucket: 'resources-videos', path: '${uploadedPath}' }`
    : ''

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">Video file</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-200"
          />
          <p className="mt-2 text-xs text-gray-500">
            Best practice: upload H.264 MP4 for broad compatibility. Keep clips short (1–5 minutes).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Folder</label>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="getting-started"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500">Used as a prefix in the storage path.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">Clip name</label>
          <input
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            placeholder={suggestedName || 'welcome'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500">We’ll append a timestamp to avoid collisions.</p>
        </div>
        <div className="flex items-end">
          <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
            {isUploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.toLowerCase().includes('upload complete')
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message}
        </div>
      ) : null}

      {uploadedPath ? (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-900">Uploaded path</div>
          <div className="mt-1 font-mono text-sm text-gray-700 break-all">{uploadedPath}</div>
          <div className="mt-4 text-sm font-medium text-gray-900">Paste into resources file</div>
          <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-800">{snippet}</pre>
        </div>
      ) : null}
    </div>
  )
}

