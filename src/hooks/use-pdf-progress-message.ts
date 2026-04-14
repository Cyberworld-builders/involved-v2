'use client'

import { useEffect, useState } from 'react'

const PROGRESS_MESSAGES = [
  'Preparing report data…',
  'Rendering dimensions…',
  'Composing pages…',
  'Applying styles…',
  'Stitching layout…',
  'Finalizing PDF…',
  'Almost there…',
]

const ROTATE_MS = 3500

/**
 * Rotates through friendly progress verbs while a long-running PDF job runs.
 * Pass `active=true` while the job is in flight; returns the current message.
 * Hides the underlying retry mechanics from the user.
 */
export function usePdfProgressMessage(active: boolean): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % PROGRESS_MESSAGES.length)
    }, ROTATE_MS)
    return () => clearInterval(interval)
  }, [active])

  return PROGRESS_MESSAGES[index]
}
