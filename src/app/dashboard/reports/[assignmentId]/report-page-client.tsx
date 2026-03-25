'use client'

import { useCallback, useRef } from 'react'
import ReportExportCard from '@/components/reports/report-export-card'
import ReportViewClient from './report-view-client'

interface ReportPageClientProps {
  assignmentId: string
  is360: boolean
  isCompleted: boolean
}

export default function ReportPageClient({
  assignmentId,
  is360,
  isCompleted,
}: ReportPageClientProps) {
  const reloadRef = useRef<(() => Promise<void>) | null>(null)

  const handleRegenerate = useCallback(() => {
    reloadRef.current?.()
  }, [])

  const handleLoadReport = useCallback((reload: () => Promise<void>) => {
    reloadRef.current = reload
  }, [])

  return (
    <>
      <ReportExportCard
        assignmentId={assignmentId}
        is360={is360}
        isCompleted={isCompleted}
        onRegenerate={handleRegenerate}
      />
      <ReportViewClient
        assignmentId={assignmentId}
        is360={is360}
        onLoadReport={handleLoadReport}
      />
    </>
  )
}
