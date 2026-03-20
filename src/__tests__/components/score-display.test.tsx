import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ScoreDisplay from '@/components/reports/charts/score-display'

describe('ScoreDisplay', () => {
  it('uses report-score-display so legacy .chart .score float layout does not apply', () => {
    const { container } = render(
      <div className="chart">
        <ScoreDisplay score={3.5} maxValue={5} label="out of 5" size="large" />
      </div>
    )

    expect(container.querySelector('.chart .score')).toBeNull()
    expect(container.querySelector('.report-score-display')).not.toBeNull()
    expect(container.querySelector('.report-score-display')).toHaveTextContent('3.5')
  })
})
