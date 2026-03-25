'use client'

import { REPORT_TYPOGRAPHY, REPORT_LAYOUT, REPORT_COLORS } from '@/lib/reports/report-design-constants'

interface PageFooterProps {
  pageNumber: number
}

/**
 * Page Footer Component
 * 
 * Matches legacy page-footer styling:
 * - Centered text
 * - 14px font size
 * - 0.3px letter spacing
 * - Positioned at bottom
 */
export default function PageFooter({ pageNumber }: PageFooterProps) {
  return (
    <div
      className="page-footer"
      style={{
        position: 'absolute',
        bottom: '-110px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${REPORT_LAYOUT.footerWidth}px`,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: REPORT_TYPOGRAPHY.footer.fontSize,
        lineHeight: '9px',
        textAlign: 'center',
        letterSpacing: REPORT_TYPOGRAPHY.footer.letterSpacing,
        color: REPORT_COLORS.textPrimary,
        zIndex: 10,
      }}
    >
      Page {pageNumber}
    </div>
  )
}
