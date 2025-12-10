import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

/**
 * Example component test file
 * 
 * This demonstrates how to test React components using React Testing Library.
 * Use this as a template when creating component tests.
 */

describe('Example Component', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByText('Click me')
    await button.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
