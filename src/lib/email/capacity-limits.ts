// Tested capacity ceilings for the email dashboard's capacity panel.
// These are *tested* limits, not theoretical. When infra changes (AWS auth
// path, Vercel plan, Supabase compute, SES quota), re-run scripts/canary.ts
// against staging and prod, then update both the constants here AND the
// reference table in docs/EMAIL_OBSERVABILITY.md.
//
// LAST VERIFIED: 2026-04-29

export const CAPACITY_LIMITS = {
  /** Max parallel sends in a single send-batch-email call before STS throttling kicks in. */
  batchAssignmentParallel: 450,
  /** Max sequential sends in one send-reminders cron run before Supabase compute limits hit. */
  reminderSequentialPerRun: 500,
  /** SES account-level daily quota at last `aws ses get-send-quota` check. */
  sesDailyQuota: 50_000,
  /** Date the values above were last verified by running canary harness end-to-end. */
  lastVerified: '2026-04-29',
} as const

/**
 * Classify the volume of a planned send batch against tested capacity.
 * Returns the warning level + the math the UI should display.
 */
export function classifyBatchVolume(plannedSends: number): {
  level: 'green' | 'yellow' | 'red'
  ceiling: number
  utilization: number
  message: string
} {
  const ceiling = CAPACITY_LIMITS.batchAssignmentParallel
  const utilization = plannedSends / ceiling
  if (utilization > 1) {
    return {
      level: 'red',
      ceiling,
      utilization,
      message: `Queued ${plannedSends} emails; exceeds tested ceiling of ${ceiling}. Recommend splitting into ${Math.ceil(plannedSends / ceiling)} batches or staggering.`,
    }
  }
  if (utilization > 0.5) {
    return {
      level: 'yellow',
      ceiling,
      utilization,
      message: `Queued ${plannedSends} emails; tested up to ${ceiling} per batch. Should send cleanly. Consider splitting if reliability is critical.`,
    }
  }
  return {
    level: 'green',
    ceiling,
    utilization,
    message: `Queued ${plannedSends} emails (${Math.round(utilization * 100)}% of tested ceiling).`,
  }
}
