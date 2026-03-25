/**
 * Pure layout math for horizontal bar charts (PDF / fullscreen reports).
 * Keeps x-axis tick labels below the bar region with a minimum gap.
 */

/** Minimum px between the bottom of the lowest bar and where tick labels sit (client spec: 15–20px). */
export const X_AXIS_LABEL_GAP_PX = 16

/**
 * Space below the gap for the 0–5 tick labels (line-height + small buffer). Span uses inline marginTop: 0
 * so labels sit tight under the bars; this reserve keeps `.bars` tall enough to clear the GEONORM row.
 */
export const X_AXIS_TICK_TEXT_RESERVE_PX = 22

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

/** Total `.graph` / `.bars` height: bar rows + gap above ticks + room for tick number text below the gap. */
export function computeGraphContainerHeight(
  barsRegionHeight: number,
  labelGapPx: number = X_AXIS_LABEL_GAP_PX,
  tickTextReservePx: number = X_AXIS_TICK_TEXT_RESERVE_PX
): number {
  return barsRegionHeight + labelGapPx + tickTextReservePx
}
