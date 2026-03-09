import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import EditAssignmentClient from '../edit-assignment-client'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: vi.fn(() => '/dashboard/assignments/test-id/edit'),
  useSearchParams: () => new URLSearchParams(),
}))

const baseAssignment = {
  id: 'test-id',
  user_id: 'user-1',
  assessment_id: 'assess-1',
  survey_id: null as string | null,
  expires: '2026-03-15T23:59:59.999Z',
  completed: false,
  completed_at: null as string | null,
  created_at: '2026-01-01T00:00:00.000Z',
  url: 'https://example.com/assignment/test-id',
  whitelabel: null as boolean | null,
  user: { id: 'user-1', name: 'Alice Johnson', email: 'alice@example.com', username: 'alice' },
  assessment: { id: 'assess-1', title: 'Leadership 360', description: null },
}

describe('EditAssignmentClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders assignment details: user name, assessment title, and status', () => {
    render(<EditAssignmentClient assignment={baseAssignment} />)

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Leadership 360')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows Completed status when assignment is completed', () => {
    render(
      <EditAssignmentClient
        assignment={{ ...baseAssignment, completed: true, completed_at: '2026-02-01T12:00:00Z' }}
      />
    )

    const badges = screen.getAllByText('Completed')
    expect(badges.length).toBeGreaterThanOrEqual(1)
    // The status badge should have the green styling
    const statusBadge = badges.find(el => el.classList.contains('bg-green-100'))
    expect(statusBadge).toBeDefined()
  })

  it('shows Expired status when assignment is expired and not completed', () => {
    render(
      <EditAssignmentClient
        assignment={{ ...baseAssignment, completed: false, expires: '2020-01-01T00:00:00.000Z' }}
      />
    )

    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('shows expiration date input', () => {
    render(<EditAssignmentClient assignment={baseAssignment} />)

    expect(screen.getByText('Expiration Date')).toBeInTheDocument()
    const dateInput = screen.getByDisplayValue('2026-03-15')
    expect(dateInput).toBeInTheDocument()
    expect(dateInput).toHaveAttribute('type', 'date')
  })

  it('shows delete button', () => {
    render(<EditAssignmentClient assignment={baseAssignment} />)

    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('shows delete confirmation dialog when delete button is clicked', async () => {
    render(<EditAssignmentClient assignment={baseAssignment} />)

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to delete this assignment? This action cannot be undone.')
      ).toBeInTheDocument()
    })
  })

  it('shows "Add Users to Survey" link when assignment has survey_id', () => {
    render(
      <EditAssignmentClient assignment={{ ...baseAssignment, survey_id: 'survey-123' }} />
    )

    const link = screen.getByText('Add Users to Survey', { selector: 'a *' })
      || screen.getByRole('link', { name: /add users to survey/i })
    expect(link).toBeInTheDocument()
  })

  it('hides "Add Users to Survey" when no survey_id', () => {
    render(<EditAssignmentClient assignment={{ ...baseAssignment, survey_id: null }} />)

    expect(screen.queryByText('Add Users to Survey')).not.toBeInTheDocument()
  })

  it('shows expired message when assignment is expired and not completed', () => {
    render(
      <EditAssignmentClient
        assignment={{ ...baseAssignment, completed: false, expires: '2020-01-01T00:00:00.000Z' }}
      />
    )

    expect(screen.getByText(/This assignment has expired/)).toBeInTheDocument()
  })

  it('renders the page header', () => {
    render(<EditAssignmentClient assignment={baseAssignment} />)

    expect(screen.getByText('Edit Assignment')).toBeInTheDocument()
    expect(screen.getByText('Back to Assignment')).toBeInTheDocument()
  })
})
