'use client'

import { Button } from '@/components/ui/button'
import { usePdfState } from '@/hooks/use-pdf-state'
import { friendlyPdfError } from '@/lib/reports/pdf-error-messages'

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
    actionError,
    clearError,
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

  return (
    <div className="flex flex-col gap-1">
      {/* Transient action error banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800 flex items-start gap-2">
          <span className="flex-1">{actionError.message}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Dismiss">×</button>
        </div>
      )}

      {currentStatus === 'not_requested' && (
        <>
          <Button variant={variant} size={size} onClick={handleGenerate} disabled={isLoading}>
            Generate PDF
          </Button>
          <p className="text-xs text-gray-500">Creates a PDF and saves it for future downloads</p>
        </>
      )}

      {currentStatus === 'queued' && (
        <>
          <Button variant={variant} size={size} disabled>
            Queued...
          </Button>
          <p className="text-xs text-gray-500">Waiting to start</p>
        </>
      )}

      {currentStatus === 'generating' && (
        <>
          <Button variant={variant} size={size} disabled>
            Generating...
          </Button>
          <p className="text-xs text-gray-500">This can take ~10-30s</p>
        </>
      )}

      {currentStatus === 'ready' && (
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
      )}

      {currentStatus === 'failed' && (
        <>
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800 mb-1">
            {friendlyPdfError(state?.lastError)}
          </div>
          <Button variant="destructive" size={size} onClick={handleRegenerate} disabled={isLoading}>
            {isLoading ? 'Retrying...' : 'Retry PDF'}
          </Button>
          {state?.lastError && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 text-red-600 break-words">{state.lastError}</p>
            </details>
          )}
        </>
      )}
    </div>
  )
}
