import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AssessmentsTable from '@/app/dashboard/assessments/assessments-table'

describe('AssessmentsTable', () => {
  const mockAssessments = [
    {
      id: '1',
      title: 'Leadership Assessment',
      description: '<p>This is a <strong>leadership</strong> assessment with <em>HTML tags</em></p>',
      type: '360',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Technical Skills',
      description: '<h1>Technical</h1><p>Assessment for technical skills</p>',
      type: 'custom',
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      title: 'No Description Assessment',
      description: null,
      type: 'leader',
      created_at: '2024-01-03T00:00:00.000Z',
      updated_at: '2024-01-03T00:00:00.000Z',
    },
  ]

  it('should render the table with assessments', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    expect(screen.getByText('Leadership Assessment')).toBeInTheDocument()
    expect(screen.getByText('Technical Skills')).toBeInTheDocument()
    expect(screen.getByText('No Description Assessment')).toBeInTheDocument()
  })

  it('should strip HTML tags from descriptions', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    // Check that HTML tags are not visible
    expect(screen.queryByText(/<p>/)).not.toBeInTheDocument()
    expect(screen.queryByText(/<strong>/)).not.toBeInTheDocument()
    expect(screen.queryByText(/<em>/)).not.toBeInTheDocument()
    expect(screen.queryByText(/<h1>/)).not.toBeInTheDocument()
    
    // Check that plain text content is visible
    expect(screen.getByText(/This is a leadership assessment with HTML tags/)).toBeInTheDocument()
    expect(screen.getByText(/TechnicalAssessment for technical skills/)).toBeInTheDocument()
  })

  it('should handle assessments with null descriptions', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    // Should not throw an error
    expect(screen.getByText('No Description Assessment')).toBeInTheDocument()
  })

  it('should render manage benchmarks buttons for each assessment', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    const manageButtons = screen.getAllByText('Manage Benchmarks')
    expect(manageButtons).toHaveLength(3)
  })

  it('should render correct links for manage benchmarks buttons', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    const manageLinks = screen.getAllByRole('link', { name: /manage benchmarks/i })
    expect(manageLinks[0]).toHaveAttribute('href', '/dashboard/benchmarks/manage/1')
    expect(manageLinks[1]).toHaveAttribute('href', '/dashboard/benchmarks/manage/2')
    expect(manageLinks[2]).toHaveAttribute('href', '/dashboard/benchmarks/manage/3')
  })

  it('should display assessment types', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    expect(screen.getByText('360')).toBeInTheDocument()
    expect(screen.getByText('custom')).toBeInTheDocument()
    expect(screen.getByText('leader')).toBeInTheDocument()
  })

  it('should format dates correctly', () => {
    render(<AssessmentsTable initialAssessments={mockAssessments} />)
    
    // Dates should be formatted as locale date strings
    expect(screen.getByText('1/1/2024')).toBeInTheDocument()
    expect(screen.getByText('1/2/2024')).toBeInTheDocument()
    expect(screen.getByText('1/3/2024')).toBeInTheDocument()
  })

  it('should show empty message when no assessments provided', () => {
    render(<AssessmentsTable initialAssessments={[]} />)
    
    expect(screen.getByText('No assessments found.')).toBeInTheDocument()
  })

  it('should truncate long descriptions', () => {
    const longDescriptionAssessment = [
      {
        id: '1',
        title: 'Test',
        description: '<p>This is a very long description that should be truncated when displayed in the table view to prevent layout issues</p>',
        type: 'custom',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ]
    
    const { container } = render(<AssessmentsTable initialAssessments={longDescriptionAssessment} />)
    
    // Check that the description div has truncate class
    const descriptionDiv = container.querySelector('.truncate')
    expect(descriptionDiv).toBeInTheDocument()
    expect(descriptionDiv).toHaveClass('max-w-xs')
  })
})
