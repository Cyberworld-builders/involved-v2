/**
 * Pure layout math for horizontal bar charts (PDF / fullscreen reports).
 * Keeps x-axis tick labels below the bar region with a minimum gap.
 */

/** Minimum px between the bottom of the lowest bar and the axis number text (client spec: 15–20px; use ~22 for PDF). */
export const X_AXIS_LABEL_GAP_PX = 22

export function computeBarsRegionHeight(
  barCount: number,
  barHeight: number,
  rowGap: number
): number {
  if (barCount <= 0) return 0
  return barCount * barHeight + (barCount - 1) * rowGap
}

/** Padding from top of graph to axis labels (grid line tick position). */
export function computeAxisLinePaddingTop(
  barsRegionHeight: number,
  labelGapPx: number = X_AXIS_LABEL_GAP_PX
): number {
  return barsRegionHeight + labelGapPx
}
