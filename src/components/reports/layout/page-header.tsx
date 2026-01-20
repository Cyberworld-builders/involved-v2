'use client'

import { REPORT_COLORS } from '@/lib/reports/report-design-constants'
import Image from 'next/image'

interface PageHeaderProps {
  pageNumber: number
  logo: string
  logoWidth?: number
  isEvenPage?: boolean
}

/**
 * Page Header Component
 * 
 * Matches legacy page-header styling:
 * - Logo alternates position (left on odd pages, right on even pages)
 * - 4px blue line separator
 * - Logo from /public/images/reports/
 */
export default function PageHeader({ 
  pageNumber, 
  logo, 
  logoWidth,
  isEvenPage 
}: PageHeaderProps) {
  const isEven = isEvenPage ?? (pageNumber % 2 === 0)
  const defaultLogoWidth = isEven ? 134 : 125
  
  return (
    <div className="page-header" style={{ margin: 0, border: 'none', padding: 0 }}>
      {isEven ? (
        <Image
          className="logo right"
          src={`/images/reports/${logo}`}
          alt="Logo"
          width={logoWidth ?? defaultLogoWidth}
          height={50}
          style={{
            float: 'right',
            paddingLeft: '8px',
            paddingRight: 0,
            position: 'relative',
            top: '-2px',
          }}
        />
      ) : (
        <Image
          className="logo"
          src={`/images/reports/${logo}`}
          alt="Logo"
          width={logoWidth ?? defaultLogoWidth}
          height={50}
          style={{
            width: `${logoWidth ?? defaultLogoWidth}px`,
            float: 'left',
            paddingRight: '8px',
            background: REPORT_COLORS.white,
            position: 'relative',
            top: '-8px',
          }}
        />
      )}
      <div 
        className="line" 
        style={{
          height: '4px',
          background: REPORT_COLORS.primaryBlue,
          overflow: 'hidden',
        }}
      />
      <div style={{ clear: 'both' }} />
    </div>
  )
}
