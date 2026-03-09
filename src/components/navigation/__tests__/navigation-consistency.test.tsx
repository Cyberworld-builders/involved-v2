import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '../index'
import Sidebar from '../sidebar'
import { UserProfile } from '../types'

/**
 * Navigation Consistency Tests
 *
 * Tests to ensure consistency across navigation components:
 * - Shared styling patterns
 * - Consistent branding
 * - Accessibility standards
 */

// Provide a super_admin userProfile so the sidebar renders navigation items and correct logo href
const superAdminProfile: UserProfile = {
  access_level: 'super_admin',
  name: 'Admin User',
  email: 'admin@example.com',
}

describe('Navigation Consistency', () => {
  describe('Branding Consistency', () => {
    it('should use "Involved Talent" branding in both Header and Sidebar', () => {
      const { unmount: unmountHeader } = render(<Header />)
      const headerBranding = screen.getByText('Involved Talent')
      expect(headerBranding).toBeInTheDocument()
      unmountHeader()

      const { unmount: unmountSidebar } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebarBranding = screen.getByText('Involved Talent')
      expect(sidebarBranding).toBeInTheDocument()
      unmountSidebar()
    })

    it('should use consistent color scheme (indigo)', () => {
      const { unmount: unmountHeader } = render(<Header />)
      const headerLogo = screen.getByText('Involved Talent')
      expect(headerLogo.closest('a')).toHaveClass('text-indigo-600')
      unmountHeader()

      const { container: sidebarContainer, unmount: unmountSidebar } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebarLogo = sidebarContainer.querySelector('.bg-indigo-600')
      expect(sidebarLogo).toBeInTheDocument()
      unmountSidebar()
    })
  })

  describe('Accessibility Standards', () => {
    it('Header should have navigation role', () => {
      render(<Header />)
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('Sidebar should have navigation role', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('Header should have descriptive ARIA label', () => {
      render(<Header />)
      const nav = screen.getByRole('navigation', { name: /main navigation/i })
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Component Export Consistency', () => {
    it('should export Header from index', () => {
      expect(Header).toBeDefined()
      expect(typeof Header).toBe('function')
    })

    it('should render Header component from index export', () => {
      render(<Header />)
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('Header should have responsive container', () => {
      const { container } = render(<Header />)
      const innerContainer = container.querySelector('.container')
      expect(innerContainer).toHaveClass('mx-auto')
    })

    it('Sidebar should support custom className for responsive behavior', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className="md:w-72" />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('md:w-72')
    })
  })

  describe('Link Consistency', () => {
    it('Header logo should link to root', () => {
      render(<Header />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveAttribute('href', '/')
    })

    it('Sidebar logo should link to dashboard', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveAttribute('href', '/dashboard')
    })
  })

  describe('Visual Hierarchy', () => {
    it('Header logo should be prominent', () => {
      render(<Header />)
      const logo = screen.getByText('Involved Talent')
      expect(logo.closest('a')).toHaveClass('text-2xl', 'font-bold')
    })

    it('Sidebar logo should be prominent', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const logo = screen.getByText('Involved Talent')
      expect(logo).toHaveClass('font-semibold')
    })
  })

  describe('Component Reusability', () => {
    it('Header should accept custom className', () => {
      const { container } = render(<Header className="custom-test" />)
      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('custom-test')
    })

    it('Sidebar should accept custom className', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className="custom-test" />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('custom-test')
    })

    it('Header should merge custom classes with defaults', () => {
      const { container } = render(<Header className="border-t" />)
      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('bg-white', 'shadow-sm', 'border-t')
    })

    it('Sidebar should merge custom classes with defaults', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className="custom" />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('w-64', 'custom')
    })
  })
})
