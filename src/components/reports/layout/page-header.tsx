'use client'

import { REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'
import Image from 'next/image'

interface PageHeaderProps {
  pageNumber: number
  logo: string
  logoWidth?: number
}

/**
 * Page Header Component
 *
 * Banner line runs from ~8.6% to ~70.5% of page width.
 * Logo sits to the right of the line, from ~72% to ~91% of width.
 * Both positioned at ~5.2–5.4% from top of page.
 *
 * Coordinates (850×1100 page):
 *   Line: x=73 to x=599, y=59, height=2px
 *   Logo: x=611, y=57, width=163, height=23
 */
export default function PageHeader({
  pageNumber,
  logo,
  logoWidth,
}: PageHeaderProps) {
  const resolvedLogoWidth = logoWidth ?? 163

  return (
    <div
      className="page-header"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        margin: 0,
        border: 'none',
        padding: 0,
      }}
    >
      {/* Horizontal line — 8.6% to 70.5% of page width, at ~5.4% from top */}
      <div
        className="line"
        style={{
          position: 'absolute',
          left: `${REPORT_SPACING.pagePaddingLeft}px`,
          right: `${850 - 599}px`,
          top: '59px',
          height: '2px',
          background: REPORT_COLORS.primaryBlue,
        }}
      />
      {/* Logo — right of line, from ~72% to ~91% of page width */}
      <Image
        className="logo"
        src={`/images/reports/${logo}`}
        alt="Logo"
        width={resolvedLogoWidth}
        height={23}
        style={{
          position: 'absolute',
          top: '57px',
          right: `${REPORT_SPACING.pagePaddingRight}px`,
          width: `${resolvedLogoWidth}px`,
          height: '23px',
          objectFit: 'contain',
          objectPosition: 'right center',
        }}
      />
    </div>
  )
}
