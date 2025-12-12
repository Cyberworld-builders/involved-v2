import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import UserForm from '../user-form'

vi.mock('@/lib/utils/username-generation', () => ({
  generateUsernameFromName: vi.fn((name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')),
}))

describe('UserForm', () => {
  const clients = [
    { id: 'client-1', name: 'Client A' },
    { id: 'client-2', name: 'Client B' },
  ]

  const industries = [
    { id: 'industry-1', name: 'Technology' },
    { id: 'industry-2', name: 'Healthcare' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-generates username from name and submits with selected industry', () => {
    const onSubmit = vi.fn()

    render(
      <UserForm
        onSubmit={onSubmit}
        clients={clients}
        industries={industries}
        submitText="Create User"
      />
    )

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Smith' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'jane@example.com' } })

    // Select client + industry
    fireEvent.change(screen.getByLabelText('Client Organization'), { target: { value: 'client-2' } })
    fireEvent.change(screen.getByLabelText('Industry'), { target: { value: 'industry-1' } })

    // Username should have been auto-generated
    expect(screen.getByLabelText('Username')).toHaveValue('janesmith')

    fireEvent.click(screen.getByRole('button', { name: 'Create User' }))

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'janesmith',
      name: 'Jane Smith',
      email: 'jane@example.com',
      client_id: 'client-2',
      industry_id: 'industry-1',
    })
  })

  it('preselects industry from initialData', () => {
    const onSubmit = vi.fn()

    render(
      <UserForm
        onSubmit={onSubmit}
        clients={clients}
        industries={industries}
        initialData={{
          username: 'john',
          name: 'John Doe',
          email: 'john@example.com',
          client_id: 'client-1',
          industry_id: 'industry-2',
        }}
        submitText="Update User"
      />
    )

    expect(screen.getByLabelText('Industry')).toHaveValue('industry-2')
  })
})
