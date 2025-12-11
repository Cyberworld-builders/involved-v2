import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from '../sidebar'
import * as navigation from 'next/navigation'

/**
 * Navigation Component (Sidebar) Tests
 * 
 * Tests for the main navigation component including:
 * - Component rendering
 * - Navigation links presence
 * - Active link highlighting
 * - Responsive behavior
 */

describe('Sidebar Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    // Reset usePathname to default
    vi.mocked(navigation.usePathname).mockReturnValue('/')
  })

  describe('Component Rendering', () => {
    it('should render the sidebar component', () => {
      render(<Sidebar />)
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toBeInTheDocument()
    })

    it('should render the logo section', () => {
      render(<Sidebar />)
      expect(screen.getByText('Involved Talent')).toBeInTheDocument()
      expect(screen.getByText('IT')).toBeInTheDocument()
    })

    it('should render the user section', () => {
      render(<Sidebar />)
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should render all navigation links', () => {
      render(<Sidebar />)
      
      const expectedLinks = [
        'Home',
        'Assessments',
        'Clients',
        'Users',
        'Industries',
        'Benchmarks',
        'Feedback',
      ]

      expectedLinks.forEach((linkText) => {
        expect(screen.getByText(linkText)).toBeInTheDocument()
      })
    })

    it('should render correct href attributes for navigation links', () => {
      render(<Sidebar />)
      
      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).toHaveAttribute('href', '/dashboard')

      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).toHaveAttribute('href', '/dashboard/assessments')

      const clientsLink = screen.getByText('Clients').closest('a')
      expect(clientsLink).toHaveAttribute('href', '/dashboard/clients')

      const usersLink = screen.getByText('Users').closest('a')
      expect(usersLink).toHaveAttribute('href', '/dashboard/users')

      const industriesLink = screen.getByText('Industries').closest('a')
      expect(industriesLink).toHaveAttribute('href', '/dashboard/industries')

      const benchmarksLink = screen.getByText('Benchmarks').closest('a')
      expect(benchmarksLink).toHaveAttribute('href', '/dashboard/benchmarks')

      const feedbackLink = screen.getByText('Feedback').closest('a')
      expect(feedbackLink).toHaveAttribute('href', '/dashboard/feedback')
    })

    it('should render navigation icons for each link', () => {
      render(<Sidebar />)
      
      const expectedIcons = ['🏠', '📋', '🏢', '👥', '🏭', '📊', '💬']
      
      expectedIcons.forEach((icon) => {
        expect(screen.getByText(icon)).toBeInTheDocument()
      })
    })
  })

  describe('Active Link Highlighting', () => {
    it('should highlight the active link based on pathname', () => {
      // Mock usePathname to return a specific path
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
      
      render(<Sidebar />)
      
      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).toHaveClass('bg-indigo-600', 'text-white')
    })

    it('should not highlight inactive links', () => {
      // Mock usePathname to return a specific path
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
      
      render(<Sidebar />)
      
      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).not.toHaveClass('bg-indigo-600')
      expect(assessmentsLink).toHaveClass('text-gray-300')
    })

    it('should highlight assessments link when on assessments page', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard/assessments')
      
      render(<Sidebar />)
      
      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).toHaveClass('bg-indigo-600', 'text-white')
    })

    it('should highlight clients link when on clients page', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard/clients')
      
      render(<Sidebar />)
      
      const clientsLink = screen.getByText('Clients').closest('a')
      expect(clientsLink).toHaveClass('bg-indigo-600', 'text-white')
    })

    it('should apply hover classes to inactive links', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
      
      render(<Sidebar />)
      
      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).toHaveClass('hover:bg-gray-700', 'hover:text-white')
    })
  })

  describe('Responsive Behavior', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(<Sidebar className="custom-class" />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('custom-class')
    })

    it('should apply default width class', () => {
      const { container } = render(<Sidebar />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('w-64')
    })

    it('should apply flex column layout', () => {
      const { container } = render(<Sidebar />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('flex', 'h-full', 'flex-col')
    })

    it('should apply background color', () => {
      const { container } = render(<Sidebar />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('bg-gray-900')
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(<Sidebar className="md:w-72" />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('w-64', 'md:w-72')
    })
  })

  describe('Logo Section', () => {
    it('should render logo link pointing to dashboard', () => {
      render(<Sidebar />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveAttribute('href', '/dashboard')
    })

    it('should render logo with correct styling', () => {
      render(<Sidebar />)
      const logoText = screen.getByText('IT')
      const logoContainer = logoText.closest('div')
      expect(logoContainer).toHaveClass('h-8', 'w-8', 'rounded', 'bg-indigo-600')
    })
  })

  describe('User Section', () => {
    it('should render user avatar placeholder', () => {
      render(<Sidebar />)
      expect(screen.getByText('👤')).toBeInTheDocument()
    })

    it('should render user name and email', () => {
      render(<Sidebar />)
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    })

    it('should render user section at bottom with border', () => {
      render(<Sidebar />)
      const userSection = screen.getByText('Admin User').closest('div')?.parentElement?.parentElement
      expect(userSection).toHaveClass('border-t', 'border-gray-700', 'p-4')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined className prop', () => {
      const { container } = render(<Sidebar className={undefined} />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('w-64')
    })

    it('should handle empty className prop', () => {
      const { container } = render(<Sidebar className="" />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('w-64')
    })

    it('should render when pathname is null', () => {
      vi.mocked(navigation.usePathname).mockReturnValue(null as unknown as string)
      
      const { container } = render(<Sidebar />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render when pathname is empty string', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('')
      
      const { container } = render(<Sidebar />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle pathname with trailing slash', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard/')
      
      render(<Sidebar />)
      
      // The link should not match because pathname has trailing slash
      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).not.toHaveClass('bg-indigo-600')
    })

    it('should not highlight links for unmatched pathnames', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/unknown-page')
      
      render(<Sidebar />)
      
      // Get all navigation links (inside the nav element, not including logo)
      const nav = screen.getByRole('navigation')
      const navLinks = Array.from(nav.querySelectorAll('a'))
      
      // Should have 7 navigation links
      expect(navLinks).toHaveLength(7)
      
      navLinks.forEach((link) => {
        expect(link).not.toHaveClass('bg-indigo-600')
        expect(link).toHaveClass('text-gray-300')
      })
    })
  })

  describe('Navigation Structure', () => {
    it('should have correct number of navigation items', () => {
      render(<Sidebar />)
      const nav = screen.getByRole('navigation')
      const links = nav.querySelectorAll('a')
      // 7 navigation items inside the nav element (logo is outside in a separate div)
      expect(links.length).toBe(7)
    })

    it('should render navigation items in correct order', () => {
      render(<Sidebar />)
      const nav = screen.getByRole('navigation')
      const links = Array.from(nav.querySelectorAll('a'))
      
      const expectedOrder = [
        'Home',
        'Assessments',
        'Clients',
        'Users',
        'Industries',
        'Benchmarks',
        'Feedback',
      ]
      
      // Verify we have the expected number of links
      expect(links).toHaveLength(expectedOrder.length)
      
      expectedOrder.forEach((text, index) => {
        expect(links[index]).toHaveTextContent(text)
      })
    })

    it('should apply correct spacing to navigation section', () => {
      render(<Sidebar />)
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('flex-1', 'space-y-1', 'px-2', 'py-4')
    })
  })
})
