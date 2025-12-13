import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import AssessmentsTable from '../assessments-table'

const mockAssessments = [
  {
    id: 'assessment-1',
    title: 'Leadership Assessment',
    description: 'Test leadership skills',
    type: 'leadership',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'assessment-2',
    title: 'Technical Assessment',
    description: null,
    type: 'technical',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

describe('AssessmentsTable', () => {
  it('should render assessments list with all assessments', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    expect(screen.getByText('Leadership Assessment')).toBeInTheDocument()
    expect(screen.getByText('Technical Assessment')).toBeInTheDocument()
  })

  it('should display assessment descriptions', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    expect(screen.getByText('Test leadership skills')).toBeInTheDocument()
  })

  it('should display assessment types', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    expect(screen.getByText('leadership')).toBeInTheDocument()
    expect(screen.getByText('technical')).toBeInTheDocument()
  })

  it('should display formatted dates', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    const expectedDates = mockAssessments.map((a) =>
      new Date(a.created_at).toLocaleDateString(undefined, { timeZone: 'UTC' })
    )
    for (const date of expectedDates) {
      expect(screen.getByText(date)).toBeInTheDocument()
    }
  })

  it('should not have View or Edit buttons', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    expect(screen.queryByText('View')).not.toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('should have Manage Benchmarks button for each assessment', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    const manageBenchmarksButtons = screen.getAllByText('Manage Benchmarks')
    expect(manageBenchmarksButtons).toHaveLength(2)
  })

  it('should have correct Manage Benchmarks links', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    const manageBenchmarksButtons = screen.getAllByText('Manage Benchmarks')
    
    expect(manageBenchmarksButtons[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/manage/assessment-1'
    )
    expect(manageBenchmarksButtons[1].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/benchmarks/manage/assessment-2'
    )
  })

  it('should render table headers correctly', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('should show message when no assessments are provided', () => {
    render(<AssessmentsTable initialAssessments={[]} />)

    expect(screen.getByText('No assessments found.')).toBeInTheDocument()
  })
})
