'use client'

import { REPORT_TYPOGRAPHY, REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'
import Image from 'next/image'
import PageContainer from '../layout/page-container'
import PageWrapper from '../layout/page-wrapper'
import PageHeader from '../layout/page-header'

interface CoverPageProps {
  assessmentTitle: string
  userName: string
  reportType: '360' | 'leader' | 'blockers' | 'me'
  pageNumber?: number
  whitelabel?: boolean
}

/**
 * Cover Page Component
 * 
 * Matches legacy cover page styling:
 * - Cover shapes background image
 * - Large title with "REPORT" emphasis
 * - User name display
 * - Footer logo/tagline
 */
export default function CoverPage({
  assessmentTitle,
  userName,
  reportType,
  pageNumber = 1,
  whitelabel = false,
}: CoverPageProps) {
  // Determine logo based on report type
  const logoMap: Record<string, string> = {
    '360': 'involve-360-logo-small.png',
    'leader': 'involve-leader-logo-small.png',
    'blockers': 'involve-blockers-logo-small.png',
    'me': 'involve-me-logo-small.png',
  }
  
  const logo = logoMap[reportType] || 'logo-small.png'
  const coverShapes = whitelabel 
    ? 'angela-cover-shapes.png' 
    : 'report-cover-shapes.png'
  const footerLogo = whitelabel
    ? 'powered-by-involved-medium-gray.png'
    : 'logo-tagline.png'
  
  // Format assessment title for cover (e.g., "Involved-360" → "Involved-360" / "Report" / "for {name}")
  const titleParts = assessmentTitle.split(' ')
  const mainTitle = titleParts[0] || assessmentTitle
  
  return (
    <PageContainer pageNumber={pageNumber} id={`${pageNumber}`}>
      {/* Cover Shapes Background */}
      <Image
        className="cover-shapes"
        src={`/images/reports/${coverShapes}`}
        alt="Cover shapes"
        width={850}
        height={1100}
        style={{
          position: 'absolute',
          top: `${REPORT_SPACING.coverShapesTop}px`,
          left: 0,
          zIndex: 0,
        }}
      />
      
      <PageWrapper>
        {/* Header */}
        <PageHeader 
          pageNumber={pageNumber} 
          logo={logo}
          logoWidth={reportType === 'leader' ? 166 : reportType === 'blockers' ? 174 : undefined}
        />

        {/* Title */}
        <div
          className="cover-title"
          style={{
            position: 'absolute',
            top: `${REPORT_SPACING.coverTitleTop}px`,
            fontSize: REPORT_TYPOGRAPHY.coverTitle.assessment,
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            margin: '0 80px',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ display: 'block', lineHeight: '28px' }}>{mainTitle}</span>
          <span
            className="report"
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: REPORT_TYPOGRAPHY.coverTitle.main,
              lineHeight: '70px',
              textIndent: '-3px',
              padding: '19px 0',
              fontWeight: 600,
              display: 'block',
            }}
          >
            Report
          </span>
          <span
            className="for"
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: REPORT_TYPOGRAPHY.coverTitle.for,
              lineHeight: '22px',
              display: 'block',
            }}
          >
            <strong style={{ fontWeight: 600 }}>for</strong> {userName}
          </span>
        </div>

        {/* Disclaimer/Footer Logo */}
        <div
          className="cover-disclaimer"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            paddingRight: `${REPORT_SPACING.pagePaddingRight}px`,
          }}
        >
          <Image
            src={`/images/reports/${footerLogo}`}
            alt="Logo tagline"
            width={200}
            height={50}
          />
        </div>
      </PageWrapper>
    </PageContainer>
  )
}
