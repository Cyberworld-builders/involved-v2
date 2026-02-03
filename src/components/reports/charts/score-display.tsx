'use client'

import { REPORT_TYPOGRAPHY, REPORT_COLORS } from '@/lib/reports/report-design-constants'

interface ScoreDisplayProps {
  score: number
  maxValue?: number
  label?: string
  size?: 'large' | 'medium' | 'small'
}

/**
 * Score Display Component
 * 
 * Matches legacy score display styling:
 * - Large: 91px for emphasis
 * - Medium: 34px
 * - Small: 20px
 * - Displays score with "out of 5" label
 */
export default function ScoreDisplay({ 
  score, 
  maxValue: _maxValue = 5, 
  label,
  size = 'large' 
}: ScoreDisplayProps) {
  const fontSize = size === 'large' 
    ? REPORT_TYPOGRAPHY.score.large 
    : size === 'medium' 
    ? REPORT_TYPOGRAPHY.score.medium 
    : REPORT_TYPOGRAPHY.score.small
  
  return (
    <div
      className="score"
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        width: size === 'large' ? '141px' : 'auto',
        fontSize: fontSize,
        lineHeight: '1',
        color: REPORT_COLORS.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ display: 'block' }}>{(score ?? 0).toFixed(1)}</span>
      {label && (
        <span
          style={{
            fontSize: '16px',
            display: 'block',
            textAlign: 'center',
            marginTop: size === 'large' ? '8px' : '4px',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
