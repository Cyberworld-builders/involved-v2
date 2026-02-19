'use client'

import { REPORT_SPACING } from '@/lib/reports/report-design-constants'
import { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

/**
 * Page Wrapper Component
 * 
 * Wraps content within a page container
 * Matches legacy page-wrapper styling:
 * - Padding: 59px top/bottom, 73px left/right
 * - Relative positioning
 * - Height: 960px
 */
export default function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div
      className={`page-wrapper ${className}`}
      style={{
        padding: `${REPORT_SPACING.pagePaddingTop}px ${REPORT_SPACING.pagePaddingRight}px ${REPORT_SPACING.footerAreaHeight}px ${REPORT_SPACING.pagePaddingLeft}px`,
        position: 'relative',
        height: `${REPORT_SPACING.contentHeight}px`,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}
