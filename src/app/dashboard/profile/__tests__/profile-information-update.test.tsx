import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfileInformationUpdateClient from '../profile-information-update-client'

// Mock fetch
global.fetch = vi.fn()

const mockInitialProfile = {
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
}

describe('ProfileInformationUpdateClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile update form with initial values', () => {
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    expect(screen.getByText('Profile Information')).toBeInTheDocument()
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('John Doe')
    expect(screen.getByLabelText(/^username$/i)).toHaveValue('johndoe')
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('john@example.com')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('should show error when name is empty', async () => {
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const nameInput = screen.getByLabelText(/^name$/i)
    fireEvent.change(nameInput, { target: { value: '' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })

  it('should show error when username is empty', async () => {
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const usernameInput = screen.getByLabelText(/^username$/i)
    fireEvent.change(usernameInput, { target: { value: '' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument()
    })
  })

  it('should show error when email is empty', async () => {
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const emailInput = screen.getByLabelText(/^email$/i)
    fireEvent.change(emailInput, { target: { value: '' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  it('should show error for invalid email format', async () => {
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const emailInput = screen.getByLabelText(/^email$/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('should successfully update profile', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profile: {
          name: 'Jane Doe',
          username: 'janedoe',
          email: 'jane@example.com',
        },
      }),
    } as Response)
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const nameInput = screen.getByLabelText(/^name$/i)
    const usernameInput = screen.getByLabelText(/^username$/i)
    const emailInput = screen.getByLabelText(/^email$/i)
    
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })
    fireEvent.change(usernameInput, { target: { value: 'janedoe' } })
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument()
    })
    
    // Verify form values are updated
    expect(nameInput).toHaveValue('Jane Doe')
    expect(usernameInput).toHaveValue('janedoe')
    expect(emailInput).toHaveValue('jane@example.com')
    
    // Verify API was called correctly
    expect(fetch).toHaveBeenCalledWith('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Jane Doe',
        username: 'janedoe',
        email: 'jane@example.com',
      }),
    })
  })

  it('should show error when API returns error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Username is already taken' }),
    } as Response)
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const usernameInput = screen.getByLabelText(/^username$/i)
    fireEvent.change(usernameInput, { target: { value: 'existinguser' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Username is already taken')).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const nameInput = screen.getByLabelText(/^name$/i)
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
    })
  })

  it('should disable form inputs while loading', async () => {
    // Mock a slow API response
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ profile: mockInitialProfile }),
      } as Response), 100))
    )
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const nameInput = screen.getByLabelText(/^name$/i)
    const usernameInput = screen.getByLabelText(/^username$/i)
    const emailInput = screen.getByLabelText(/^email$/i)
    
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    // Check that button text changes and inputs are disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating profile/i })).toBeInTheDocument()
    })
    
    expect(nameInput).toBeDisabled()
    expect(usernameInput).toBeDisabled()
    expect(emailInput).toBeDisabled()
  })

  it('should trim whitespace from input values', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profile: {
          name: 'Trimmed Name',
          username: 'trimmeduser',
          email: 'trimmed@example.com',
        },
      }),
    } as Response)
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const nameInput = screen.getByLabelText(/^name$/i)
    const usernameInput = screen.getByLabelText(/^username$/i)
    const emailInput = screen.getByLabelText(/^email$/i)
    
    fireEvent.change(nameInput, { target: { value: '  Trimmed Name  ' } })
    fireEvent.change(usernameInput, { target: { value: '  trimmeduser  ' } })
    fireEvent.change(emailInput, { target: { value: '  trimmed@example.com  ' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Trimmed Name',
          username: 'trimmeduser',
          email: 'trimmed@example.com',
        }),
      })
    })
  })

  it('should update form when initial profile prop changes', () => {
    const { rerender } = render(
      <ProfileInformationUpdateClient initialProfile={mockInitialProfile} />
    )
    
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('John Doe')
    
    // Update initial profile
    const updatedProfile = {
      name: 'Updated Name',
      username: 'updateduser',
      email: 'updated@example.com',
    }
    
    rerender(<ProfileInformationUpdateClient initialProfile={updatedProfile} />)
    
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Updated Name')
    expect(screen.getByLabelText(/^username$/i)).toHaveValue('updateduser')
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('updated@example.com')
  })

  it('should show error when email is already in use', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email is already in use' }),
    } as Response)
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const emailInput = screen.getByLabelText(/^email$/i)
    fireEvent.change(emailInput, { target: { value: 'taken@example.com' } })
    
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Email is already in use')).toBeInTheDocument()
    })
  })

  it('should accept valid email formats', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: mockInitialProfile }),
    } as Response)
    
    render(<ProfileInformationUpdateClient initialProfile={mockInitialProfile} />)
    
    const emailInput = screen.getByLabelText(/^email$/i)
    
    // Test various valid email formats
    const validEmails = [
      'test@example.com',
      'test.name@example.com',
      'test+tag@example.co.uk',
      'test_name@sub.example.com',
    ]
    
    for (const email of validEmails) {
      fireEvent.change(emailInput, { target: { value: email } })
      
      const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
      fireEvent.submit(form)
      
      // Should not show validation error for valid emails
      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
      })
    }
  })
})
