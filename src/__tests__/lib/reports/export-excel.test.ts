import { describe, it, expect } from 'vitest'
import {
  generate360ReportExcel,
  generateLeaderBlockerReportExcel,
} from '@/lib/reports/export-excel'
import {
  emptyDimensions360Report,
  partial360Report,
  partialLeaderBlockerReport,
  leaderBlockerReportWithOneDimension,
} from '../../fixtures/reports'

describe('export-excel partial reports', () => {
  describe('generate360ReportExcel', () => {
    it('does not throw for partial 360 report with one dimension', async () => {
      await expect(generate360ReportExcel(partial360Report)).resolves.not.toThrow()
    })

    it('returns a buffer of reasonable size for partial 360', async () => {
      const buffer = await generate360ReportExcel(partial360Report)
      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.length).toBeGreaterThan(100)
    })

    it('does not throw for 360 report with empty dimensions', async () => {
      await expect(generate360ReportExcel(emptyDimensions360Report)).resolves.not.toThrow()
    })

    it('returns a buffer for empty dimensions 360', async () => {
      const buffer = await generate360ReportExcel(emptyDimensions360Report)
      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })

  describe('generateLeaderBlockerReportExcel', () => {
    it('does not throw for partial Leader/Blocker report with zero dimensions', async () => {
      await expect(
        generateLeaderBlockerReportExcel(partialLeaderBlockerReport)
      ).resolves.not.toThrow()
    })

    it('returns a buffer for partial report', async () => {
      const buffer = await generateLeaderBlockerReportExcel(partialLeaderBlockerReport)
      expect(Buffer.isBuffer(buffer)).toBe(true)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('does not throw for report with one dimension', async () => {
      await expect(
        generateLeaderBlockerReportExcel(leaderBlockerReportWithOneDimension)
      ).resolves.not.toThrow()
    })
  })
})
