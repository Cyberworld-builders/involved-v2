import { describe, it, expect } from 'vitest'
import {
  generate360ReportCSV,
  generateLeaderBlockerReportCSV,
} from '@/lib/reports/export-csv'
import {
  emptyDimensions360Report,
  partial360Report,
  partialLeaderBlockerReport,
  leaderBlockerReportWithOneDimension,
} from '../../fixtures/reports'

describe('export-csv partial reports', () => {
  describe('generate360ReportCSV', () => {
    it('does not throw for partial 360 report with one dimension', () => {
      expect(() => generate360ReportCSV(partial360Report)).not.toThrow()
    })

    it('returns CSV string with headers and data for partial 360', () => {
      const csv = generate360ReportCSV(partial360Report)
      expect(csv).toContain('Assessment,Target Name')
      expect(csv).toContain('Dimension,Code,All Raters')
      expect(csv).toContain('360 Assessment')
      expect(csv).toContain('Leadership')
    })

    it('does not throw for 360 report with empty dimensions', () => {
      expect(() => generate360ReportCSV(emptyDimensions360Report)).not.toThrow()
    })

    it('returns CSV with No data row when dimensions are empty', () => {
      const csv = generate360ReportCSV(emptyDimensions360Report)
      expect(csv).toContain('Dimension,Code,All Raters')
      expect(csv).toContain('No data,')
    })
  })

  describe('generateLeaderBlockerReportCSV', () => {
    it('does not throw for partial Leader/Blocker report with zero dimensions', () => {
      expect(() => generateLeaderBlockerReportCSV(partialLeaderBlockerReport)).not.toThrow()
    })

    it('returns CSV with No data row when dimensions are empty', () => {
      const csv = generateLeaderBlockerReportCSV(partialLeaderBlockerReport)
      expect(csv).toContain('Dimension,Code,Your Score')
      expect(csv).toContain('No data,')
    })

    it('does not throw for report with one dimension', () => {
      expect(() =>
        generateLeaderBlockerReportCSV(leaderBlockerReportWithOneDimension)
      ).not.toThrow()
    })
  })
})
