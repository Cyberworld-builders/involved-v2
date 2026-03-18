'use client'

import { REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'

interface TOCSection {
  title: string
  page: number
  subSections?: TOCSection[]
}

interface TableOfContentsProps {
  sections: TOCSection[]
  className?: string
}

/**
 * Table of Contents Component
 *
 * Dynamically scales spacing based on total entry count to fit on one page.
 */
export default function TableOfContents({ sections, className = '' }: TableOfContentsProps) {
  // Count total entries to determine spacing
  let totalEntries = 0
  for (const section of sections) {
    totalEntries++
    if (section.subSections) {
      for (const sub of section.subSections) {
        totalEntries++
        if (sub.subSections) {
          totalEntries += sub.subSections.length
        }
      }
    }
  }

  // Scale spacing to fit — max usable height ~700px (960 - title - margins)
  const maxHeight = 700
  const lineHeight = Math.min(26, Math.floor(maxHeight / totalEntries) - 2)
  const lineMargin = Math.min(10, Math.max(4, lineHeight - 20))
  const fontSize = totalEntries > 20 ? '15px' : '18px'

  return (
    <div
      className={`table-of-contents ${className}`}
      style={{
        letterSpacing: '0.5px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize,
        lineHeight: `${lineHeight}px`,
        marginTop: '40px',
        width: `${REPORT_SPACING.contentWidth}px`,
        position: 'relative',
      }}
    >
      {sections.map((section, index) => (
        <div key={index}>
          {/* Main Line */}
          <div
            className="line"
            style={{
              borderBottom: `1px solid ${REPORT_COLORS.lightGray}`,
              marginBottom: `${lineMargin}px`,
              position: 'relative',
              width: `${REPORT_SPACING.contentWidth}px`,
              height: `${lineHeight}px`,
            }}
          >
            <span
              className="title"
              style={{
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontWeight: 600,
                position: 'absolute',
                left: 0,
              }}
            >
              {section.title}
            </span>
            {section.page > 0 && (
              <span
                className="page"
                style={{
                  position: 'absolute',
                  right: 0,
                }}
              >
                {section.page}
              </span>
            )}
          </div>

          {/* Sub-sections */}
          {section.subSections && section.subSections.map((subSection, subIndex) => (
            <div key={subIndex}>
              {/* Sub-line */}
              <div
                className="line subline"
                style={{
                  marginLeft: '25px',
                  width: '679px',
                  borderBottom: `1px solid ${REPORT_COLORS.lightGray}`,
                  marginBottom: `${lineMargin}px`,
                  position: 'relative',
                  height: `${lineHeight}px`,
                }}
              >
                <div
                  style={{
                    content: '',
                    background: `url('/images/reports/triangle.png') no-repeat scroll 0 0 transparent`,
                    display: 'block',
                    width: '15px',
                    height: '18px',
                    position: 'absolute',
                    left: '-22px',
                    top: `${Math.max(2, (lineHeight - 18) / 2)}px`,
                    backgroundSize: '5px 8px',
                  }}
                />
                <span
                  className="title"
                  style={{
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontWeight: 600,
                    position: 'absolute',
                    left: 0,
                  }}
                >
                  {subSection.title}
                </span>
                <span
                  className="page"
                  style={{
                    position: 'absolute',
                    right: 0,
                  }}
                >
                  {subSection.page}
                </span>
              </div>

              {/* Sub-sub-sections */}
              {subSection.subSections && subSection.subSections.map((subSubSection, subSubIndex) => (
                <div
                  key={subSubIndex}
                  className="line subsubline"
                  style={{
                    marginLeft: '50px',
                    width: '654px',
                    borderBottom: `1px solid ${REPORT_COLORS.lightGray}`,
                    marginBottom: `${lineMargin}px`,
                    position: 'relative',
                    height: `${lineHeight}px`,
                  }}
                >
                  <span
                    className="title"
                    style={{
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      position: 'absolute',
                      left: 0,
                    }}
                  >
                    {subSubSection.title}
                  </span>
                  <span
                    className="page"
                    style={{
                      position: 'absolute',
                      right: 0,
                    }}
                  >
                    {subSubSection.page}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
