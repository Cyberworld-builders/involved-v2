'use client'

import { REPORT_COLORS } from '@/lib/reports/report-design-constants'

interface FeedbackSectionProps {
  number: string // e.g., "01", "02", "03"
  title: string
  content?: string // HTML content
  type?: 'overall' | 'actionable' | 'thoughts'
  actionableItems?: string[] // For actionable feedback
}

/**
 * Feedback Section Component
 * 
 * Matches legacy feedback section styling:
 * - Numbered sections (01, 02, 03)
 * - Blue border on number
 * - HTML content support
 * - Blank lines for "Your Thoughts" section
 */
export default function FeedbackSection({
  number,
  title,
  content,
  type = 'overall',
  actionableItems,
}: FeedbackSectionProps) {
  return (
    <div
      className="feedback"
      style={{
        marginBottom: '20px',
      }}
    >
      {/* Number */}
      <div
        className="number"
        style={{
          float: 'left',
          color: REPORT_COLORS.primaryBlue,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: 600,
          fontSize: '24px',
          height: '43px',
          borderRight: `6px solid ${REPORT_COLORS.primaryBlue}`,
          lineHeight: '19px',
          paddingRight: '16px',
        }}
      >
        {number}
      </div>

      {/* Content */}
      <div
        className="type"
        style={{
          float: 'left',
          marginLeft: '16px',
          marginTop: '6px',
          width: '620px',
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
          }}
        >
          {title}
        </h3>

        {type === 'thoughts' ? (
          // Blank lines for "Your Thoughts" section
          <div
            className="paragraph-lines"
            style={{
              margin: '10px 0',
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="line"
                style={{
                  borderBottom: `1px solid ${REPORT_COLORS.lightGray}`,
                  height: '24px',
                  marginBottom: '10px',
                }}
              />
            ))}
          </div>
        ) : type === 'actionable' && actionableItems ? (
          // Actionable feedback items
          <div style={{ marginTop: '20px' }}>
            {actionableItems.map((item, index) => (
              <p
                key={index}
                style={{
                  margin: '20px 0',
                  lineHeight: '18px',
                  fontSize: '14px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                }}
              >
                {item}
              </p>
            ))}
          </div>
        ) : content ? (
          // HTML content
          <div
            style={{
              margin: '20px 0',
              lineHeight: '18px',
              fontSize: '14px',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : null}
      </div>

      <div style={{ clear: 'both' }} />
    </div>
  )
}
