'use client'

import { REPORT_SPACING, REPORT_COLORS } from '@/lib/reports/report-design-constants'
import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  pageNumber?: number
  className?: string
  id?: string
}

/**
 * Page Container Component
 * 
 * Matches legacy page-container styling:
 * - Fixed A4 dimensions: 850px × 1100px
 * - White background
 * - Page break after (for printing)
 * - Relative positioning for absolute children
 */
export default function PageContainer({ 
  children, 
  className = '',
  id 
}: PageContainerProps) {
  return (
    <div
      id={id}
      className={`page-container ${className}`}
      style={{
        backgroundColor: REPORT_COLORS.white,
        height: `${REPORT_SPACING.pageHeight}px`,
        width: `${REPORT_SPACING.pageWidth}px`,
        pageBreakAfter: 'always',
        position: 'relative',
        color: REPORT_COLORS.textPrimary,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}
