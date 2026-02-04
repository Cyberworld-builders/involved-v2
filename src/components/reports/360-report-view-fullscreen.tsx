'use client'

/**
 * Full-screen 360 report view matching legacy branding and layout
 * Matches legacy 360.blade.php structure exactly
 */

import { REPORT_TYPOGRAPHY, REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'
import PageContainer from './layout/page-container'
import PageWrapper from './layout/page-wrapper'
import PageHeader from './layout/page-header'
import PageFooter from './layout/page-footer'
import CoverPage from './sections/cover-page'
import HorizontalBarChart from './charts/horizontal-bar-chart'
import ScoreDisplay from './charts/score-display'
import FeedbackSection from './sections/feedback-section'
import Image from 'next/image'
import type { DimensionReport360, Report360Data } from '@/lib/reports/types'
import { getReportDebug } from '@/lib/reports/report-debug'

interface Report360ViewFullscreenProps {
  reportData: Report360Data
}

export default function Report360ViewFullscreen({ reportData }: Report360ViewFullscreenProps) {
  if (getReportDebug()) {
    const r = reportData as unknown as Record<string, unknown>
    console.log('[Report Debug] view received', {
      component: '360-fullscreen',
      reportDataKeys: Object.keys(r),
      dimensionsLength: r.dimensions != null && Array.isArray(r.dimensions) ? r.dimensions.length : undefined,
      partial: r.partial,
      overall_score: r.overall_score,
    })
    console.log('[Report Debug] full reportData for view', reportData)
  }

  let pageNumber = 1

  // Transform dimension data to match legacy structure for charts
  const transformDimensionForChart = (dim: DimensionReport360) => {
    const scores: Array<{ label: string; score: number; flagged?: boolean }> = []
    
    // Add "All Raters" as the first bar (overall score)
    const allRatersScore = dim.rater_breakdown.all_raters ?? dim.overall_score
    if (allRatersScore !== null) {
      const flagged = 
        (dim.industry_benchmark !== null && allRatersScore <= (dim.industry_benchmark - 0.49)) ||
        (dim.geonorm !== null && allRatersScore <= (dim.geonorm - 0.49))
      
      scores.push({ label: 'All Raters', score: allRatersScore, flagged })
    }
    
    // Add individual rater categories
    const categories = [
      { key: 'peer', label: 'Peer' },
      { key: 'direct_report', label: 'Direct Report' },
      { key: 'supervisor', label: 'Supervisor' },
      { key: 'self', label: 'Self' },
      { key: 'other', label: 'Other' },
    ]
    
    categories.forEach(({ key, label }) => {
      const score = dim.rater_breakdown[key as keyof typeof dim.rater_breakdown]
      if (score !== null) {
        // Calculate if flagged (below benchmark or geonorm by 0.49+)
        const flagged = 
          (dim.industry_benchmark !== null && score <= (dim.industry_benchmark - 0.49)) ||
          (dim.geonorm !== null && score <= (dim.geonorm - 0.49))
        
        scores.push({ label, score, flagged })
      }
    })
    
    return scores
  }

  // Organize feedback by rater type
  const organizeFeedback = (dim: DimensionReport360) => {
    // Use feedback organized by rater type if available, otherwise fall back to text_feedback
    if (dim.feedback) {
      return dim.feedback
    }
    // Fallback: put all feedback in Others category
    return {
      Self: [] as string[],
      'Direct Report': [] as string[],
      Others: dim.text_feedback || [],
    }
  }

  const showPartialBanner = reportData.partial === true && reportData.participant_response_summary
  const noResponsesYet = reportData.dimensions.length === 0 || (reportData.participant_response_summary?.completed === 0)

  return (
    <div
      style={{ backgroundColor: REPORT_COLORS.white }}
      data-report-pages={String(pageNumber + (reportData.dimensions.length > 0 ? reportData.dimensions.length * 2 : 1))}
      suppressHydrationWarning
    >
      {/* Cover Page */}
      <CoverPage
        assessmentTitle={reportData.assessment_title}
        userName={reportData.target_name}
        reportType="360"
        pageNumber={pageNumber++}
      />

      {/* Overview Page */}
      <PageContainer pageNumber={pageNumber} id={String(pageNumber)}>
        <PageWrapper>
          <PageHeader pageNumber={pageNumber} logo="involve-360-logo-small.png" />

          {/* Partial report banner */}
          {showPartialBanner && reportData.participant_response_summary && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '4px',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: REPORT_TYPOGRAPHY.body.fontSize,
              }}
            >
              <strong>Partial report:</strong> {reportData.participant_response_summary.completed} of {reportData.participant_response_summary.total} responses received. The report will update as more responses are completed.
            </div>
          )}

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
            {reportData.assessment_title}
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
            {noResponsesYet ? (
              <p style={{ marginTop: '24px' }}>
                No responses have been submitted yet for this 360 assessment. The report will update as responses are completed.
              </p>
            ) : (
              <>
                <p>
                  This is your {reportData.assessment_title} report. This report should be used as a critical piece of your overall leadership development{reportData.client_name ? ` at ${reportData.client_name}` : ''}.
                </p>
                <p>
                  Stakeholders (e.g., supervisor, peers, subordinates, customers) familiar with your work completed the 360-evaluation to provide you an analytically robust picture of your strengths and improvement opportunities. Additionally, each of your raters was asked to provide qualitative feedback, which can greatly augment your quantitative scores. Taken together, this report provides you a wealth of information to not only significantly develop your own leadership, but also drive critical business outcomes.
                </p>
                <p>
                  Each individual competency score is presented with corresponding rater feedback and suggestions. Your scores are compared to (1) norms for similar jobs/positions and (2) the average of your colleagues that have also recently completed the 360-feedback survey{reportData.client_name ? ` at ${reportData.client_name}` : ''}. Anchoring your scores with industry norms and your company averages provides a much more accurate representation of where your scores stand and provides enhanced motivation to accelerate your leadership involvement.
                </p>
              </>
            )}
          </div>

          <PageFooter pageNumber={pageNumber} />
        </PageWrapper>
      </PageContainer>

      {/* For Each Dimension (skip when no dimension data) */}
      {reportData.dimensions.length > 0 && reportData.dimensions.map((dimension) => {
        const dimensionPage = pageNumber++

        // Competency Scores Page
        return (
          <div key={dimension.dimension_id}>
            <PageContainer pageNumber={dimensionPage} id={`${dimensionPage}`}>
              <PageWrapper>
                <PageHeader pageNumber={dimensionPage} logo="involve-360-logo-small.png" />

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
                    Competency:
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
                  {(dimension.description || dimension.definition) && (
                    <p>{dimension.description || dimension.definition}</p>
                  )}

                  <div className="chart" style={{ width: `${REPORT_SPACING.contentWidth}px`, height: `${REPORT_SPACING.chartHeight}px`, marginTop: '20px' }}>
                    <div
                      className="title"
                      style={{
                        fontSize: '16px',
                        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                        fontWeight: 600,
                        textDecoration: 'none',
                        textAlign: 'center',
                        marginBottom: '45px',
                      }}
                    >
                      Your Current Scores By Ratee Source<br />
                      <span
                        style={{
                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                          fontStyle: 'italic',
                          fontSize: '11px',
                          color: REPORT_COLORS.textPrimary,
                          textDecoration: 'none',
                        }}
                      >
                        <Image
                          src="/images/reports/triangle-orange.png"
                          alt=""
                          width={8}
                          height={8}
                          style={{
                            marginRight: '10px',
                            maxWidth: '8px',
                            position: 'relative',
                            top: '-2px',
                            display: 'inline-block',
                          }}
                        />
                        Indicates Significant Growth Opportunity
                      </span>
                    </div>

                    {/* Score and Chart Container */}
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {/* Score Display Container - centered vertically and horizontally */}
                      <div
                        className="score-container"
                        style={{
                          width: '141px',
                          height: '230px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                      <ScoreDisplay
                        score={dimension.rater_breakdown.all_raters ?? dimension.overall_score}
                        maxValue={5}
                        label="out of 5"
                        size="large"
                      />
                      </div>

                      {/* Bar Chart */}
                      <div style={{ flex: 1, marginLeft: '0' }}>
                        <HorizontalBarChart
                          scores={transformDimensionForChart(dimension)}
                          maxValue={5}
                          showGridLines={true}
                          barHeight={40}
                          showScoreInBar={true}
                        />
                      </div>
                    </div>

                    {/* Norms Display */}
                    <div
                      className="norms"
                      style={{
                        position: 'relative',
                        width: `${REPORT_SPACING.contentWidth}px`,
                        height: '55px',
                        margin: '90px auto 0',
                        color: REPORT_COLORS.textPrimary,
                        top: '70px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0',
                      }}
                    >
                      {/* GEONORM Group - Always shown */}
                      <div
                        className="norm-group industry"
                        style={{
                          position: 'relative',
                          width: '280px',
                          height: '55px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          className="norm"
                          style={{
                            width: '80px',
                            position: 'relative',
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            fontSize: '34px',
                            letterSpacing: '-1px',
                            marginTop: '3px',
                            flexShrink: 0,
                          }}
                        >
                          {dimension.industry_benchmark != null 
                            ? (dimension.industry_benchmark ?? 0).toFixed(2)
                            : '0.00'}
                        </div>
                        <div
                          className="norm-label"
                          style={{
                            width: '180px',
                            marginLeft: '15px',
                            position: 'relative',
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            lineHeight: '14px',
                            flexShrink: 0,
                          }}
                        >
                          GEONORM for<br />
                          <span style={{ fontWeight: 600 }}>
                            {dimension.industry_benchmark !== null ? 'Industry' : 'NO INDUSTRY SET'}
                          </span>
                        </div>
                      </div>

                      {/* Group Norm - Always shown if geonorm exists */}
                      {dimension.geonorm !== null && (
                        <div
                          className="norm-group group"
                          style={{
                            width: '250px',
                            borderLeft: `2px solid ${REPORT_COLORS.lightGray}`,
                            position: 'relative',
                            height: '55px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '20px',
                          }}
                        >
                          <div
                            className="norm"
                            style={{
                              width: '80px',
                              position: 'relative',
                              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                              fontSize: '34px',
                              letterSpacing: '-1px',
                              marginTop: '3px',
                              flexShrink: 0,
                            }}
                          >
                            {(dimension.geonorm ?? 0).toFixed(2)}
                          </div>
                          <div
                            className="norm-label"
                            style={{
                              width: '130px',
                              marginLeft: '15px',
                              position: 'relative',
                              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              lineHeight: '14px',
                              flexShrink: 0,
                            }}
                          >
                            Avg Score<br />
                            <span style={{ fontWeight: 600 }}>For This Group</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <PageFooter pageNumber={dimensionPage} />
              </PageWrapper>
            </PageContainer>

            {/* Feedback Page */}
            {(() => {
              const feedbackPage = pageNumber++
              const feedback = organizeFeedback(dimension)
              const hasFeedback = feedback.Self.length > 0 || feedback['Direct Report'].length > 0 || feedback.Others.length > 0

              if (!hasFeedback) return null

              return (
                <PageContainer pageNumber={feedbackPage} id={`${feedbackPage}`}>
                  <PageWrapper>
                    <PageHeader pageNumber={feedbackPage} logo="involve-360-logo-small.png" />

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
                        {feedback.Self.length > 0 && (
                          <FeedbackSection
                            number="01"
                            title="Self"
                            content={feedback.Self.join('<p></p>')}
                            type="overall"
                          />
                        )}
                        {feedback['Direct Report'].length > 0 && (
                          <FeedbackSection
                            number={feedback.Self.length > 0 ? '02' : '01'}
                            title="Direct Report"
                            content={feedback['Direct Report'].join('<p></p>')}
                            type="overall"
                          />
                        )}
                        {feedback.Others.length > 0 && (
                          <FeedbackSection
                            number={feedback.Self.length > 0 && feedback['Direct Report'].length > 0 ? '03' : feedback.Self.length > 0 || feedback['Direct Report'].length > 0 ? '02' : '01'}
                            title="Others"
                            content={feedback.Others.join('<p></p>')}
                            type="overall"
                          />
                        )}
                      </div>
                    </div>

                    <PageFooter pageNumber={feedbackPage} />
                  </PageWrapper>
                </PageContainer>
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}
