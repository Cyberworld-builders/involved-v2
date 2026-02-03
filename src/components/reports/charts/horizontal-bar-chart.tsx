'use client'

import { REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'

interface BarData {
  label: string
  score: number
  flagged?: boolean
  color?: string
}

interface HorizontalBarChartProps {
  scores: BarData[]
  maxValue?: number
  showGridLines?: boolean
  barHeight?: number
  showScoreInBar?: boolean
  /** 563 (360 style) or 704 (leader/blocker) */
  chartWidth?: number
  /** Bar area width; default derived from chartWidth (422 or 569) */
  graphWidth?: number
  /** Label column width; default 135 */
  rateeWidth?: number
  /** Integer scale (0-5) or half scale (0, 0.5, ..., 5) */
  scale?: 'integer' | 'half'
  /** Gap between bar rows in px */
  rowGap?: number
}

/**
 * Horizontal Bar Chart Component
 *
 * Matches 360 report chart styling; also used for leader/blocker reports.
 * - Label column left, bar area right, grid lines only over bar area
 * - Bars in normal flow (no absolute stacking)
 * - Optional integer (0-5) or half (0, 0.5, ..., 5) scale
 */
export default function HorizontalBarChart({
  scores,
  maxValue = 5,
  showGridLines = true,
  barHeight = 40,
  showScoreInBar = true,
  chartWidth: chartWidthProp,
  graphWidth: graphWidthProp,
  rateeWidth = 135,
  scale = 'integer',
  rowGap = 12,
}: HorizontalBarChartProps) {
  const chartWidth = chartWidthProp ?? 563
  const graphWidth = graphWidthProp ?? (chartWidth === 704 ? 569 : 422)

  const tickValues =
    scale === 'half'
      ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
      : [0, 1, 2, 3, 4, 5]

  const rowHeight = barHeight + rowGap
  const barsRegionHeight = scores.length * rowHeight
  const scaleGap = 34
  const graphHeight = barsRegionHeight + scaleGap
  const linePaddingTop = barsRegionHeight + 10

  const is360Style = chartWidth === 563
  const fixedGraphHeight = REPORT_SPACING.chartHeight
  const fixedLinePadding = 220

  const effectiveGraphHeight = is360Style ? fixedGraphHeight : graphHeight
  const effectiveLinePadding = is360Style ? fixedLinePadding : linePaddingTop
  const containerHeight = is360Style
    ? Math.max(REPORT_SPACING.chartBarsHeight, graphHeight)
    : graphHeight

  return (
    <div
      className="bars"
      style={{
        width: `${chartWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      <div
        className="graph"
        style={{
          position: 'relative',
          width: `${chartWidth}px`,
          height: `${effectiveGraphHeight}px`,
          overflow: 'visible',
        }}
      >
        {/* Grid lines - only over bar area, same pattern as 360 */}
        {showGridLines && (
          <div
            className="graph-lines"
            style={{
              position: 'absolute',
              width: `${graphWidth}px`,
              height: `${effectiveGraphHeight}px`,
              left: `${rateeWidth}px`,
              top: 0,
            }}
          >
            {tickValues.map((value) => (
              <div
                key={String(value)}
                className={`line ${value === 0.5 ? 'half' : value === 1 ? 'one' : value === 1.5 ? 'onehalf' : value === 2 ? 'two' : value === 2.5 ? 'twohalf' : value === 3 ? 'three' : value === 3.5 ? 'threehalf' : value === 4 ? 'four' : value === 4.5 ? 'fourhalf' : value === 5 ? 'five' : ''}`}
                style={{
                  position: 'absolute',
                  width: '2px',
                  height: 0,
                  left: `${(value / maxValue) * 100}%`,
                  top: 0,
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: '12px',
                  color: REPORT_COLORS.textPrimary,
                  background: REPORT_COLORS.lightGray,
                  textIndent: '-2px',
                  paddingTop: `${effectiveLinePadding}px`,
                }}
              >
                <span style={{ position: 'relative', top: '4px', fontSize: scale === 'half' ? '14px' : undefined }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bars - normal flow, label left / bar right like 360 */}
        {scores.map((barData, index) => {
          const percent = Math.min(Math.max((barData.score / maxValue) * 100, 8), 100)
          const barColor = barData.color ?? REPORT_COLORS.primaryBlue

          return (
            <div
              key={index}
              className="graph-row"
              style={{
                position: 'relative',
                width: `${chartWidth}px`,
                height: `${barHeight}px`,
                marginBottom: index < scores.length - 1 ? rowGap : 0,
                display: 'block',
              }}
            >
              <div
                className="ratee"
                style={{
                  position: 'absolute',
                  width: `${rateeWidth}px`,
                  left: 0,
                  top: chartWidth === 704 ? '10px' : '10px',
                  textAlign: 'right',
                  color: REPORT_COLORS.textPrimary,
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: chartWidth === 704 ? '14px' : '14px',
                  paddingRight: '10px',
                }}
              >
                {barData.label}
              </div>

              <div
                className="bar"
                style={{
                  position: 'absolute',
                  width: `${graphWidth}px`,
                  left: `${rateeWidth}px`,
                  top: 0,
                  height: `${barHeight}px`,
                }}
              >
                <div
                  className={`inner ${barData.flagged ? 'flagged' : ''}`}
                  style={{
                    position: 'relative',
                    width: `${percent}%`,
                    minWidth: '56px',
                    minHeight: `${barHeight}px`,
                    height: `${chartWidth === 704 ? 50 : barHeight}px`,
                    background: barColor,
                    color: REPORT_COLORS.white,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: chartWidth === 704 ? '20px' : '14px',
                    lineHeight: chartWidth === 704 ? '27px' : '1.2',
                    textAlign: 'right',
                    padding: chartWidth === 704 ? '3px 12px 0 0' : '8px 12px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    boxSizing: 'border-box',
                  }}
                >
                  {showScoreInBar && barData.score.toFixed(1)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
