'use client'

import { Button } from '@/components/ui/button'
import { usePdfState } from '@/hooks/use-pdf-state'

export type { PdfStatus, PdfState } from '@/hooks/use-pdf-state'

interface PdfActionButtonsProps {
  assignmentId: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
}

/**
 * Smart PDF button component that adapts based on PDF generation status.
 * Used by survey-detail-client and other pages that need standalone PDF controls.
 */
export function PdfActionButtons({
  assignmentId,
  size = 'default',
  variant = 'outline',
}: PdfActionButtonsProps) {
  const {
    state,
    isLoading,
    handleGenerate,
    handleView,
    handleDownload,
    handleRegenerate,
  } = usePdfState(assignmentId)

  if (isLoading && !state) {
    return (
      <Button variant={variant} size={size} disabled>
        Loading...
      </Button>
    )
  }

  const currentStatus = state?.status || 'not_requested'

  switch (currentStatus) {
    case 'not_requested':
      return (
        <div className="flex flex-col gap-1">
          <Button variant={variant} size={size} onClick={handleGenerate} disabled={isLoading}>
            Generate PDF
          </Button>
          <p className="text-xs text-gray-500">Creates a PDF and saves it for future downloads</p>
        </div>
      )

    case 'queued':
      return (
        <div className="flex flex-col gap-1">
          <Button variant={variant} size={size} disabled>
            Queued...
          </Button>
          <p className="text-xs text-gray-500">Waiting to start</p>
        </div>
      )

    case 'generating':
      return (
        <div className="flex flex-col gap-1">
          <Button variant={variant} size={size} disabled>
            Generating...
          </Button>
          <p className="text-xs text-gray-500">This can take ~10-30s</p>
        </div>
      )

    case 'ready':
      return (
        <div className="flex gap-2">
          <Button variant={variant} size={size} onClick={handleView}>
            View PDF
          </Button>
          <Button variant={variant} size={size} onClick={handleDownload}>
            Download
          </Button>
          <Button variant={variant} size={size} onClick={handleRegenerate} disabled={isLoading} title="Regenerate report data and PDF (replaces current)">
            {isLoading ? 'Regenerating...' : 'Regenerate PDF'}
          </Button>
        </div>
      )

    case 'failed':
      return (
        <div className="flex flex-col gap-1">
          <Button variant="destructive" size={size} onClick={handleRegenerate} disabled={isLoading}>
            Retry PDF
          </Button>
          {state?.lastError && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">View error details</summary>
              <p className="mt-1 text-red-600">{state?.lastError}</p>
            </details>
          )}
        </div>
      )

    default:
      return (
        <Button variant={variant} size={size} disabled>
          Unknown status
        </Button>
      )
  }
}
