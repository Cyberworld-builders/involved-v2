import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfilePasswordUpdateClient from '../profile-password-update-client'

// Mock fetch
global.fetch = vi.fn()

describe('ProfilePasswordUpdateClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render password update form', () => {
    render(<ProfilePasswordUpdateClient />)
    
    expect(screen.getByText('Change Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })

  it('should show error when current password is missing', async () => {
    render(<ProfilePasswordUpdateClient />)
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument()
    })
  })

  it('should show error when new password is missing', async () => {
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('New password is required')).toBeInTheDocument()
    })
  })

  it('should show error when new password is too short', async () => {
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'short' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('New password must be at least 8 characters long')).toBeInTheDocument()
    })
  })

  it('should show error when passwords do not match', async () => {
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument()
    })
  })

  it('should show error when new password is same as current password', async () => {
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'SamePassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'SamePassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'SamePassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('New password must be different from current password')).toBeInTheDocument()
    })
  })

  it('should successfully update password', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Password updated successfully' }),
    } as Response)
    
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Password updated successfully!')).toBeInTheDocument()
    })
    
    // Verify form was cleared
    expect(currentPasswordInput).toHaveValue('')
    expect(newPasswordInput).toHaveValue('')
    expect(confirmPasswordInput).toHaveValue('')
    
    // Verify API was called correctly
    expect(fetch).toHaveBeenCalledWith('/api/auth/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    })
  })

  it('should show error when API returns error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Current password is incorrect' }),
    } as Response)
    
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'WrongPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
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
        json: async () => ({ success: true, message: 'Password updated successfully' }),
      } as Response), 100))
    )
    
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123!' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    // Check that button text changes and inputs are disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating password/i })).toBeInTheDocument()
    })
    
    expect(currentPasswordInput).toBeDisabled()
    expect(newPasswordInput).toBeDisabled()
    expect(confirmPasswordInput).toBeDisabled()
  })

  it('should allow exactly 8 character passwords', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Password updated successfully' }),
    } as Response)
    
    render(<ProfilePasswordUpdateClient />)
    
    const currentPasswordInput = screen.getByLabelText(/current password/i)
    const newPasswordInput = screen.getByLabelText(/^new password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPass1' } })
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass1' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass1' } })
    
    const form = screen.getByRole('button', { name: /update password/i }).closest('form')!
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(screen.getByText('Password updated successfully!')).toBeInTheDocument()
    })
  })
})
