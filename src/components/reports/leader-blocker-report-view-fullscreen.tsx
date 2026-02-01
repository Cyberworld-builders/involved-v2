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

interface SubdimensionReport {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  target_score: number
  industry_benchmark: number | null
  geonorm: number | null
  improvement_needed: boolean
  group_score?: number | null
  specific_feedback: string | null
  specific_feedback_id: string | null
  overall_feedback?: string | null
}

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
  group_score?: number | null
  definition?: string
  subdimensions?: SubdimensionReport[]
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

  // Calculate page numbers dynamically based on report structure
  const calculatePageNumbers = () => {
    let currentPage = 1 // Cover
    currentPage++ // TOC
    currentPage++ // Read Me First
    
    if (!isBlocker) {
      // Leaders: Subdimensions Overview
      currentPage++
      // Overview Info
      currentPage++
      // Overview Info Continued
      currentPage++
      // Scores Summary
      const scoresSummaryPage = currentPage++
      
      // Calculate pages for dimensions
      const dimensionPages: Array<{ 
        dimension: DimensionReport
        overallPage: number
        subdimensionPages: Array<{ 
          subdim: SubdimensionReport
          page: number
        }>
      }> = []
      
      for (const dimension of reportData.dimensions) {
        const overallPage = currentPage++
        const subdimensionPages: Array<{ subdim: SubdimensionReport; page: number }> = []
        
        if (dimension.subdimensions && dimension.subdimensions.length > 0) {
          for (const subdim of dimension.subdimensions) {
            const subdimPage = currentPage++
            subdimensionPages.push({ subdim, page: subdimPage })
          }
        }
        
        dimensionPages.push({ dimension, overallPage, subdimensionPages })
      }
      
      return {
        cover: 1,
        toc: 2,
        readMeFirst: 3,
        subdimensionsOverview: 4,
        overviewInfo: 5,
        overviewInfoContinued: 6,
        scoresSummary: scoresSummaryPage,
        dimensionPages,
      }
    } else {
      // Blockers: Overview Info
      currentPage++
      // Overall Blocker Score
      const overallBlockerPage = currentPage++
      
      // Calculate pages for dimensions
      const dimensionPages: Array<{ 
        dimension: DimensionReport
        page: number
        feedbackPage?: number
      }> = []
      
      for (const dimension of reportData.dimensions) {
        const page = currentPage++
        const feedbackPage = dimension.specific_feedback ? currentPage++ : undefined
        dimensionPages.push({ dimension, page, feedbackPage })
      }
      
      return {
        cover: 1,
        toc: 2,
        readMeFirst: 3,
        overviewInfo: 4,
        overallBlockerScore: overallBlockerPage,
        dimensionPages,
      }
    }
  }

  const pageNumbers = calculatePageNumbers()

  // Build table of contents
  const buildTOC = () => {
    if (!isBlocker) {
      // Leaders TOC
      const sections: Array<{ title: string; page: number; subSections?: Array<{ title: string; page: number }> }> = [
        { title: 'Read Me First', page: pageNumbers.readMeFirst },
        { title: 'Summary of Scores', page: (pageNumbers as { scoresSummary: number }).scoresSummary },
        {
          title: 'Dimension Scores With Feedback:',
          page: 0,
          subSections: (pageNumbers.dimensionPages as Array<{ dimension: DimensionReport; overallPage: number; subdimensionPages: Array<{ subdim: SubdimensionReport; page: number }> }>).flatMap((dp) => {
            const subsections: Array<{ title: string; page: number }> = []
            subsections.push({ title: dp.dimension.dimension_name, page: dp.overallPage })
            if (dp.subdimensionPages && dp.subdimensionPages.length > 0) {
              dp.subdimensionPages.forEach((sp) => {
                subsections.push({ title: sp.subdim.dimension_name, page: sp.page })
              })
            }
            return subsections
          }),
        },
      ]
      return sections
    } else {
      // Blockers TOC
      const sections: Array<{ title: string; page: number; subSections?: Array<{ title: string; page: number }> }> = [
        { title: 'Read Me First', page: pageNumbers.readMeFirst },
        { 
          title: 'Summary of Scores', 
          page: isBlocker 
            ? (pageNumbers as { overallBlockerScore: number }).overallBlockerScore 
            : (pageNumbers as { scoresSummary: number }).scoresSummary 
        },
        {
          title: 'Involved-Blockers Dimensions:',
          page: 0,
          subSections: (pageNumbers.dimensionPages as Array<{ dimension: DimensionReport; page: number }>).map((dp) => ({
            title: dp.dimension.dimension_name,
            page: dp.page,
          })),
        },
      ]
      return sections
    }
  }

  // Check if score is flagged (for blockers, higher is worse; for leaders, lower is worse)
  const isFlagged = (score: number, benchmark: number | null, geonorm: number | null, groupScore?: number | null) => {
    if (isBlocker) {
      // For blockers: flagged if score is significantly ABOVE benchmark/geonorm
      return (
        (benchmark !== null && score >= (benchmark + 0.49)) ||
        (geonorm !== null && score >= (geonorm + 0.49))
      )
    } else {
      // For leaders: flagged if score is significantly BELOW benchmark/geonorm/group average
      return (
        (benchmark !== null && score <= (benchmark - 0.49)) ||
        (geonorm !== null && score <= (geonorm - 0.49)) ||
        (groupScore !== null && groupScore !== undefined && score < (groupScore - 0.49))
      )
    }
  }

  // Calculate expected page count dynamically
  const calculateExpectedPages = () => {
    let pages = 1 // Cover
    pages++ // TOC
    pages++ // Read Me First
    
    if (!isBlocker) {
      pages++ // Subdimensions Overview
      pages++ // Overview Info
      pages++ // Overview Info Continued
      pages++ // Scores Summary
      
      // For each parent dimension: overall page + subdimension pages + feedback pages
      for (const dimension of reportData.dimensions) {
        pages++ // Parent dimension overall page
        if (dimension.subdimensions) {
          for (const _subdim of dimension.subdimensions) {
            pages++ // Subdimension page (feedback is on same page)
          }
        }
      }
    } else {
      pages++ // Overview Info
      pages++ // Overall Blocker Score
      
      // For each dimension: page + feedback page
      for (const dimension of reportData.dimensions) {
        pages++ // Dimension page
        if (dimension.specific_feedback) {
          pages++ // Feedback page
        }
      }
    }
    
    return pages
  }
  
  const expectedPages = calculateExpectedPages()
  
  return (
    <div style={{ backgroundColor: REPORT_COLORS.white }} data-report-pages={`${expectedPages}`}>
      {/* Cover Page */}
      <CoverPage
        assessmentTitle={reportData.assessment_title}
        userName={reportData.user_name}
        reportType={reportType}
        pageNumber={pageNumbers.cover}
      />

      {/* Table of Contents */}
      <PageContainer pageNumber={pageNumbers.toc} id={`${pageNumbers.toc}`}>
        <PageWrapper>
          <PageHeader
            pageNumber={pageNumbers.toc}
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

          <PageFooter pageNumber={pageNumbers.toc} />
        </PageWrapper>
      </PageContainer>

      {/* Read Me First Page */}
      <PageContainer pageNumber={pageNumbers.readMeFirst} id={`${pageNumbers.readMeFirst}`}>
        <PageWrapper>
          <PageHeader
            pageNumber={pageNumbers.readMeFirst}
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

          <PageFooter pageNumber={pageNumbers.readMeFirst} />
        </PageWrapper>
      </PageContainer>

      {/* Subdimensions Overview Page (Leaders only) */}
      {!isBlocker && (
        <PageContainer pageNumber={(pageNumbers as { subdimensionsOverview: number }).subdimensionsOverview} id={`${(pageNumbers as { subdimensionsOverview: number }).subdimensionsOverview}`}>
          <PageWrapper>
            <PageHeader
              pageNumber={(pageNumbers as { subdimensionsOverview: number }).subdimensionsOverview}
              logo={`involve-${reportType}-logo-small.png`}
              logoWidth={166}
            />

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
              <p style={{ fontSize: '18px', marginTop: '70px', marginBottom: '20px' }}>
                <strong>Sub-dimensions are defined as:</strong>
              </p>

              {reportData.dimensions.map((dimension) => (
                <div
                  key={dimension.dimension_id}
                  style={{
                    marginBottom: '30px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: '16px',
                      fontWeight: 600,
                      marginBottom: '10px',
                    }}
                  >
                    Dimension: {dimension.dimension_name}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      marginBottom: '10px',
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ width: '200px' }}>Sub-Dimensions:</div>
                    <div style={{ flex: 1 }}>Description</div>
                  </div>

                  {dimension.subdimensions && dimension.subdimensions.map((subdim) => (
                    <div
                      key={subdim.dimension_id}
                      style={{
                        marginBottom: '15px',
                        display: 'flex',
                      }}
                    >
                      <div
                        style={{
                          width: '200px',
                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {subdim.dimension_name}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                          fontSize: '14px',
                          lineHeight: '20px',
                        }}
                      >
                        {/* Definition would come from dimension metadata if available */}
                        No definition available
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <PageFooter pageNumber={(pageNumbers as { subdimensionsOverview: number }).subdimensionsOverview} />
          </PageWrapper>
        </PageContainer>
      )}

      {/* Overview Info Page */}
      <PageContainer pageNumber={(pageNumbers as { overviewInfo: number }).overviewInfo} id={`${(pageNumbers as { overviewInfo: number }).overviewInfo}`}>
          <PageWrapper>
            <PageHeader
              pageNumber={(pageNumbers as { overviewInfo: number }).overviewInfo}
            logo={`involve-${reportType}-logo-small.png`}
            logoWidth={reportType === 'leader' ? 166 : 174}
          />

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
            <p className="big" style={{ marginTop: '70px', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              <strong>Scores</strong>
            </p>
            {!isBlocker ? (
              <>
                <p>
                  Below, we provide a snapshot of your scores. Your scores are compared with industry averages for highly involved leaders in similar jobs and the averages for others in your organization (if there were others that participated in the assessment).
                </p>
                <p>
                  <Image
                    src="/images/reports/triangle-orange.png"
                    alt=""
                    width={13}
                    height={13}
                    style={{ marginRight: '5px', verticalAlign: 'middle' }}
                  />
                  indicates that a score is significantly below either the industry average for highly involved leaders and/or your organizational average (i.e., you need to work on those dimensions ASAP).
                </p>
              </>
            ) : (
              <>
                <p>
                  Presented herein are your scores and <strong><u>you WANT to have LOW scores</u></strong>. First presented is your overall Blocker score and then each dimension score is presented with actionable feedback.
                </p>
                <p>
                  We present your score with industry benchmarks to show you where you might stand relative to others in similar jobs. We also present your organization&apos;s or group&apos;s average for a comparison relative to your colleagues. These are benchmarks to help you anchor your own score and alert you to where you should focus first.
                </p>
                <p>
                  <Image
                    src="/images/reports/triangle-orange.png"
                    alt=""
                    width={13}
                    height={13}
                    style={{ marginRight: '5px', verticalAlign: 'middle' }}
                  />
                  indicates that a score is significantly HIGHER than either the industry average and/or your organizational/group average (i.e., you need to work on those dimensions ASAP). In other words – those blockers are giving you more problems than other people.
                </p>
              </>
            )}
            {!isBlocker && (
              <>
                <p className="big" style={{ fontSize: '18px', fontWeight: 600, marginTop: '30px', marginBottom: '20px' }}>
                  <strong>A Primer For Your Scores</strong>
                </p>
                <p>
                  A majority of people stress-out when they receive &apos;evaluations&apos;. Forget about it. This is developmental feedback and can be some serious rocket-fuel in helping you achieve leadership heights most think unobtainable. You might get upset with some of your scores – it&apos;s understandable – but relax, think through what is being conveyed, then work to improve. And if you get great scores – fantastic – but you still need to work on your involved-leadership to be ready for a promotion or new job with a new team (and prevent stagnation).
                </p>
                <p>
                  Involved-leadership is something you always need to be working on – it is not a goal that once achieved stays in place. If you ignore it, you will regress thereby hurting yourself, your team, and your organization. This is one of the reasons we provide actionable feedback to everyone – regardless of their scores.
                </p>
              </>
            )}
          </div>

          <PageFooter pageNumber={(pageNumbers as { overviewInfo: number }).overviewInfo} />
        </PageWrapper>
      </PageContainer>

      {/* Overview Info Continued (Leaders only) */}
      {!isBlocker && (
        <PageContainer pageNumber={(pageNumbers as { overviewInfoContinued: number }).overviewInfoContinued} id={`${(pageNumbers as { overviewInfoContinued: number }).overviewInfoContinued}`}>
          <PageWrapper>
            <PageHeader
              pageNumber={(pageNumbers as { overviewInfoContinued: number }).overviewInfoContinued}
              logo={`involve-${reportType}-logo-small.png`}
              logoWidth={166}
            />

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
              <p className="big" style={{ marginTop: '70px', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                <strong>Actionable Feedback</strong>
              </p>
              <p>
                A key aspect of involved leadership is to get you engaged with engaging your employees. While reflecting on this statement and this feedback report, think about what you can do to better involve your employees and yourself. To that end, after each sub-dimension scores, we provide tried and true feedback that will most definitely allow you to begin taking action. Use these pieces of feedback to kick-start your Involved-Leadership planning. These are merely our suggestions. You do not necessarily need to use any of these but instead can reflect on what could work for your specific situation. We have even included space to jot down some of these thoughts after each dimension.
              </p>
            </div>

            <PageFooter pageNumber={(pageNumbers as { overviewInfoContinued: number }).overviewInfoContinued} />
          </PageWrapper>
        </PageContainer>
      )}

      {/* Overall Blocker Score Page (Blockers only) */}
      {isBlocker && (
        <PageContainer pageNumber={(pageNumbers as { overallBlockerScore: number }).overallBlockerScore} id={`${(pageNumbers as { overallBlockerScore: number }).overallBlockerScore}`}>
          <PageWrapper>
            <PageHeader
              pageNumber={(pageNumbers as { overallBlockerScore: number }).overallBlockerScore}
              logo={`involve-${reportType}-logo-small.png`}
              logoWidth={174}
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
              <div className="chart blocker-overall-score-chart" style={{ marginTop: '160px' }}>
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
                  Overall Scores for Involved-Blockers<br />
                  <span>
                    <Image
                      src="/images/reports/triangle-orange.png"
                      alt=""
                      width={13}
                      height={13}
                      style={{ marginRight: '5px', verticalAlign: 'middle' }}
                    />
                    Indicates Significant Growth Opportunity
                  </span>
                </div>

                <div
                  className="score"
                  style={{
                    width: '141px',
                    height: '230px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    float: 'left',
                    marginRight: '20px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      width: '141px',
                      fontSize: '91px',
                      lineHeight: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ display: 'block' }}>{reportData.overall_score.toFixed(1)}</span>
                    <span style={{ fontSize: '16px', display: 'block', textAlign: 'center', marginTop: '8px' }}>
                      out of 5
                    </span>
                  </div>
                </div>

                {(() => {
                  const dimCount = reportData.dimensions.length
                  const gapBelowBars = 32
                  const lineExtension = 24
                  const graphHeight = Math.max(190, dimCount * 52 + gapBelowBars + lineExtension + 28)
                  const barsHeight = dimCount * 52 + gapBelowBars + lineExtension + 18
                  return (
                <div className="bars" style={{ width: '563px', height: `${barsHeight}px`, float: 'left' }}>
                  <div className="graph" style={{ position: 'relative', width: '563px', height: `${graphHeight}px`, overflow: 'visible' }}>
                    <div
                      className="graph-lines"
                      style={{
                        position: 'absolute',
                        width: '422px',
                        height: `${graphHeight}px`,
                        left: '135px',
                        top: -lineExtension,
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5].map((value) => (
                        <div
                          key={value}
                          className="line"
                          style={{
                            position: 'absolute',
                            width: '2px',
                            height: 0,
                            left: `${(value / 5) * 100}%`,
                            top: 0,
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            fontSize: '12px',
                            color: REPORT_COLORS.textPrimary,
                            textIndent: '-2px',
                            paddingTop: `${dimCount * 52 + gapBelowBars + lineExtension}px`,
                          }}
                        >
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>

                    {reportData.dimensions.map((dimension, _idx) => {
                      const flagged = isFlagged(
                        dimension.target_score,
                        dimension.industry_benchmark,
                        dimension.geonorm,
                        dimension.group_score
                      )
                      const percent = (dimension.target_score / 5) * 100

                      return (
                        <div
                          key={dimension.dimension_id}
                          className="graph-row"
                          style={{
                            position: 'relative',
                            width: '563px',
                            height: '40px',
                            marginBottom: '12px',
                            display: 'block',
                          }}
                        >
                          <div
                            className="ratee"
                            style={{
                              position: 'absolute',
                              width: '135px',
                              left: '-10px',
                              top: '10px',
                              textAlign: 'right',
                              color: REPORT_COLORS.textPrimary,
                              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                              fontSize: '14px',
                              marginRight: '10px',
                            }}
                          >
                            {dimension.dimension_name}
                          </div>

                          <div
                            className="bar"
                            style={{
                              position: 'absolute',
                              width: '422px',
                              left: '135px',
                              top: 0,
                              height: '40px',
                            }}
                          >
                            <div
                              className={`inner ${flagged ? 'flagged' : ''}`}
                              style={{
                                position: 'relative',
                                width: `${Math.max(percent, 14)}%`,
                                minWidth: '56px',
                                height: '20px',
                                background: REPORT_COLORS.darkBlue,
                                color: REPORT_COLORS.white,
                                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                fontSize: '14px',
                                textAlign: 'right',
                                padding: '4px 10px 8px',
                                margin: '6px 0',
                              }}
                            >
                              {dimension.target_score.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                  )
                })()}

                <div style={{ clear: 'both' }}></div>
              </div>
            </div>

            <PageFooter pageNumber={(pageNumbers as { overallBlockerScore: number }).overallBlockerScore} />
          </PageWrapper>
        </PageContainer>
      )}

      {/* Scores Summary Page (Leaders only) */}
      {!isBlocker && (
        <PageContainer pageNumber={(pageNumbers as { scoresSummary: number }).scoresSummary} id={`${(pageNumbers as { scoresSummary: number }).scoresSummary}`}>
          <PageWrapper>
            <PageHeader
              pageNumber={(pageNumbers as { scoresSummary: number }).scoresSummary}
              logo={`involve-${reportType}-logo-small.png`}
              logoWidth={166}
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
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                {reportData.dimensions.map((dimension, idx) => {
                  const _flagged = isFlagged(
                    dimension.target_score,
                    dimension.industry_benchmark,
                    dimension.geonorm,
                    dimension.group_score
                  )
                  const subdimCount = dimension.subdimensions?.length ?? 0
                  const gapBelowBars = 32
                  const lineExtension = 24
                  const graphHeight = Math.max(190, subdimCount * 52 + gapBelowBars + lineExtension + 28)
                  const barsHeight = subdimCount * 52 + gapBelowBars + lineExtension + 18

                  return (
                    <div
                      key={dimension.dimension_id}
                      className="chart leader-summary-chart"
                      style={{
                        width: '48%',
                        minWidth: '400px',
                        flex: '1 1 400px',
                        maxWidth: '563px',
                        marginTop: '20px',
                        marginBottom: idx < reportData.dimensions.length - 1 ? '40px' : '0',
                      }}
                    >
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
                        {dimension.dimension_name}
                      </div>

                      <div
                        className="score"
                        style={{
                          width: '141px',
                          height: `${barsHeight}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          float: 'left',
                          marginRight: '20px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            width: '141px',
                            fontSize: '91px',
                            lineHeight: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ display: 'block' }}>{dimension.target_score.toFixed(1)}</span>
                          <span style={{ fontSize: '16px', display: 'block', textAlign: 'center', marginTop: '8px' }}>
                            <span style={{ display: 'block' }}>Overall Score</span>
                            <span style={{ display: 'block' }}>Out of 5</span>
                          </span>
                        </div>
                      </div>

                      <div className="bars" style={{ width: '563px', height: `${barsHeight}px`, float: 'left' }}>
                        <div className="graph" style={{ position: 'relative', width: '100%', height: `${graphHeight}px`, overflow: 'visible' }}>
                          <div
                            className="graph-lines"
                            style={{
                              position: 'absolute',
                              width: '422px',
                              height: `${graphHeight}px`,
                              left: '135px',
                              top: -lineExtension,
                            }}
                          >
                            {[0, 1, 2, 3, 4, 5].map((value) => (
                              <div
                                key={value}
                                className="line"
                                style={{
                                  position: 'absolute',
                                  width: '2px',
                                  height: 0,
                                  left: `${(value / 5) * 100}%`,
                                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                  fontSize: '12px',
                                  color: REPORT_COLORS.textPrimary,
                                  textIndent: '-2px',
                                  paddingTop: `${Math.max(220, subdimCount * 52 + gapBelowBars + lineExtension)}px`,
                                }}
                              >
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>

                          {dimension.subdimensions && dimension.subdimensions.map((subdim, _subIdx) => {
                            const subFlagged = isFlagged(
                              subdim.target_score,
                              subdim.industry_benchmark,
                              subdim.geonorm
                            )
                            const subPercent = (subdim.target_score / 5) * 100
                            const color = dimension.dimension_name === 'Involving-Stakeholders' 
                              ? REPORT_COLORS.darkBlueAlt 
                              : REPORT_COLORS.primaryBlue

                            return (
                              <div
                                key={subdim.dimension_id}
                                className="graph-row"
                                style={{
                                  position: 'relative',
                                  width: '563px',
                                  height: '40px',
                                  marginBottom: '12px',
                                  display: 'block',
                                }}
                              >
                                <div
                                  className="ratee"
                                  style={{
                                    position: 'absolute',
                                    width: '135px',
                                    left: '-10px',
                                    top: '10px',
                                    textAlign: 'right',
                                    color: REPORT_COLORS.textPrimary,
                                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                    fontSize: '14px',
                                    marginRight: '10px',
                                  }}
                                >
                                  <span>{subdim.dimension_name}</span>
                                </div>

                                <div
                                  className="bar"
                                  style={{
                                    position: 'absolute',
                                    width: '422px',
                                    left: '135px',
                                    top: 0,
                                    height: '40px',
                                  }}
                                >
                                  <div
                                    className={`inner ${subFlagged ? 'flagged' : ''}`}
                                    style={{
                                      position: 'relative',
                                      width: `${Math.max(subPercent, 14)}%`,
                                      minWidth: '56px',
                                      height: '20px',
                                      background: color,
                                      color: REPORT_COLORS.white,
                                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                      fontSize: '14px',
                                      textAlign: 'right',
                                      padding: '4px 10px 8px',
                                      margin: '6px 0',
                                    }}
                                  >
                                    {subdim.target_score.toFixed(1)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div style={{ clear: 'both' }}></div>
                    </div>
                  )
                })}
              </div>
              <div style={{ clear: 'both' }}></div>
            </div>

            <PageFooter pageNumber={(pageNumbers as { scoresSummary: number }).scoresSummary} />
          </PageWrapper>
        </PageContainer>
      )}

      {/* For Each Dimension */}
      {reportData.dimensions.map((dimension, dimIdx) => {
        if (!isBlocker) {
          // Leaders: Parent dimension overall page + subdimension pages
          const dp = (pageNumbers.dimensionPages as Array<{ dimension: DimensionReport; overallPage: number; subdimensionPages: Array<{ subdim: SubdimensionReport; page: number }> }>)[dimIdx]
          const parentFlagged = isFlagged(
            dimension.target_score,
            dimension.industry_benchmark,
            dimension.geonorm,
            dimension.group_score
          )

          return (
            <div key={dimension.dimension_id}>
              {/* Parent Dimension Overall Score Page */}
              <PageContainer pageNumber={dp.overallPage} id={`${dp.overallPage}`}>
                <PageWrapper>
                  <PageHeader
                    pageNumber={dp.overallPage}
                    logo={`involve-${reportType}-logo-small.png`}
                    logoWidth={166}
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
                      lineHeight: '50px',
                      letterSpacing: '-2px',
                      display: 'inline-block',
                      borderBottom: `4px solid ${REPORT_COLORS.textPrimary}`,
                      marginLeft: `-${REPORT_SPACING.pagePaddingLeft}px`,
                      paddingLeft: `${REPORT_SPACING.pagePaddingLeft}px`,
                      paddingBottom: '8px',
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
                      Overall Score:
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
                      fontSize: '16px',
                      lineHeight: '28px',
                      margin: '20px 0 40px',
                    }}
                  >
                    {dimension.definition && (
                      <p style={{ fontSize: '16px' }}>
                        Defined: {dimension.definition}
                      </p>
                    )}
                    <p style={{ fontSize: '16px', lineHeight: '28px' }}>
                      This is your overall score for {dimension.dimension_name} across{' '}
                      {dimension.subdimensions?.length || 0} subdimensions:{' '}
                      {dimension.subdimensions?.map(s => s.dimension_name).join(', ')}.
                    </p>
                    <p style={{ fontSize: '16px', lineHeight: '28px' }}>
                      This overall score should be treated as an overall gauge with the{' '}
                      {dimension.subdimensions?.length || 0} sub-dimensions treated as individual gears to take action on to increase your involvement with getting{' '}
                      {dimension.dimension_name === 'Involving-Stakeholders' ? 'others' : 'yourself'} involved at work.
                    </p>

                    <ComparisonChart
                      yourScore={dimension.target_score}
                      groupAverage={dimension.group_score || undefined}
                      benchmark={dimension.industry_benchmark || undefined}
                      dimensionName={dimension.dimension_name}
                      yourScoreFlagged={parentFlagged}
                      maxValue={5}
                    />
                  </div>

                  <PageFooter pageNumber={dp.overallPage} />
                </PageWrapper>
              </PageContainer>

              {/* Subdimension Pages */}
              {dp.subdimensionPages && dp.subdimensionPages.map((sp) => {
                const subdim = sp.subdim
                const subFlagged = isFlagged(
                  subdim.target_score,
                  subdim.industry_benchmark,
                  subdim.geonorm
                )

                return (
                  <div key={subdim.dimension_id}>
                    {/* Subdimension Score Page */}
                    <PageContainer pageNumber={sp.page} id={`${sp.page}`}>
                      <PageWrapper>
                        <PageHeader
                          pageNumber={sp.page}
                          logo={`involve-${reportType}-logo-small.png`}
                          logoWidth={166}
                        />

                        {/* Title */}
                        <div
                          className="page-title alt"
                          style={{
                            marginTop: '25px',
                            textTransform: 'uppercase',
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            fontWeight: 600,
                            fontSize: REPORT_TYPOGRAPHY.pageTitle.medium,
                            lineHeight: '50px',
                            letterSpacing: '-2px',
                            display: 'inline-block',
                            borderBottom: `4px solid ${REPORT_COLORS.textPrimary}`,
                            marginLeft: `-${REPORT_SPACING.pagePaddingLeft}px`,
                            paddingLeft: `${REPORT_SPACING.pagePaddingLeft}px`,
                            paddingBottom: '8px',
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
                            Sub-dimension:
                          </span>
                          <span style={{ display: 'block', marginLeft: '35px' }}>
                            {subdim.dimension_name}
                          </span>
                        </div>

                        {/* Content */}
                        <div
                          className="page-content leader-subdims"
                          style={{
                            letterSpacing: '0.5px',
                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                            fontSize: REPORT_TYPOGRAPHY.body.fontSize,
                            lineHeight: REPORT_TYPOGRAPHY.body.lineHeight,
                            margin: '20px 0 40px',
                          }}
                        >
                          {/* Definition would come from dimension metadata if available */}

                          <div className="leader-subdimension-chart">
                            <div className="chart">
                              <div className="bars" style={{ width: '704px', height: '306px' }}>
                                <div className="graph" style={{ position: 'relative', width: '704px', height: '306px', overflow: 'visible' }}>
                                  <div
                                    className="graph-lines"
                                    style={{
                                      position: 'absolute',
                                      width: '704px',
                                      height: '306px',
                                      left: 0,
                                      top: -24,
                                    }}
                                  >
                                    {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((value) => (
                                      <div
                                        key={value}
                                        className={`line ${value === 0.5 ? 'half' : value === 1 ? 'one' : value === 1.5 ? 'onehalf' : value === 2 ? 'two' : value === 2.5 ? 'twohalf' : value === 3 ? 'three' : value === 3.5 ? 'threehalf' : value === 4 ? 'four' : value === 4.5 ? 'fourhalf' : value === 5 ? 'five' : ''}`}
                                        style={{
                                          position: 'absolute',
                                          width: '2px',
                                          height: 0,
                                          left: `${(value / 5) * 100}%`,
                                          top: 0,
                                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                          fontSize: '12px',
                                          color: REPORT_COLORS.textPrimary,
                                          textIndent: '-2px',
                                          paddingTop: '262px',
                                        }}
                                      >
                                        <span>{value}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Group Average Bar */}
                                  {subdim.group_score !== null && subdim.group_score !== undefined && (
                                    <div
                                      className="graph-row"
                                      style={{
                                        position: 'relative',
                                        width: '704px',
                                        height: '67px',
                                        top: '4px',
                                      }}
                                    >
                                      <div
                                        className="ratee"
                                        style={{
                                          position: 'absolute',
                                          width: '135px',
                                          left: '-10px',
                                          top: '10px',
                                          textAlign: 'right',
                                          color: REPORT_COLORS.textPrimary,
                                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                          fontSize: '14px',
                                        }}
                                      >
                                        <span>Group Average</span>
                                      </div>
                                      <div
                                        className="bar"
                                        style={{
                                          position: 'absolute',
                                          width: '704px',
                                          left: 0,
                                          height: '67px',
                                          top: '10px',
                                        }}
                                      >
                                        <div
                                          className="inner"
                                          style={{
                                            position: 'relative',
                                            width: `${Math.max((subdim.group_score! / 5) * 100, 8)}%`,
                                            minWidth: '56px',
                                            height: '50px',
                                            background: REPORT_COLORS.primaryBlue,
                                            color: REPORT_COLORS.white,
                                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                            fontSize: '20px',
                                            lineHeight: '27px',
                                            textAlign: 'right',
                                            padding: '3px 12px 0 0',
                                            margin: 0,
                                          }}
                                        >
                                          {subdim.group_score!.toFixed(1)}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Your Score Bar */}
                                  <div
                                    className="graph-row"
                                    style={{
                                      position: 'relative',
                                      width: '704px',
                                      height: '67px',
                                      top: '4px',
                                    }}
                                  >
                                    <div
                                      className="ratee"
                                      style={{
                                        position: 'absolute',
                                        width: '135px',
                                        left: '-10px',
                                        top: '10px',
                                        textAlign: 'right',
                                        color: REPORT_COLORS.textPrimary,
                                        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                        fontSize: '14px',
                                      }}
                                    >
                                      <span>Your Score</span>
                                    </div>
                                    <div
                                      className="bar"
                                      style={{
                                        position: 'absolute',
                                        width: '704px',
                                        left: 0,
                                        height: '67px',
                                        top: '10px',
                                      }}
                                    >
                                      <div
                                        className={`inner ${subFlagged ? 'flagged' : ''}`}
                                        style={{
                                          position: 'relative',
                                          width: `${Math.max((subdim.target_score / 5) * 100, 8)}%`,
                                          minWidth: '56px',
                                          height: '50px',
                                          background: dimension.dimension_name === 'Involving-Stakeholders' 
                                            ? REPORT_COLORS.darkBlueAlt 
                                            : REPORT_COLORS.primaryBlue,
                                          color: REPORT_COLORS.white,
                                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                          fontSize: '20px',
                                          lineHeight: '27px',
                                          textAlign: 'right',
                                          padding: '3px 12px 0 0',
                                          margin: 0,
                                        }}
                                      >
                                        {subdim.target_score.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Benchmark Bar */}
                                  {subdim.industry_benchmark !== null && (
                                    <div
                                      className="graph-row"
                                      style={{
                                        position: 'relative',
                                        width: '704px',
                                        height: '67px',
                                        top: '4px',
                                      }}
                                    >
                                      <div
                                        className="ratee"
                                        style={{
                                          position: 'absolute',
                                          width: '135px',
                                          left: '-10px',
                                          top: '10px',
                                          textAlign: 'right',
                                          color: REPORT_COLORS.textPrimary,
                                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                          fontSize: '14px',
                                        }}
                                      >
                                        <span>
                                          Industry Benchmark
                                        </span>
                                      </div>
                                      <div
                                        className="bar"
                                        style={{
                                          position: 'absolute',
                                          width: '704px',
                                          left: 0,
                                          height: '67px',
                                          top: '10px',
                                        }}
                                      >
                                        <div
                                          className="inner"
                                          style={{
                                            position: 'relative',
                                            width: `${Math.max((subdim.industry_benchmark! / 5) * 100, 8)}%`,
                                            minWidth: '56px',
                                            height: '50px',
                                            background: REPORT_COLORS.orangeRed,
                                            color: REPORT_COLORS.white,
                                            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                            fontSize: '20px',
                                            lineHeight: '27px',
                                            textAlign: 'right',
                                            padding: '3px 12px 0 0',
                                            margin: 0,
                                          }}
                                        >
                                          {subdim.industry_benchmark!.toFixed(1)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Overall, Actionable, and Thoughts directly below chart */}
                        <div className="feedbacks" style={{ marginTop: '128px', clear: 'both' }}>
                          <FeedbackSection
                            number="01"
                            title="Overall Feedback"
                            content={dimension.overall_feedback ?? subdim.overall_feedback ?? undefined}
                            type="overall"
                          />
                          <FeedbackSection
                            number="02"
                            title="Actionable Feedback"
                            content={subdim.specific_feedback ?? undefined}
                            type="actionable"
                          />
                          <FeedbackSection
                            number="03"
                            title="Your Thoughts For Action Planning"
                            type="thoughts"
                          />
                        </div>

                        <PageFooter pageNumber={sp.page} />
                      </PageWrapper>
                    </PageContainer>

                  </div>
                )
              })}
            </div>
          )
        } else {
          // Blockers: Dimension page + feedback page
          const dp = (pageNumbers.dimensionPages as Array<{ dimension: DimensionReport; page: number; feedbackPage?: number }>)[dimIdx]
          const flagged = isFlagged(
            dimension.target_score,
            dimension.industry_benchmark,
            dimension.geonorm,
            dimension.group_score
          )

          return (
            <div key={dimension.dimension_id}>
              {/* Dimension Score Page */}
              <PageContainer pageNumber={dp.page} id={`${dp.page}`}>
                <PageWrapper>
                  <PageHeader
                    pageNumber={dp.page}
                    logo={`involve-${reportType}-logo-small.png`}
                    logoWidth={174}
                  />

                  {/* Title */}
                  <div
                    className="page-title alt"
                    style={{
                      marginTop: '25px',
                      textTransform: 'uppercase',
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontWeight: 600,
                      fontSize: REPORT_TYPOGRAPHY.pageTitle.medium,
                      lineHeight: '50px',
                      letterSpacing: '-2px',
                      display: 'inline-block',
                      borderBottom: `4px solid ${REPORT_COLORS.textPrimary}`,
                      marginLeft: `-${REPORT_SPACING.pagePaddingLeft}px`,
                      paddingLeft: `${REPORT_SPACING.pagePaddingLeft}px`,
                      paddingBottom: '8px',
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
                    className="page-content leader-subdims"
                    style={{
                      letterSpacing: '0.5px',
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: REPORT_TYPOGRAPHY.body.fontSize,
                      lineHeight: REPORT_TYPOGRAPHY.body.lineHeight,
                      margin: '20px 0 40px',
                    }}
                  >
                    {dimension.definition && (
                      <p>
                        Defined: {dimension.definition}
                      </p>
                    )}

                    <div className="leader-subdimension-chart">
                      <div className="chart">
                        <div className="bars" style={{ width: '704px', height: '306px' }}>
                          <div className="graph" style={{ position: 'relative', width: '704px', height: '306px', overflow: 'visible' }}>
                            <div
                              className="graph-lines"
                              style={{
                                position: 'absolute',
                                width: '704px',
                                height: '306px',
                                left: 0,
                                top: -24,
                              }}
                            >
                              {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((value) => (
                                <div
                                  key={value}
                                  className={`line ${value === 0.5 ? 'half' : value === 1 ? 'one' : value === 1.5 ? 'onehalf' : value === 2 ? 'two' : value === 2.5 ? 'twohalf' : value === 3 ? 'three' : value === 3.5 ? 'threehalf' : value === 4 ? 'four' : value === 4.5 ? 'fourhalf' : value === 5 ? 'five' : ''}`}
                                  style={{
                                    position: 'absolute',
                                    width: '2px',
                                    height: 0,
                                    left: `${(value / 5) * 100}%`,
                                    top: 0,
                                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                    fontSize: '12px',
                                    color: REPORT_COLORS.textPrimary,
                                    textIndent: '-2px',
                                    paddingTop: '262px',
                                  }}
                                >
                                <span>{value}</span>
                              </div>
                            ))}
                          </div>

                            {/* Your Score Bar */}
                            <div
                              className="graph-row"
                              style={{
                                position: 'relative',
                                width: '704px',
                                height: '67px',
                                top: '4px',
                              }}
                            >
                              <div
                                className="ratee"
                                style={{
                                  position: 'absolute',
                                  width: '135px',
                                  left: '-10px',
                                  top: '10px',
                                  textAlign: 'right',
                                  color: REPORT_COLORS.textPrimary,
                                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                  fontSize: '14px',
                                }}
                              >
                                <span>Your Score</span>
                              </div>
                              <div
                                className="bar"
                                style={{
                                  position: 'absolute',
                                  width: '704px',
                                  left: 0,
                                  height: '67px',
                                  top: '10px',
                                }}
                              >
                                <div
                                  className={`inner ${flagged ? 'flagged' : ''}`}
                                  style={{
                                    position: 'relative',
                                    width: `${(dimension.target_score / 5) * 100}%`,
                                    height: '50px',
                                    background: REPORT_COLORS.darkBlue,
                                    color: REPORT_COLORS.white,
                                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                    fontSize: '20px',
                                    lineHeight: '27px',
                                    textAlign: 'right',
                                    padding: '3px 0 0 0',
                                    margin: 0,
                                  }}
                                >
                                  {dimension.target_score.toFixed(1)}
                                </div>
                              </div>
                            </div>

                            {/* Benchmark Bar */}
                            {dimension.industry_benchmark !== null && (
                              <div
                                className="graph-row"
                                style={{
                                  position: 'relative',
                                  width: '704px',
                                  height: '67px',
                                  top: '4px',
                                }}
                              >
                                <div
                                  className="ratee"
                                  style={{
                                    position: 'absolute',
                                    width: '135px',
                                    left: '-10px',
                                    top: '10px',
                                    textAlign: 'right',
                                    color: REPORT_COLORS.textPrimary,
                                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                    fontSize: '14px',
                                  }}
                                >
                                  <span>
                                    Industry Benchmark
                                  </span>
                                </div>
                                <div
                                  className="bar"
                                  style={{
                                    position: 'absolute',
                                    width: '704px',
                                    left: 0,
                                    height: '67px',
                                    top: '10px',
                                  }}
                                >
                                  <div
                                    className="inner"
                                    style={{
                                      position: 'relative',
                                      width: `${(dimension.industry_benchmark! / 5) * 100}%`,
                                      height: '50px',
                                      background: REPORT_COLORS.orangeRed,
                                      color: REPORT_COLORS.white,
                                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                                      fontSize: '20px',
                                      lineHeight: '27px',
                                      textAlign: 'right',
                                      padding: '3px 0 0 0',
                                      margin: 0,
                                    }}
                                  >
                                    {dimension.industry_benchmark!.toFixed(1)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <PageFooter pageNumber={dp.page} />
                </PageWrapper>
              </PageContainer>

              {/* Feedback Page for Dimension */}
              {dp.feedbackPage && dimension.specific_feedback && (
                <PageContainer pageNumber={dp.feedbackPage} id={`${dp.feedbackPage}`}>
                  <PageWrapper>
                    <PageHeader
                      pageNumber={dp.feedbackPage}
                      logo={`involve-${reportType}-logo-small.png`}
                      logoWidth={174}
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
                        {dimension.specific_feedback && (
                          <FeedbackSection
                            number="01"
                            title="Actionable Feedback"
                            content={dimension.specific_feedback}
                            type="actionable"
                          />
                        )}
                        <FeedbackSection
                          number={dimension.specific_feedback ? "02" : "01"}
                          title="Your Thoughts For Action Planning"
                          type="thoughts"
                        />
                      </div>
                    </div>

                    <PageFooter pageNumber={dp.feedbackPage} />
                  </PageWrapper>
                </PageContainer>
              )}
            </div>
          )
        }
      })}
    </div>
  )
}
