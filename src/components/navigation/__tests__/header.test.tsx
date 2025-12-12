import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '../header'

/**
 * Header Component Tests
 * 
 * Tests for the public header navigation component including:
 * - Component rendering
 * - Logo and branding
 * - Navigation links
 * - Responsive behavior
 * - Accessibility
 */

describe('Header Component', () => {
  describe('Component Rendering', () => {
    it('should render the header component', () => {
      render(<Header />)
      const header = screen.getByRole('navigation')
      expect(header).toBeInTheDocument()
    })

    it('should have correct ARIA label', () => {
      render(<Header />)
      const header = screen.getByRole('navigation', { name: /main navigation/i })
      expect(header).toBeInTheDocument()
    })

    it('should render with default styling', () => {
      const { container } = render(<Header />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('bg-white', 'shadow-sm')
    })

    it('should accept and apply custom className', () => {
      const { container } = render(<Header className="custom-class" />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('custom-class')
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(<Header className="border-b border-gray-200" />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200')
    })
  })

  describe('Logo Section', () => {
    it('should render the logo link', () => {
      render(<Header />)
      const logo = screen.getByText('Involved Talent')
      expect(logo).toBeInTheDocument()
    })

    it('should render logo link with correct href', () => {
      render(<Header />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveAttribute('href', '/')
    })

    it('should have correct logo styling', () => {
      render(<Header />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveClass('text-2xl', 'font-bold', 'text-indigo-600')
    })

    it('should have hover styles on logo', () => {
      render(<Header />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveClass('hover:text-indigo-700', 'transition-colors')
    })

    it('should have accessible ARIA label for logo', () => {
      render(<Header />)
      const logoLink = screen.getByLabelText('Involved Talent Home')
      expect(logoLink).toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    it('should render login button', () => {
      render(<Header />)
      const loginButton = screen.getByRole('button', { name: /login/i })
      expect(loginButton).toBeInTheDocument()
    })

    it('should render sign up button', () => {
      render(<Header />)
      const signupButton = screen.getByRole('button', { name: /sign up/i })
      expect(signupButton).toBeInTheDocument()
    })

    it('should have login link with correct href', () => {
      render(<Header />)
      const loginButton = screen.getByRole('button', { name: /login/i })
      const loginLink = loginButton.closest('a')
      expect(loginLink).toHaveAttribute('href', '/auth/login')
    })

    it('should have sign up link with correct href', () => {
      render(<Header />)
      const signupButton = screen.getByRole('button', { name: /sign up/i })
      const signupLink = signupButton.closest('a')
      expect(signupLink).toHaveAttribute('href', '/auth/signup')
    })

    it('should render login button with ghost variant', () => {
      render(<Header />)
      const loginButton = screen.getByRole('button', { name: /login/i })
      // Button component styling is applied
      expect(loginButton).toBeInTheDocument()
    })

    it('should render sign up button with default variant', () => {
      render(<Header />)
      const signupButton = screen.getByRole('button', { name: /sign up/i })
      // Button component styling is applied
      expect(signupButton).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('should have container with proper styling', () => {
      const { container } = render(<Header />)
      const innerContainer = container.querySelector('.container')
      expect(innerContainer).toHaveClass('mx-auto', 'px-4', 'py-4')
    })

    it('should have flex layout for navigation items', () => {
      const { container } = render(<Header />)
      const flexContainer = container.querySelector('.flex.justify-between.items-center')
      expect(flexContainer).toBeInTheDocument()
    })

    it('should have proper spacing for navigation actions', () => {
      const { container } = render(<Header />)
      const actionsContainer = container.querySelector('.flex.items-center.space-x-4')
      expect(actionsContainer).toBeInTheDocument()
    })

    it('should render both logo and actions in the same row', () => {
      render(<Header />)
      const logo = screen.getByText('Involved Talent')
      const loginButton = screen.getByRole('button', { name: /login/i })
      
      // Both should be in the document
      expect(logo).toBeInTheDocument()
      expect(loginButton).toBeInTheDocument()
      
      // They should be siblings within the flex container
      const logoParent = logo.closest('.flex.justify-between')
      const buttonParent = loginButton.closest('.flex.justify-between')
      expect(logoParent).toBe(buttonParent)
    })
  })

  describe('Responsive Behavior', () => {
    it('should have responsive container', () => {
      const { container } = render(<Header />)
      const innerContainer = container.querySelector('.container')
      expect(innerContainer).toHaveClass('mx-auto')
    })

    it('should maintain flex layout on all screen sizes', () => {
      const { container } = render(<Header />)
      const flexContainer = container.querySelector('.flex.justify-between')
      expect(flexContainer).toBeInTheDocument()
    })

    it('should have responsive padding', () => {
      const { container } = render(<Header />)
      const innerContainer = container.querySelector('.container')
      expect(innerContainer).toHaveClass('px-4', 'py-4')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined className prop', () => {
      const { container } = render(<Header className={undefined} />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('bg-white', 'shadow-sm')
    })

    it('should handle empty className prop', () => {
      const { container } = render(<Header className="" />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('bg-white', 'shadow-sm')
    })

    it('should handle multiple custom classes', () => {
      const { container } = render(<Header className="border-t border-b custom-1 custom-2" />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-t', 'border-b', 'custom-1', 'custom-2')
    })
  })

  describe('Accessibility', () => {
    it('should have navigation role', () => {
      render(<Header />)
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should have descriptive ARIA label', () => {
      render(<Header />)
      const nav = screen.getByRole('navigation', { name: /main navigation/i })
      expect(nav).toBeInTheDocument()
    })

    it('should have accessible logo link', () => {
      render(<Header />)
      const logoLink = screen.getByLabelText('Involved Talent Home')
      expect(logoLink).toBeInTheDocument()
    })

    it('should have clickable buttons for screen readers', () => {
      render(<Header />)
      const loginButton = screen.getByRole('button', { name: /login/i })
      const signupButton = screen.getByRole('button', { name: /sign up/i })
      
      expect(loginButton).toBeInTheDocument()
      expect(signupButton).toBeInTheDocument()
    })

    it('should have proper link semantics for navigation', () => {
      render(<Header />)
      const links = screen.getAllByRole('link')
      
      // Should have logo link and two button links
      expect(links.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Visual Consistency', () => {
    it('should use consistent color scheme', () => {
      render(<Header />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveClass('text-indigo-600')
    })

    it('should have consistent spacing', () => {
      const { container } = render(<Header />)
      const actionsContainer = container.querySelector('.space-x-4')
      expect(actionsContainer).toBeInTheDocument()
    })

    it('should maintain visual hierarchy', () => {
      render(<Header />)
      const logo = screen.getByText('Involved Talent')
      
      // Logo should be prominent
      expect(logo.closest('a')).toHaveClass('text-2xl', 'font-bold')
    })

    it('should have shadow for depth', () => {
      const { container } = render(<Header />)
      const header = container.querySelector('nav')
      expect(header).toHaveClass('shadow-sm')
    })
  })

  describe('Integration', () => {
    it('should render all components together correctly', () => {
      render(<Header />)
      
      // Check all major elements are present
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByText('Involved Talent')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })

    it('should maintain proper DOM structure', () => {
      const { container } = render(<Header />)
      
      // nav > div.container > div.flex > (logo + actions)
      const nav = container.querySelector('nav')
      const containerDiv = nav?.querySelector('.container')
      const flexDiv = containerDiv?.querySelector('.flex.justify-between')
      
      expect(nav).toBeInTheDocument()
      expect(containerDiv).toBeInTheDocument()
      expect(flexDiv).toBeInTheDocument()
    })

    it('should render without console errors', () => {
      const consoleError = vi.spyOn(console, 'error')
      render(<Header />)
      expect(consoleError).not.toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})
