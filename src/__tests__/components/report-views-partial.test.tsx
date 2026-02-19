import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Report360View from '@/components/reports/360-report-view'
import ReportLeaderBlockerView from '@/components/reports/leader-blocker-report-view'
import {
  partial360Report,
  emptyDimensions360Report,
  partialLeaderBlockerReport,
} from '../fixtures/reports'

describe('Report views with partial data', () => {
  describe('Report360View', () => {
    it('renders without throwing for partial 360 report', () => {
      expect(() =>
        render(<Report360View reportData={partial360Report} />)
      ).not.toThrow()
    })

    it('shows assessment title and overall score for partial report', () => {
      render(<Report360View reportData={partial360Report} />)
      expect(screen.getByText('360 Assessment')).toBeInTheDocument()
      const overallLabels = screen.getAllByText('Overall Score')
      expect(overallLabels.length).toBeGreaterThanOrEqual(1)
      const scores = screen.getAllByText('0.00')
      expect(scores.length).toBeGreaterThanOrEqual(1)
    })

    it('renders without throwing for empty dimensions 360', () => {
      expect(() =>
        render(<Report360View reportData={emptyDimensions360Report} />)
      ).not.toThrow()
    })
  })

  describe('ReportLeaderBlockerView', () => {
    it('renders without throwing for partial Leader/Blocker report', () => {
      expect(() =>
        render(<ReportLeaderBlockerView reportData={partialLeaderBlockerReport} />)
      ).not.toThrow()
    })

    it('shows assessment title and overall score for partial report', () => {
      render(<ReportLeaderBlockerView reportData={partialLeaderBlockerReport} />)
      expect(screen.getByText('Leader Assessment')).toBeInTheDocument()
      expect(screen.getByText('0.00')).toBeInTheDocument()
    })
  })
})
