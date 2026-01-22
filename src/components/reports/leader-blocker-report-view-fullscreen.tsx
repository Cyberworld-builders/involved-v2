'use client'

/**
 * Full-screen Leader/Blocker report view matching legacy branding and layout
 * Matches legacy leader.blade.php and blockers.blade.php structure
 */

import { REPORT_TYPOGRAPHY, REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'
import PageContainer from './layout/page-container'
import PageWrapper from './layout/page-wrapper'
import PageHeader from './layout/page-header'
import PageFooter from './layout/page-footer'
import CoverPage from './sections/cover-page'
import TableOfContents from './sections/table-of-contents'
import ComparisonChart from './charts/comparison-chart'
import FeedbackSection from './sections/feedback-section'
import Image from 'next/image'

interface DimensionReport {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  target_score: number
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  overall_feedback: string | null
  overall_feedback_id: string | null
  specific_feedback: string | null
  specific_feedback_id: string | null
  // Legacy structure expects these
  definition?: string
  subdimensions?: Array<{
    name: string
    definition: string
    score: number
    feedback: {
      Overall?: string
      Actionable?: string[]
      Thoughts?: string
    }
  }>
}

interface ReportLeaderBlockerData {
  assignment_id: string
  user_id: string
  user_name: string
  user_email: string
  assessment_id: string
  assessment_title: string
  group_id: string | null
  group_name: string | null
  overall_score: number
  dimensions: DimensionReport[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
  // Determine if this is a blocker report
  is_blocker?: boolean
}

interface ReportLeaderBlockerViewFullscreenProps {
  reportData: ReportLeaderBlockerData
}

export default function ReportLeaderBlockerViewFullscreen({ reportData }: ReportLeaderBlockerViewFullscreenProps) {
  const isBlocker = reportData.is_blocker || reportData.assessment_title.toLowerCase().includes('blocker')
  const reportType = isBlocker ? 'blockers' : 'leader'
  let pageNumber = 1

  // Build table of contents
  const buildTOC = () => {
    const sections = [
      { title: 'Read Me First', page: 3 },
      { title: 'Summary of Scores', page: 7 },
      {
        title: 'Dimension Scores With Feedback:',
        page: 0,
        subSections: reportData.dimensions.map((dim, idx) => ({
          title: dim.dimension_name,
          page: 8 + idx,
        })),
      },
    ]
    return sections
  }

  // Check if score is flagged (for blockers, higher is worse; for leaders, lower is worse)
  const isFlagged = (score: number, benchmark: number | null, geonorm: number | null) => {
    if (isBlocker) {
      // For blockers: flagged if score is significantly ABOVE benchmark/geonorm
      return (
        (benchmark !== null && score >= (benchmark + 0.49)) ||
        (geonorm !== null && score >= (geonorm + 0.49))
      )
    } else {
      // For leaders: flagged if score is significantly BELOW benchmark/geonorm
      return (
        (benchmark !== null && score <= (benchmark - 0.49)) ||
        (geonorm !== null && score <= (geonorm - 0.49))
      )
    }
  }

  // Calculate expected page count: cover (1) + TOC (1) + Read Me First (1) + Scores Summary (1) + dimensions (2 each: overall + feedback)
  const expectedPages = 4 + (reportData.dimensions.length * 2)
  
  return (
    <div style={{ backgroundColor: REPORT_COLORS.white }} data-report-pages={`${expectedPages}`}>
      {/* Cover Page */}
      <CoverPage
        assessmentTitle={reportData.assessment_title}
        userName={reportData.user_name}
        reportType={reportType}
        pageNumber={pageNumber++}
      />

      {/* Table of Contents */}
      <PageContainer pageNumber={pageNumber} id={`${pageNumber}`}>
        <PageWrapper>
          <PageHeader
            pageNumber={pageNumber}
            logo={`involve-${reportType}-logo-small.png`}
            logoWidth={reportType === 'leader' ? 166 : 174}
          />

          {/* Title */}
          <div
            className="page-title alt2"
            style={{
              fontSize: REPORT_TYPOGRAPHY.pageTitle.small,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              letterSpacing: 0,
              marginTop: '80px',
            }}
          >
            Table Of<br />
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 600, fontSize: '70px' }}>Contents</span>
          </div>

          {/* TOC Content */}
          <TableOfContents sections={buildTOC()} />

          <PageFooter pageNumber={pageNumber} />
        </PageWrapper>
      </PageContainer>

      {/* Read Me First Page */}
      <PageContainer pageNumber={pageNumber} id={`${pageNumber}`}>
        <PageWrapper>
          <PageHeader
            pageNumber={pageNumber}
            logo={`involve-${reportType}-logo-small.png`}
            logoWidth={reportType === 'leader' ? 166 : 174}
          />

          {/* Title */}
          <div
            className="page-title"
            style={{
              marginTop: '70px',
              textTransform: 'uppercase',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 600,
              fontSize: REPORT_TYPOGRAPHY.pageTitle.large,
              lineHeight: '50px', /* Increased to create space for descenders */
              letterSpacing: '-2px',
              display: 'inline-block',
              borderBottom: `4px solid ${REPORT_COLORS.textPrimary}`,
              marginLeft: `-${REPORT_SPACING.pagePaddingLeft}px`,
              paddingLeft: `${REPORT_SPACING.pagePaddingLeft}px`,
              paddingBottom: '8px', /* Space between text and underline */
            }}
          >
            Read Me First
          </div>

          {/* Sub-title */}
          <div
            className="page-subtitle"
            style={{
              textTransform: 'uppercase',
              marginTop: '5px',
              fontSize: '24px',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            <Image
              src="/images/reports/triangle-orange-large.png"
              alt=""
              width={20}
              height={20}
              style={{
                marginLeft: '0px',
                marginRight: '15px',
                marginTop: '0px',
                display: 'inline-block',
              }}
            />
            <span>
              Your Guide to {reportData.assessment_title}
              <span style={{ display: 'block', fontSize: '14px', fontStyle: 'italic', marginTop: '5px' }}>
                Seriously, read this. There is some really good stuff here.
              </span>
            </span>
          </div>

          {/* Content */}
          <div
            className="page-content leader-info"
            style={{
              letterSpacing: '0.5px',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: REPORT_TYPOGRAPHY.leaderInfo.fontSize,
              lineHeight: REPORT_TYPOGRAPHY.leaderInfo.lineHeight,
              margin: '20px 0 40px',
            }}
          >
            <p style={{ fontSize: '16px' }}>
              {reportData.assessment_title} is a diagnostic inventory that examines theoretically grounded <strong>and</strong> analytically documented drivers of leadership effectiveness.
            </p>
            {!isBlocker && (
              <>
                <p style={{ fontSize: '16px' }}>
                  There are two distinct, but complementary over-riding dimensions that constitute the Involved-Leader: (1) Involving-Stakeholders and (2) Involving-Self. Involved leaders not only need to be involving their team and other important stakeholders, but also themselves. Most leaders tend to focus on one or the other – don&apos;t, <strong>you must focus on both</strong>.
                </p>
                <p style={{ fontSize: '16px' }}>
                  Of course, there is overlap between these factors; they do not operate in absence of each other, but usually they are more directed to one focal point than the other (hence the names). They work in tandem and over thousands of leaders, we have found this distinction is highly effective for action planning as you work to improve your leadership effectiveness (and that of your team & organization).
                </p>
                <p style={{ fontSize: '16px' }}>
                  Each Primary Dimension has 5 sub-dimensions and within these subdimensions can be found &apos;leadership magic&apos;.
                </p>
              </>
            )}
            {isBlocker && (
              <>
                <p style={{ fontSize: '16px' }}>
                  Blockers are behaviors and mindsets that prevent leaders from being effective. This report identifies areas where you may be blocking your own success and the success of your team.
                </p>
                <p style={{ fontSize: '16px' }}>
                  Higher scores in blocker dimensions indicate areas that need attention. Unlike leadership dimensions where higher is better, in blocker dimensions, lower scores are preferable.
                </p>
              </>
            )}
          </div>

          <PageFooter pageNumber={pageNumber} />
        </PageWrapper>
      </PageContainer>

      {/* Scores Summary Page */}
      <PageContainer pageNumber={pageNumber} id={`${pageNumber}`}>
        <PageWrapper>
          <PageHeader
            pageNumber={pageNumber}
            logo={`involve-${reportType}-logo-small.png`}
            logoWidth={reportType === 'leader' ? 166 : 174}
          />

          {/* Title */}
          <div
            className="page-title alt2"
            style={{
              fontSize: REPORT_TYPOGRAPHY.pageTitle.small,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              letterSpacing: 0,
              marginTop: '80px',
            }}
          >
            Scores<br />
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 600, fontSize: '70px' }}>Summary</span>
          </div>

          {/* Content */}
          <div
            className="page-content"
            style={{
              letterSpacing: '0.5px',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: REPORT_TYPOGRAPHY.body.fontSize,
              lineHeight: REPORT_TYPOGRAPHY.body.lineHeight,
              margin: '20px 0 40px',
            }}
          >
            <div
              className="leader-summary-charts"
              style={{
                marginTop: '40px',
              }}
            >
              {reportData.dimensions.map((dimension, idx) => {
                const flagged = isFlagged(
                  dimension.target_score,
                  dimension.industry_benchmark,
                  dimension.geonorm
                )

                return (
                  <div
                    key={dimension.dimension_id}
                    style={{
                      marginBottom: idx < reportData.dimensions.length - 1 ? '40px' : '0',
                    }}
                  >
                    <ComparisonChart
                      yourScore={dimension.target_score}
                      groupAverage={dimension.geonorm || undefined}
                      benchmark={dimension.industry_benchmark || undefined}
                      dimensionName={dimension.dimension_name}
                      yourScoreFlagged={flagged}
                      maxValue={5}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <PageFooter pageNumber={pageNumber} />
        </PageWrapper>
      </PageContainer>

      {/* For Each Dimension */}
      {reportData.dimensions.map((dimension, dimIdx) => {
        const dimensionPage = pageNumber++
        const flagged = isFlagged(
          dimension.target_score,
          dimension.industry_benchmark,
          dimension.geonorm
        )

        return (
          <div key={dimension.dimension_id}>
            {/* Overall Score Page for Dimension */}
            <PageContainer pageNumber={dimensionPage} id={`${dimensionPage}`}>
              <PageWrapper>
                <PageHeader
                  pageNumber={dimensionPage}
                  logo={`involve-${reportType}-logo-small.png`}
                  logoWidth={reportType === 'leader' ? 166 : 174}
                />

                {/* Title */}
                <div
                  className="page-title alt"
                  style={{
                    marginTop: '70px',
                    textTransform: 'uppercase',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontWeight: 600,
                    fontSize: REPORT_TYPOGRAPHY.pageTitle.medium,
                    lineHeight: '50px', /* Increased to create space for descenders */
                    letterSpacing: '-2px',
                    display: 'inline-block',
                    borderBottom: `4px solid ${REPORT_COLORS.textPrimary}`,
                    marginLeft: `-${REPORT_SPACING.pagePaddingLeft}px`,
                    paddingLeft: `${REPORT_SPACING.pagePaddingLeft}px`,
                    paddingBottom: '8px', /* Space between text and underline */
                  }}
                >
                  <span
                    className="subtitle"
                    style={{
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: '24px',
                      letterSpacing: 0,
                      lineHeight: '23px',
                      marginLeft: 0,
                      display: 'block',
                    }}
                  >
                    <Image
                      src="/images/reports/triangle.png"
                      alt=""
                      width={15}
                      height={18}
                      style={{
                        position: 'relative',
                        top: '3px',
                        marginRight: '15px',
                        display: 'inline-block',
                      }}
                    />
                    Dimension:
                  </span>
                  <span style={{ display: 'block', marginLeft: '35px' }}>
                    {dimension.dimension_name}
                  </span>
                </div>

                {/* Content */}
                <div
                  className="page-content"
                  style={{
                    letterSpacing: '0.5px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: REPORT_TYPOGRAPHY.body.fontSize,
                    lineHeight: REPORT_TYPOGRAPHY.body.lineHeight,
                    margin: '20px 0 40px',
                  }}
                >
                  {dimension.definition && <p>{dimension.definition}</p>}

                  <ComparisonChart
                    yourScore={dimension.target_score}
                    groupAverage={dimension.geonorm || undefined}
                    benchmark={dimension.industry_benchmark || undefined}
                    dimensionName={dimension.dimension_name}
                    yourScoreFlagged={flagged}
                    maxValue={5}
                  />
                </div>

                <PageFooter pageNumber={dimensionPage} />
              </PageWrapper>
            </PageContainer>

            {/* Feedback Page for Dimension */}
            {dimension.specific_feedback && (
              <PageContainer pageNumber={pageNumber} id={`${pageNumber}`}>
                <PageWrapper>
                  <PageHeader
                    pageNumber={pageNumber}
                    logo={`involve-${reportType}-logo-small.png`}
                    logoWidth={reportType === 'leader' ? 166 : 174}
                  />

                  {/* Title */}
                  <div
                    className="page-title alt2"
                    style={{
                      fontSize: REPORT_TYPOGRAPHY.pageTitle.small,
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      letterSpacing: 0,
                      marginTop: '80px',
                    }}
                  >
                    Developmental<br />
                    <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 600, fontSize: '70px' }}>Feedback</span>
                  </div>

                  {/* Sub-title */}
                  <div
                    className="page-subtitle"
                    style={{
                      textTransform: 'uppercase',
                      marginTop: '5px',
                      fontSize: '24px',
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    }}
                  >
                    <Image
                      src="/images/reports/triangle-orange-large.png"
                      alt=""
                      width={20}
                      height={20}
                      style={{
                        marginLeft: '0px',
                        marginRight: '15px',
                        marginTop: '0px',
                        display: 'inline-block',
                      }}
                    />
                    For: <span style={{ fontWeight: 600 }}>{dimension.dimension_name}</span>
                  </div>

                  {/* Content */}
                  <div
                    className="page-content"
                    style={{
                      letterSpacing: '0.5px',
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: REPORT_TYPOGRAPHY.body.fontSize,
                      lineHeight: REPORT_TYPOGRAPHY.body.lineHeight,
                      margin: '20px 0 40px',
                    }}
                  >
                    <div className="feedbacks" style={{ marginTop: '70px' }}>
                      {dimension.overall_feedback && (
                        <FeedbackSection
                          number="01"
                          title="Overall Feedback"
                          content={dimension.overall_feedback}
                          type="overall"
                        />
                      )}
                      {dimension.specific_feedback && (
                        <FeedbackSection
                          number={dimension.overall_feedback ? "02" : "01"}
                          title="Actionable Feedback"
                          content={dimension.specific_feedback}
                          type="actionable"
                        />
                      )}
                      <FeedbackSection
                        number={
                          dimension.overall_feedback && dimension.specific_feedback
                            ? "03"
                            : dimension.overall_feedback || dimension.specific_feedback
                            ? "02"
                            : "01"
                        }
                        title="Your Thoughts For Action Planning"
                        type="thoughts"
                      />
                    </div>
                  </div>

                  <PageFooter pageNumber={pageNumber} />
                </PageWrapper>
              </PageContainer>
            )}
          </div>
        )
      })}
    </div>
  )
}
