import { describe, it, expect } from 'vitest'
import {
  computeAxisLinePaddingTop,
  computeBarsRegionHeight,
  computeGraphContainerHeight,
  X_AXIS_LABEL_GAP_PX,
  X_AXIS_TICK_TEXT_RESERVE_PX,
} from '@/lib/reports/chart-axis-layout'

describe('chart-axis-layout', () => {
  it('computeBarsRegionHeight matches 5 rows × (40+12) − 12', () => {
    const barHeight = 40
    const rowGap = 12
    const n = 5
    expect(computeBarsRegionHeight(n, barHeight, rowGap)).toBe(5 * 40 + 4 * 12)
  })

  it('computeAxisLinePaddingTop adds label gap below bar region', () => {
    const barsH = 248
    expect(computeAxisLinePaddingTop(barsH)).toBe(barsH + X_AXIS_LABEL_GAP_PX)
  })

  it('computeGraphContainerHeight adds tick text reserve so 0–5 labels do not overlap norms row', () => {
    const barsH = 248
    expect(computeGraphContainerHeight(barsH)).toBe(
      barsH + X_AXIS_LABEL_GAP_PX + X_AXIS_TICK_TEXT_RESERVE_PX
    )
  })
})
