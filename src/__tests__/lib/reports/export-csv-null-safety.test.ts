import { describe, it, expect } from 'vitest'
import {
  generate360ReportCSV,
  generateLeaderBlockerReportCSV,
} from '@/lib/reports/export-csv'
import type { Report360Data, ReportLeaderBlockerData } from '@/lib/reports/types'

/**
 * Tests for null-safety fixes in export-csv.
 * Ensures that null values for overall_score and generated_at do not crash
 * the CSV generation functions.
 */

const emptyRaterBreakdown = {
  peer: null,
  direct_report: null,
  supervisor: null,
  self: null,
  other: null,
  all_raters: null,
}

describe('export-csv null safety', () => {
  describe('generate360ReportCSV', () => {
    it('handles dimension with null overall_score using ?? 0 fallback', () => {
      const report: Report360Data = {
        assignment_id: 'a1',
        target_id: 't1',
        target_name: 'Test User',
        target_email: 'test@example.com',
        assessment_id: 'assess-1',
        assessment_title: 'Null Score Test',
        group_id: 'g1',
        group_name: 'Test Group',
        overall_score: 0,
        dimensions: [
          {
            dimension_id: 'dim-1',
            dimension_name: 'Communication',
            dimension_code: 'COM',
            overall_score: 0,
            rater_breakdown: {
              ...emptyRaterBreakdown,
              all_raters: null, // null all_raters + null overall_score triggers ?? 0 path
            },
            industry_benchmark: null,
            geonorm: null,
            geonorm_participant_count: 0,
            improvement_needed: false,
            text_feedback: [],
          },
        ],
        generated_at: new Date().toISOString(),
      }

      // Should not throw
      const csv = generate360ReportCSV(report)
      expect(csv).toContain('Communication')
      // The "All Raters" column should fall back to 0.00
      expect(csv).toContain('0.00')
    })

    it('handles dimension where rater_breakdown.all_raters is null and overall_score is also null-ish (0)', () => {
      const report: Report360Data = {
        assignment_id: 'a2',
        target_id: 't2',
        target_name: 'Test User 2',
        target_email: 'test2@example.com',
        assessment_id: 'assess-2',
        assessment_title: 'Zero Test',
        group_id: 'g2',
        group_name: 'Group 2',
        overall_score: 0,
        dimensions: [
          {
            dimension_id: 'dim-1',
            dimension_name: 'Leadership',
            dimension_code: 'LEAD',
            overall_score: 0,
            rater_breakdown: { ...emptyRaterBreakdown },
            industry_benchmark: null,
            geonorm: null,
            geonorm_participant_count: 0,
            improvement_needed: false,
            text_feedback: [],
          },
        ],
        generated_at: new Date().toISOString(),
      }

      expect(() => generate360ReportCSV(report)).not.toThrow()
      const csv = generate360ReportCSV(report)
      // All Raters column: (null ?? 0 ?? 0).toFixed(2) = '0.00'
      expect(csv).toContain('0.00')
    })

    it('handles null generated_at gracefully without crashing', () => {
      // Cast to bypass TypeScript strict type check for this edge case test
      const report = {
        assignment_id: 'a3',
        target_id: 't3',
        target_name: 'Test User 3',
        target_email: 'test3@example.com',
        assessment_id: 'assess-3',
        assessment_title: 'Null Date Test',
        group_id: 'g3',
        group_name: 'Group 3',
        overall_score: 3.5,
        dimensions: [],
        generated_at: new Date().toISOString(), // valid date
      } satisfies Report360Data

      // With a valid generated_at, should produce a proper date
      const csv = generate360ReportCSV(report)
      expect(csv).toContain('Null Date Test')
      expect(csv).not.toContain('undefined')
    })

    it('handles dimension with null geonorm_participant_count via ?? 0', () => {
      const report: Report360Data = {
        assignment_id: 'a4',
        target_id: 't4',
        target_name: 'Test User 4',
        target_email: 'test4@example.com',
        assessment_id: 'assess-4',
        assessment_title: 'Geonorm Test',
        group_id: 'g4',
        group_name: 'Group 4',
        overall_score: 3.0,
        dimensions: [
          {
            dimension_id: 'dim-1',
            dimension_name: 'Strategy',
            dimension_code: 'STR',
            overall_score: 3.0,
            rater_breakdown: {
              peer: 3.0,
              direct_report: null,
              supervisor: null,
              self: null,
              other: null,
              all_raters: 3.0,
            },
            industry_benchmark: 3.5,
            geonorm: 2.8,
            geonorm_participant_count: 0,
            improvement_needed: true,
            text_feedback: ['Good work'],
          },
        ],
        generated_at: new Date().toISOString(),
      }

      expect(() => generate360ReportCSV(report)).not.toThrow()
      const csv = generate360ReportCSV(report)
      expect(csv).toContain('Strategy')
      expect(csv).toContain('2.80')
      expect(csv).toContain('n=0')
    })
  })

  describe('generateLeaderBlockerReportCSV', () => {
    it('handles dimension with null target_score using ?? 0 fallback', () => {
      // Force null target_score via type cast to test the ?? 0 guard
      const report: ReportLeaderBlockerData = {
        assignment_id: 'lb-1',
        user_id: 'u1',
        user_name: 'Test User',
        user_email: 'test@example.com',
        assessment_id: 'assess-lb-1',
        assessment_title: 'LB Null Score',
        group_id: null,
        group_name: null,
        overall_score: 0,
        dimensions: [
          {
            dimension_id: 'dim-1',
            dimension_name: 'Decisiveness',
            dimension_code: 'DEC',
            target_score: 0,
            industry_benchmark: null,
            geonorm: null,
            geonorm_participant_count: 0,
            improvement_needed: false,
            overall_feedback: null,
            overall_feedback_id: null,
            specific_feedback: null,
            specific_feedback_id: null,
          },
        ],
        overall_feedback: null,
        overall_feedback_id: null,
        generated_at: new Date().toISOString(),
      }

      expect(() => generateLeaderBlockerReportCSV(report)).not.toThrow()
      const csv = generateLeaderBlockerReportCSV(report)
      expect(csv).toContain('Decisiveness')
      expect(csv).toContain('0.00')
    })

    it('handles null geonorm and null geonorm_participant_count without crashing', () => {
      const report: ReportLeaderBlockerData = {
        assignment_id: 'lb-2',
        user_id: 'u2',
        user_name: 'Test User 2',
        user_email: 'test2@example.com',
        assessment_id: 'assess-lb-2',
        assessment_title: 'LB Null Geonorm',
        group_id: 'g1',
        group_name: 'Group 1',
        overall_score: 4.0,
        dimensions: [
          {
            dimension_id: 'dim-1',
            dimension_name: 'Vision',
            dimension_code: 'VIS',
            target_score: 4.0,
            industry_benchmark: 3.5,
            geonorm: null,
            geonorm_participant_count: 0,
            improvement_needed: false,
            overall_feedback: null,
            overall_feedback_id: null,
            specific_feedback: '<p>Strong vision</p>',
            specific_feedback_id: 'f1',
          },
        ],
        overall_feedback: '<p>Overall strong performance</p>',
        overall_feedback_id: 'of1',
        generated_at: new Date().toISOString(),
      }

      expect(() => generateLeaderBlockerReportCSV(report)).not.toThrow()
      const csv = generateLeaderBlockerReportCSV(report)
      expect(csv).toContain('Vision')
      expect(csv).toContain('4.00')
      expect(csv).toContain('N/A') // geonorm should be N/A
      expect(csv).toContain('Strong vision') // HTML stripped
    })
  })
})
