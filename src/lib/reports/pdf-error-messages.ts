/**
 * Maps technical PDF/report errors to user-friendly messages.
 * The raw error is still available in the error details toggle for admins.
 */

const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /timed out|stuck in "queued"|stuck in "generating"/i,
    message: 'PDF generation timed out. This can happen when the server is busy. Please try again.',
  },
  {
    pattern: /unauthorized|401/i,
    message: 'There was an authentication issue during PDF generation. Please try again — if it persists, contact support.',
  },
  {
    pattern: /no dimensions configured/i,
    message: 'This assessment doesn\'t have any dimensions set up yet. An administrator needs to configure the assessment before reports can be generated.',
  },
  {
    pattern: /no top-level.*dimensions/i,
    message: 'The assessment dimensions aren\'t configured correctly. Please contact an administrator.',
  },
  {
    pattern: /no group is linked/i,
    message: 'This 360 assessment isn\'t linked to a group yet. The assignment needs a group configured for rater classification.',
  },
  {
    pattern: /group not found/i,
    message: 'The group associated with this assignment was removed. Please reassign the group or contact an administrator.',
  },
  {
    pattern: /assignment must be completed/i,
    message: 'The assessment needs to be completed before a report can be generated.',
  },
  {
    pattern: /assignment not found/i,
    message: 'This assignment could not be found. It may have been deleted.',
  },
  {
    pattern: /no page containers found/i,
    message: 'The report page didn\'t render correctly for PDF capture. Please try again.',
  },
  {
    pattern: /failed to trigger pdf generation/i,
    message: 'Couldn\'t start PDF generation. The server may be temporarily unavailable — please try again in a moment.',
  },
  {
    pattern: /report must be generated/i,
    message: 'Report data needs to be generated first. Please try again — the system will create it automatically.',
  },
  {
    pattern: /failed to export pdf/i,
    message: 'PDF export failed. Please try again — if it persists, try regenerating the report first.',
  },
  {
    pattern: /navigation timeout|timeout.*exceeded|ERR_CONNECTION/i,
    message: 'The report page took too long to load during PDF generation. Please try again.',
  },
]

/**
 * Convert a technical error message into a user-friendly one.
 * Returns the friendly message. The original `rawError` should be kept
 * available in a collapsible "details" section for admin debugging.
 */
export function friendlyPdfError(rawError: string | null | undefined): string {
  if (!rawError) return 'An unexpected error occurred. Please try again.'

  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(rawError)) {
      return message
    }
  }

  // Fallback for unrecognized errors
  return 'Something went wrong during PDF generation. Please try again — if it persists, contact support.'
}
