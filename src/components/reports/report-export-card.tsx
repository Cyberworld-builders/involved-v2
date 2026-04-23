'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { usePdfState } from '@/hooks/use-pdf-state'
import { usePdfProgressMessage } from '@/hooks/use-pdf-progress-message'
import { friendlyPdfError } from '@/lib/reports/pdf-error-messages'
import { formatDateTime } from '@/lib/utils'
import { Download, FileSpreadsheet, FileText, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'

interface ReportExportCardProps {
  assignmentId: string
  is360: boolean
  isCompleted: boolean
  onRegenerate?: () => void
}

export default function ReportExportCard({
  assignmentId,
  is360,
  isCompleted,
  onRegenerate,
}: ReportExportCardProps) {
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

  const handleRegenerateAndRefresh = async () => {
    await handleRegenerate()
    onRegenerate?.()
  }

  const pdfStatus = state?.status || 'not_requested'
  const progressMessage = usePdfProgressMessage(
    pdfStatus === 'queued' || pdfStatus === 'generating'
  )

  if (!isCompleted && !is360) return null

  return (
    <Card>
      <CardContent className="!p-8">
        {/* Transient action error banner */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800 flex items-start gap-2 mb-4">
            <span className="flex-1">{actionError.message}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Dismiss">×</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-8">
          {/* Column 1: PDF Report */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">PDF Report</h3>
            {pdfStatus === 'not_requested' && !isLoading && (
              <div>
                <Button onClick={handleGenerate} disabled={isLoading} size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PDF
                </Button>
                <p className="text-xs text-gray-400 mt-2">Creates a downloadable PDF</p>
              </div>
            )}
            {(pdfStatus === 'queued' || pdfStatus === 'generating') && (
              <div>
                <Button disabled size="sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progressMessage}
                </Button>
                <p className="text-xs text-gray-400 mt-2">This usually takes under a minute.</p>
              </div>
            )}
            {pdfStatus === 'ready' && (
              <div>
                <div className="flex gap-2">
                  <Button onClick={handleView} size="sm" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>
                  <Button onClick={handleDownload} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                {state?.generatedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Generated {formatDateTime(state.generatedAt)}
                  </p>
                )}
                <button
                  onClick={handleRegenerateAndRefresh}
                  disabled={isLoading}
                  className="text-xs text-gray-500 hover:text-gray-700 underline mt-1 block disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  {isLoading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            )}
            {pdfStatus === 'failed' && (
              <div>
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800 mb-2">
                  {friendlyPdfError(state?.lastError)}
                </div>
                <Button onClick={handleRegenerateAndRefresh} disabled={isLoading} variant="destructive" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isLoading ? 'Retrying...' : 'Retry'}
                </Button>
                {state?.lastError && (
                  <details className="text-xs text-gray-500 mt-2">
                    <summary className="cursor-pointer">Technical details</summary>
                    <p className="mt-1 text-red-600 break-words">{state.lastError}</p>
                  </details>
                )}
              </div>
            )}
            {isLoading && !state && (
              <Button disabled size="sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </Button>
            )}
          </div>

          {/* Column 2: Data Exports */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Data Exports</h3>
            <div className="flex gap-2">
              <a
                href={`/api/reports/${assignmentId}/export/excel`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </a>
              <a
                href={`/api/reports/${assignmentId}/export/csv`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </a>
            </div>
          </div>

          {/* Column 3: View */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">View</h3>
            <a
              href={`/reports/${assignmentId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open full report
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
