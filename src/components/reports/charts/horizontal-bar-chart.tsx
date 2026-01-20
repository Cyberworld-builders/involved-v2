'use client'

import { REPORT_COLORS, REPORT_SPACING } from '@/lib/reports/report-design-constants'
import Image from 'next/image'

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
}

/**
 * Horizontal Bar Chart Component
 * 
 * Matches legacy bar chart styling:
 * - Horizontal bars with percentage-based widths
 * - Score values displayed inside bars
 * - Grid lines at 0, 1, 2, 3, 4, 5 (20% increments)
 * - Orange triangle indicator for flagged scores
 * - Color-coded bars
 */
export default function HorizontalBarChart({
  scores,
  maxValue = 5,
  showGridLines = true,
  barHeight = 40,
  showScoreInBar = true,
}: HorizontalBarChartProps) {
  const chartWidth = 563 // Legacy chart width
  const graphWidth = 422 // Legacy graph width (bar area)
  const rateeWidth = 135 // Legacy ratee label width
  
  return (
    <div className="bars" style={{ width: `${chartWidth}px`, height: `${REPORT_SPACING.chartBarsHeight}px` }}>
        <div className="graph" style={{ position: 'relative', width: `${chartWidth}px`, height: `${REPORT_SPACING.chartHeight}px` }}>
          {/* Grid Lines */}
          {showGridLines && (
            <div className="graph-lines" style={{ position: 'absolute', width: `${graphWidth}px`, height: `${REPORT_SPACING.chartHeight}px`, left: `${rateeWidth}px`, top: 0 }}>
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <div
                  key={value}
                  className={`line ${value === 1 ? 'one' : value === 2 ? 'two' : value === 3 ? 'three' : value === 4 ? 'four' : value === 5 ? 'five' : ''}`}
                  style={{
                    position: 'absolute',
                    width: '2px',
                    height: '0px',
                    left: `${(value / maxValue) * 100}%`,
                    top: 0,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: '12px',
                    color: REPORT_COLORS.textPrimary,
                    background: REPORT_COLORS.lightGray,
                    textIndent: '-2px',
                    paddingTop: '220px',
                  }}
                >
                  <span style={{ position: 'relative', top: '4px' }}>{value}</span>
                </div>
              ))}
              <div style={{ clear: 'both' }} />
            </div>
          )}

          {/* Bars */}
          {scores.map((barData, index) => {
            const percent = Math.min((barData.score / maxValue) * 100, 100)
            const barColor = barData.color || REPORT_COLORS.primaryBlue
            
            return (
              <div
                key={index}
                className="graph-row"
                style={{
                  position: 'relative',
                  width: `${chartWidth}px`,
                  height: `${barHeight}px`,
                  display: 'block',
                }}
              >
                {/* Ratee Label */}
                <div
                  className="ratee"
                  style={{
                    position: 'absolute',
                    width: `${rateeWidth}px`,
                    left: '-10px',
                    top: '10px',
                    textAlign: 'right',
                    color: REPORT_COLORS.textPrimary,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    fontSize: '14px',
                    marginRight: '10px',
                    marginTop: 0,
                  }}
                >
                  {barData.label}
                </div>

                {/* Bar */}
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
                      minHeight: `${barHeight}px`,
                      height: 'auto',
                      background: barColor,
                      color: REPORT_COLORS.white,
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: '14px',
                      textAlign: 'right',
                      padding: '8px 12px',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      lineHeight: '1.2',
                      boxSizing: 'border-box',
                    }}
                  >
                    {showScoreInBar && barData.score.toFixed(1)}
                  </div>
                </div>

                <div style={{ clear: 'both' }} />
              </div>
            )
          })}
        </div>
      </div>
  )
}
