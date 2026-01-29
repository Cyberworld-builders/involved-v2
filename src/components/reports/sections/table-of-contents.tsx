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
 * Matches legacy table-of-contents styling:
 * - Main lines with page numbers
 * - Sub-lines with triangle icons
 * - Underline styling
 */
export default function TableOfContents({ sections, className = '' }: TableOfContentsProps) {
  return (
    <div
      className={`table-of-contents ${className}`}
      style={{
        letterSpacing: '0.5px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '18px',
        lineHeight: '22px',
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
              marginBottom: '14px',
              position: 'relative',
              width: `${REPORT_SPACING.contentWidth}px`,
              height: '29px',
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
            <span
              className="page"
              style={{
                position: 'absolute',
                right: 0,
              }}
            >
              {section.page}
            </span>
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
                  marginBottom: '14px',
                  position: 'relative',
                  height: '29px',
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
                    top: '6px',
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
                    marginBottom: '14px',
                    position: 'relative',
                    height: '29px',
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
