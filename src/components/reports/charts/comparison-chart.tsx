'use client'

import { REPORT_COLORS } from '@/lib/reports/report-design-constants'

interface ComparisonChartProps {
  yourScore: number
  groupAverage?: number
  benchmark?: number
  dimensionName?: string
  yourScoreFlagged?: boolean
  maxValue?: number
}

/**
 * Comparison Chart Component
 * 
 * Matches legacy comparison chart styling:
 * - Stacked horizontal bars for Your Score, Group Average, Benchmark
 * - Colors: Dark blue (your), blue (group), orange (benchmark)
 * - Legend below chart
 * - Grid lines at 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
 */
export default function ComparisonChart({
  yourScore,
  groupAverage,
  benchmark,
  dimensionName,
  yourScoreFlagged = false,
  maxValue = 5,
}: ComparisonChartProps) {
  const chartWidth = 704
  const barHeight = 50
  const rowHeight = 67
  const gapBelowBars = 32
  const barsAreaHeight = (groupAverage !== undefined ? 3 : benchmark !== undefined ? 2 : 1) * rowHeight + 24
  const lineNumbersTop = barsAreaHeight + gapBelowBars
  const graphHeight = lineNumbersTop + 24
  
  const yourPercent = (yourScore / maxValue) * 100
  const groupPercent = groupAverage ? (groupAverage / maxValue) * 100 : 0
  const benchmarkPercent = benchmark ? (benchmark / maxValue) * 100 : 0
  
  return (
    <div className="leader-overall-score-chart">
      <div className="chart" style={{ width: `${chartWidth}px`, height: '300px', float: 'none', marginTop: '10px' }}>
        {dimensionName && (
          <div
            className="title"
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: '18px',
              textDecoration: 'underline',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            Overall Score for {dimensionName}
          </div>
        )}

        <div className="bars" style={{ width: `${chartWidth}px`, height: `${graphHeight}px` }}>
          <div className="graph" style={{ position: 'relative', width: `${chartWidth}px`, height: `${graphHeight}px` }}>
            {/* Grid Lines */}
            <div
              className="graph-lines"
              style={{
                position: 'absolute',
                width: `${chartWidth}px`,
                height: `${graphHeight}px`,
                left: 0,
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
                    left: `${(value / maxValue) * 100}%`,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: '12px',
                    color: REPORT_COLORS.textPrimary,
                    background: REPORT_COLORS.lightGray,
                    textIndent: '-2px',
                    paddingTop: `${lineNumbersTop}px`,
                  }}
                >
                  <span
                    style={{
                      position: 'relative',
                      top: '-10px',
                      left: value % 1 === 0.5 ? '-7px' : '-2px',
                      fontSize: '14px',
                      display: 'block',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Group Average Bar */}
            {groupAverage !== undefined && (
              <div className="graph-row" style={{ position: 'relative', width: `${chartWidth}px`, height: `${rowHeight}px`, top: '4px' }}>
                <div className="bar" style={{ position: 'absolute', width: `${chartWidth}px`, left: 0, height: `${rowHeight}px`, top: '10px' }}>
                  <div
                    className="inner"
                    style={{
                      position: 'relative',
                      width: `${Math.max(groupPercent, 8)}%`,
                      minWidth: '56px',
                      height: `${barHeight}px`,
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
                    {groupAverage.toFixed(1)}
                  </div>
                </div>
              </div>
            )}

            {/* Your Score Bar */}
            <div className="graph-row" style={{ position: 'relative', width: `${chartWidth}px`, height: `${rowHeight}px`, top: '4px' }}>
              <div className="bar" style={{ position: 'absolute', width: `${chartWidth}px`, left: 0, height: `${rowHeight}px`, top: '10px' }}>
                <div
                  className={`inner ${yourScoreFlagged ? 'flagged' : ''}`}
                  style={{
                    position: 'relative',
                    width: `${Math.max(yourPercent, 8)}%`,
                    minWidth: '56px',
                    height: `${barHeight}px`,
                    background: REPORT_COLORS.darkBlue,
                    color: REPORT_COLORS.white,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: '20px',
                    lineHeight: '27px',
                    textAlign: 'right',
                    padding: '3px 12px 0 0',
                    margin: 0,
                  }}
                >
                  {yourScore.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Benchmark Bar */}
            {benchmark !== undefined && (
              <div className="graph-row" style={{ position: 'relative', width: `${chartWidth}px`, height: `${rowHeight}px`, top: '4px' }}>
                <div className="bar" style={{ position: 'absolute', width: `${chartWidth}px`, left: 0, height: `${rowHeight}px`, top: '10px' }}>
                  <div
                    className="inner"
                    style={{
                      position: 'relative',
                      width: `${Math.max(benchmarkPercent, 8)}%`,
                      minWidth: '56px',
                      height: `${barHeight}px`,
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
                    {benchmark.toFixed(1)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend - one row, equal-width containers, top-aligned, text wraps within each */}
        <div
          className="legend"
          style={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            width: '100%',
            marginTop: '20px',
            fontSize: '14px',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            gap: '16px',
          }}
        >
          {groupAverage !== undefined && (
            <span className="item group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 0', minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  flexShrink: 0,
                  background: REPORT_COLORS.primaryBlue,
                  width: '13px',
                  height: '13px',
                  marginTop: '2px',
                }}
              />
              <span style={{ lineHeight: 1.3, wordBreak: 'break-word' }}>Group Average</span>
            </span>
          )}
          <span className="item you" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 0', minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                flexShrink: 0,
                background: REPORT_COLORS.darkBlue,
                width: '13px',
                height: '13px',
                marginTop: '2px',
              }}
            />
            <span style={{ lineHeight: 1.3, wordBreak: 'break-word' }}>Your Scores</span>
          </span>
          {benchmark !== undefined && (
            <span className="item benchmark" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 0', minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  flexShrink: 0,
                  background: REPORT_COLORS.orangeRed,
                  width: '13px',
                  height: '13px',
                  marginTop: '2px',
                }}
              />
              <span style={{ lineHeight: 1.3, wordBreak: 'break-word' }}>Industry Benchmark</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
