'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { REPORT_COLORS, REPORT_TYPOGRAPHY } from '@/lib/reports/report-design-constants'

interface FeedbackPreviewProps {
  feedback: {
    id: string
    feedback: string
    type: 'overall' | 'specific'
    dimension: {
      id: string
      name: string
      code: string
    } | null
    assessment: {
      id: string
      title: string
    } | null
    min_score: number | null
    max_score: number | null
  }
  open: boolean
  onClose: () => void
}

/**
 * Feedback Preview Component
 * 
 * Shows how feedback appears in actual reports, matching the styling
 * of feedback sections in leader-blocker reports.
 */
export default function FeedbackPreview({ feedback, open, onClose }: FeedbackPreviewProps) {
  const isOverall = feedback.type === 'overall'
  const hasScoreRange = feedback.min_score !== null || feedback.max_score !== null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        title={isOverall ? 'Overall Feedback Preview' : `Feedback Preview: ${feedback.dimension?.name || 'Dimension'}`}
        description="This is how the feedback will appear in reports"
        onClose={onClose}
      >
        <div className="space-y-6">
          {/* Assessment Context */}
          {feedback.assessment && (
            <div className="pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Assessment:</span> {feedback.assessment.title}
              </p>
            </div>
          )}

          {/* Score Range Info */}
          {hasScoreRange && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Score Range:</span>{' '}
                {feedback.min_score !== null ? feedback.min_score.toFixed(2) : 'any'} -{' '}
                {feedback.max_score !== null ? feedback.max_score.toFixed(2) : 'any'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This feedback will only be assigned when the score falls within this range.
              </p>
            </div>
          )}

          {/* Preview Section - Styled like report feedback */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div
              className="feedback-preview"
              style={{
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              }}
            >
              {/* Number */}
              <div
                className="number"
                style={{
                  float: 'left',
                  color: REPORT_COLORS.primaryBlue,
                  fontWeight: 600,
                  fontSize: '24px',
                  height: '43px',
                  borderRight: `6px solid ${REPORT_COLORS.primaryBlue}`,
                  lineHeight: '19px',
                  paddingRight: '16px',
                }}
              >
                {isOverall ? '01' : '02'}
              </div>

              {/* Content */}
              <div
                className="type"
                style={{
                  float: 'left',
                  marginLeft: '16px',
                  marginTop: '6px',
                  width: 'calc(100% - 80px)',
                  maxWidth: '620px',
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontWeight: 600,
                    fontSize: '24px',
                    textTransform: 'uppercase',
                    margin: 0,
                    lineHeight: '17px',
                    color: REPORT_COLORS.darkBlue,
                  }}
                >
                  {isOverall ? 'Overall Feedback' : feedback.dimension?.name || 'Dimension Feedback'}
                </h3>

                {/* Feedback Content */}
                <div
                  style={{
                    margin: '20px 0',
                    lineHeight: '18px',
                    fontSize: '14px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    color: REPORT_COLORS.darkBlue,
                  }}
                  dangerouslySetInnerHTML={{ __html: feedback.feedback }}
                />
              </div>

              <div style={{ clear: 'both' }} />
            </div>
          </div>

          {/* Context Note */}
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> In actual reports, this feedback will appear alongside dimension scores,
              benchmarks, and other report elements. The styling shown here matches the report appearance.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
