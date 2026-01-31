/**
 * PDF Export functionality
 * 
 * Uses @react-pdf/renderer to generate PDF from report data
 */

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import React from 'react'

/**
 * Helper to convert ReadableStream to Buffer
 * Newer versions of @react-pdf/renderer return ReadableStream from toBuffer()
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  return Buffer.from(result)
}

// Define styles for PDF matching legacy design
// Legacy colors: primaryBlue: #55a1d8, darkBlue: #272842, orangeRed: #f26950, lightGray: #c0c9cf
const styles = StyleSheet.create({
  page: {
    padding: '59px 73px',
    fontSize: 14.8,
    fontFamily: 'Helvetica',
    color: '#272842',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 69,
    marginBottom: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 14.8,
    marginBottom: 20,
    color: '#272842',
    letterSpacing: 0.5,
    lineHeight: 27.05,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 91,
    fontWeight: 'bold',
    color: '#272842',
    marginBottom: 5,
  },
  dimensionCard: {
    marginBottom: 15,
    padding: 10,
    border: '1px solid #c0c9cf',
  },
  dimensionTitle: {
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  dimensionScore: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#272842',
  },
  comparison: {
    fontSize: 14.8,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  feedback: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#ffffff',
    fontSize: 14,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 150,
    fontSize: 14.8,
    color: '#272842',
  },
  value: {
    flex: 1,
    fontSize: 14.8,
    color: '#272842',
  },
  // Legacy-specific styles
  pageHeader: {
    marginBottom: 20,
    borderBottom: '4px solid #55a1d8',
    paddingBottom: 10,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  primaryBlue: {
    color: '#55a1d8',
  },
  darkBlue: {
    color: '#272842',
  },
  orangeRed: {
    color: '#f26950',
  },
})

interface DimensionReport360 {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  overall_score: number
  rater_breakdown: {
    peer: number | null
    direct_report: number | null
    supervisor: number | null
    self: number | null
    other: number | null
  }
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  text_feedback: string[]
}

interface Report360Data {
  assignment_id: string
  target_id: string
  target_name: string
  target_email: string
  assessment_id: string
  assessment_title: string
  group_id: string
  group_name: string
  overall_score: number
  dimensions: DimensionReport360[]
  generated_at: string
}

interface DimensionReportLeader {
  dimension_id: string
  dimension_name: string
  dimension_code: string
  target_score: number
  industry_benchmark: number | null
  geonorm: number | null
  geonorm_participant_count: number
  improvement_needed: boolean
  specific_feedback: string | null
  specific_feedback_id: string | null
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
  dimensions: DimensionReportLeader[]
  overall_feedback: string | null
  overall_feedback_id: string | null
  generated_at: string
}

/**
 * Generate PDF buffer for 360 report
 */
export async function generate360ReportPDF(reportData: Report360Data): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{reportData.assessment_title}</Text>
        <Text style={styles.subtitle}>
          360 Assessment Report for {reportData.target_name}
        </Text>

        <View style={styles.section}>
          <Text style={styles.score}>{reportData.overall_score.toFixed(2)}</Text>
          <Text style={styles.subtitle}>Overall Score</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group: {reportData.group_name}</Text>
        </View>

        {reportData.dimensions.map((dimension) => (
          <View key={dimension.dimension_id} style={styles.dimensionCard} break>
            <Text style={styles.dimensionTitle}>{dimension.dimension_name}</Text>
            <Text style={styles.dimensionScore}>
              Score: {dimension.overall_score.toFixed(2)}
            </Text>

            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>
                Rater Breakdown:
              </Text>
              {dimension.rater_breakdown.peer !== null && (
                <Text style={styles.comparison}>
                  Peer: {dimension.rater_breakdown.peer.toFixed(2)}
                </Text>
              )}
              {dimension.rater_breakdown.direct_report !== null && (
                <Text style={styles.comparison}>
                  Direct Report: {dimension.rater_breakdown.direct_report.toFixed(2)}
                </Text>
              )}
              {dimension.rater_breakdown.supervisor !== null && (
                <Text style={styles.comparison}>
                  Supervisor: {dimension.rater_breakdown.supervisor.toFixed(2)}
                </Text>
              )}
              {dimension.rater_breakdown.self !== null && (
                <Text style={styles.comparison}>
                  Self: {dimension.rater_breakdown.self.toFixed(2)}
                </Text>
              )}
            </View>

            {dimension.industry_benchmark !== null && (
              <Text style={styles.comparison}>
                Industry Benchmark: {dimension.industry_benchmark.toFixed(2)}
                {dimension.overall_score < dimension.industry_benchmark ? ' (Below)' : ' (Above)'}
              </Text>
            )}

            {dimension.geonorm !== null && (
              <Text style={styles.comparison}>
                Group Norm (n={dimension.geonorm_participant_count}): {dimension.geonorm.toFixed(2)}
                {dimension.overall_score < dimension.geonorm ? ' (Below)' : ' (Above)'}
              </Text>
            )}

            {dimension.improvement_needed && (
              <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 5 }}>
                ⚠️ Improvement suggested
              </Text>
            )}

            {dimension.text_feedback.length > 0 && (
              <View style={styles.feedback}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Feedback from Raters:</Text>
                {dimension.text_feedback.map((feedback, idx) => (
                  <Text key={idx} style={{ marginBottom: 3 }}>
                    {feedback.replace(/<[^>]*>/g, '')}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  )

  const pdfDoc = pdf(doc)
  const stream = await pdfDoc.toBuffer()
  return await streamToBuffer(stream as unknown as ReadableStream<Uint8Array>)
}

/**
 * Generate PDF buffer for Leader/Blocker report
 */
export async function generateLeaderBlockerReportPDF(reportData: ReportLeaderBlockerData): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{reportData.assessment_title}</Text>
        <Text style={styles.subtitle}>
          Assessment Report for {reportData.user_name}
        </Text>

        <View style={styles.section}>
          <Text style={styles.score}>{reportData.overall_score.toFixed(2)}</Text>
          <Text style={styles.subtitle}>Overall Score</Text>
        </View>

        {reportData.group_name && (
          <View style={styles.section}>
            <Text style={styles.subtitle}>Group: {reportData.group_name}</Text>
          </View>
        )}

        {reportData.dimensions.map((dimension) => (
          <View key={dimension.dimension_id} style={styles.dimensionCard} break>
            <Text style={styles.dimensionTitle}>{dimension.dimension_name}</Text>
            <Text style={styles.dimensionScore}>
              Your Score: {dimension.target_score.toFixed(2)}
            </Text>

            <View style={styles.row}>
              <Text style={styles.label}>Industry Benchmark:</Text>
              <Text style={styles.value}>
                {dimension.industry_benchmark !== null
                  ? `${dimension.industry_benchmark.toFixed(2)} ${
                      dimension.target_score < dimension.industry_benchmark ? '(Below)' : '(Above)'
                    }`
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Group Norm:</Text>
              <Text style={styles.value}>
                {dimension.geonorm !== null
                  ? `${dimension.geonorm.toFixed(2)} (n=${dimension.geonorm_participant_count}) ${
                      dimension.target_score < dimension.geonorm ? '(Below)' : '(Above)'
                    }`
                  : 'N/A'}
              </Text>
            </View>

            {dimension.improvement_needed && (
              <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 5 }}>
                ⚠️ Improvement suggested
              </Text>
            )}

            {dimension.specific_feedback && (
              <View style={styles.feedback}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Feedback:</Text>
                <Text>{dimension.specific_feedback.replace(/<[^>]*>/g, '')}</Text>
              </View>
            )}
          </View>
        ))}

        {reportData.overall_feedback && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Overall Feedback</Text>
            <View style={styles.feedback}>
              <Text>{reportData.overall_feedback.replace(/<[^>]*>/g, '')}</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  )

  const pdfDoc = pdf(doc)
  const stream = await pdfDoc.toBuffer()
  return await streamToBuffer(stream as unknown as ReadableStream<Uint8Array>)
}
