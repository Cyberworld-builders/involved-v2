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
  maxValue = 5, 
  label,
  size = 'large' 
}: ScoreDisplayProps) {
  const fontSize = size === 'large' 
    ? REPORT_TYPOGRAPHY.score.large 
    : size === 'medium' 
    ? REPORT_TYPOGRAPHY.score.medium 
    : REPORT_TYPOGRAPHY.score.small
  
  const height = size === 'large' ? 230 : size === 'medium' ? 100 : 50
  
  return (
    <div
      className="score"
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        width: size === 'large' ? '141px' : 'auto',
        float: size === 'large' ? 'left' : 'none',
        fontSize: fontSize,
        lineHeight: size === 'large' ? '40px' : 'normal',
        height: `${height}px`,
        paddingTop: size === 'large' ? '100px' : '0',
        color: REPORT_COLORS.textPrimary,
      }}
    >
      {score.toFixed(1)}
      {label && (
        <span
          style={{
            fontSize: '16px',
            display: 'block',
            textAlign: 'center',
            position: 'relative',
            top: size === 'large' ? '-20px' : '4px',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
