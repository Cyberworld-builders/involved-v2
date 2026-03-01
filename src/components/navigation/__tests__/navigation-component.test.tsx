import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../sidebar'
import { UserProfile } from '../types'
import * as navigation from 'next/navigation'

// Mock Supabase client (still needed for signOut)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'admin@example.com' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}))

// Mock getUserProfile (not used when userProfile prop is provided, but keep for safety)
vi.mock('@/lib/utils/get-user-profile', () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    id: 'test-profile-id',
    name: 'Admin User',
    email: 'admin@example.com',
    access_level: 'super_admin',
    role: 'manager',
    client_id: 'test-client-id',
  }),
}))

/**
 * Navigation Component (Sidebar) Tests
 *
 * Tests for the main navigation component including:
 * - Component rendering
 * - Navigation links presence
 * - Active link highlighting
 * - Responsive behavior
 */

// Provide a super_admin userProfile so navigation items render immediately (no async loading)
const superAdminProfile: UserProfile = {
  access_level: 'super_admin',
  name: 'Admin User',
  email: 'admin@example.com',
}

// Expected navigation items for super_admin - update this if navigation items change
// super_admin sees: adminNavigation + superAdminNavigation + profileNavigation
// (no "My Assignments" because super_admins don't get that item)
const EXPECTED_NAVIGATION_ITEMS = [
  'Home',
  'Assessments',
  'Clients',
  'Users',
  'Industries',
  'Benchmarks',
  'Feedback',
  'Resources',
  'Email',
  'Profile',
]

describe('Sidebar Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    // Reset usePathname to default
    vi.mocked(navigation.usePathname).mockReturnValue('/')
  })

  describe('Component Rendering', () => {
    it('should render the sidebar component', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toBeInTheDocument()
    })

    it('should have accessible ARIA label', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = screen.getByRole('navigation', { name: /dashboard navigation/i })
      expect(sidebar).toBeInTheDocument()
    })

    it('should render the logo section', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      expect(screen.getByText('Involved Talent')).toBeInTheDocument()
      expect(screen.getByText('IT')).toBeInTheDocument()
    })

    it('should render the user section', async () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      expect(await screen.findByText('Admin User')).toBeInTheDocument()
      expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should render all navigation links', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      
      EXPECTED_NAVIGATION_ITEMS.forEach((linkText) => {
        expect(screen.getByText(linkText)).toBeInTheDocument()
      })
    })

    it('should render correct href attributes for navigation links', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      
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

      const resourcesLink = screen.getByText('Resources').closest('a')
      expect(resourcesLink).toHaveAttribute('href', '/dashboard/resources')

      const emailLink = screen.getByText('Email').closest('a')
      expect(emailLink).toHaveAttribute('href', '/dashboard/admin/emails')
    })

    it('should render navigation icons for each link', async () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      
      // Wait for async data to load
      await screen.findByText('Admin User')
      
      // super_admin sees: Home, Assessments, Clients, Users, Industries, Benchmarks, Feedback, Resources, Email, Profile
      // Note: 📋 appears once (Assessments only, no My Assignments for super_admin)
      // 👤 appears in nav (Profile) and in the user section avatar
      const expectedIcons = ['🏠', '📋', '🏢', '👥', '🏭', '📊', '💬', '📚', '📧']

      expectedIcons.forEach((icon) => {
        expect(screen.getByText(icon)).toBeInTheDocument()
      })
    })
  })

  describe('Active Link Highlighting', () => {
    it('should highlight the active link based on pathname', () => {
      // Mock usePathname to return a specific path
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).toHaveClass('bg-indigo-600', 'text-white')
    })

    it('should not highlight inactive links', () => {
      // Mock usePathname to return a specific path
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).not.toHaveClass('bg-indigo-600')
      expect(assessmentsLink).toHaveClass('text-gray-300')
    })

    it('should highlight assessments link when on assessments page', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard/assessments')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).toHaveClass('bg-indigo-600', 'text-white')
    })

    it('should highlight clients link when on clients page', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard/clients')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      const clientsLink = screen.getByText('Clients').closest('a')
      expect(clientsLink).toHaveClass('bg-indigo-600', 'text-white')
    })

    it('should apply hover classes to inactive links', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      const assessmentsLink = screen.getByText('Assessments').closest('a')
      expect(assessmentsLink).toHaveClass('hover:bg-gray-700', 'hover:text-white')
    })
  })

  describe('Responsive Behavior', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className="custom-class" />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('custom-class')
    })

    it('should apply default width class', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('w-64')
    })

    it('should apply flex column layout', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('flex', 'h-full', 'flex-col')
    })

    it('should apply background color', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('bg-gray-900')
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className="md:w-72" />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('w-64', 'md:w-72')
    })

    it('should render mobile overlay when sidebar is open', () => {
      const onClose = vi.fn()
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const overlay = container.querySelector('.bg-black.bg-opacity-50')
      expect(overlay).toBeInTheDocument()
    })

    it('should hide mobile overlay on desktop', () => {
      const onClose = vi.fn()
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const overlay = container.querySelector('.bg-black.bg-opacity-50')
      expect(overlay).toHaveClass('md:hidden')
    })

    it('should apply mobile transform classes', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={false} />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('-translate-x-full', 'md:translate-x-0')
    })

    it('should show sidebar when isOpen is true', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('translate-x-0')
    })
  })

  describe('Logo Section', () => {
    it('should render close button for mobile', () => {
      const onClose = vi.fn()
      render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const closeButton = screen.getByRole('button', { name: /close menu/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('should hide close button on desktop', () => {
      const onClose = vi.fn()
      render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const closeButton = screen.getByRole('button', { name: /close menu/i })
      expect(closeButton).toHaveClass('md:hidden')
    })

    it('should render logo link pointing to dashboard', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const logoLink = screen.getByText('Involved Talent').closest('a')
      expect(logoLink).toHaveAttribute('href', '/dashboard')
    })

    it('should render logo with correct styling', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const logoText = screen.getByText('IT')
      const logoContainer = logoText.closest('div')
      expect(logoContainer).toHaveClass('h-8', 'w-8', 'rounded', 'bg-indigo-600')
    })
  })

  describe('User Section', () => {
    it('should render user avatar placeholder', async () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      expect(screen.getAllByText('👤').length).toBeGreaterThanOrEqual(1)
    })

    it('should render user name and email', async () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      expect(await screen.findByText('Admin User')).toBeInTheDocument()
      expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    })

    it('should render user section at bottom with border', async () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const adminUser = await screen.findByText('Admin User')
      const userSection = adminUser.closest('div')?.parentElement?.parentElement
      expect(userSection).toHaveClass('border-t', 'border-gray-700', 'p-4')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined className prop', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className={undefined} />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('w-64')
    })

    it('should handle empty className prop', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} className="" />)
      const sidebar = container.querySelector('.bg-gray-900') as HTMLElement
      expect(sidebar).toHaveClass('w-64')
    })

    it('should render when pathname is null', () => {
      // @ts-expect-error - Testing edge case with null pathname
      vi.mocked(navigation.usePathname).mockReturnValue(null)
      
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render when pathname is empty string', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('')
      
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle pathname with trailing slash', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/dashboard/')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      // The link should not match because pathname has trailing slash
      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).not.toHaveClass('bg-indigo-600')
    })

    it('should not highlight links for unmatched pathnames', () => {
      vi.mocked(navigation.usePathname).mockReturnValue('/unknown-page')
      
      render(<Sidebar userProfile={superAdminProfile} />)
      
      // Get all navigation links (inside the nav element, not including logo)
      const nav = screen.getByRole('navigation')
      const navLinks = Array.from(nav.querySelectorAll('a'))
      
      // Should have expected number of navigation links
      expect(navLinks).toHaveLength(EXPECTED_NAVIGATION_ITEMS.length)
      
      navLinks.forEach((link) => {
        expect(link).not.toHaveClass('bg-indigo-600')
        expect(link).toHaveClass('text-gray-300')
      })
    })
  })

  describe('Navigation Structure', () => {
    it('should have correct number of navigation items', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const nav = screen.getByRole('navigation')
      const links = nav.querySelectorAll('a')
      // Navigation items inside the nav element (logo is outside in a separate div)
      expect(links.length).toBe(EXPECTED_NAVIGATION_ITEMS.length)
    })

    it('should render navigation items in correct order', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const nav = screen.getByRole('navigation')
      const links = Array.from(nav.querySelectorAll('a'))
      
      // Verify we have the expected number of links
      expect(links).toHaveLength(EXPECTED_NAVIGATION_ITEMS.length)
      
      EXPECTED_NAVIGATION_ITEMS.forEach((text, index) => {
        expect(links[index]).toHaveTextContent(text)
      })
    })

    it('should apply correct spacing to navigation section', () => {
      render(<Sidebar userProfile={superAdminProfile} />)
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('flex-1', 'space-y-1', 'px-2', 'py-4')
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render with mobile-responsive positioning classes', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('fixed', 'inset-y-0', 'left-0', 'z-50')
    })

    it('should hide sidebar by default when isOpen is false', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={false} />)
      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('-translate-x-full')
    })

    it('should show sidebar when isOpen is true', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} />)
      // Find the actual sidebar div (skip overlay if present)
      const sidebar = container.querySelector('.flex.h-full.w-64') as HTMLElement
      expect(sidebar).toHaveClass('translate-x-0')
    })

    it('should render overlay when sidebar is open on mobile', () => {
      const onClose = vi.fn()
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const overlay = container.querySelector('.fixed.inset-0.z-40')
      expect(overlay).toBeInTheDocument()
    })

    it('should not render overlay when onClose is not provided', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} />)
      const overlay = container.querySelector('.fixed.inset-0.z-40')
      expect(overlay).not.toBeInTheDocument()
    })

    it('should call onClose when overlay is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const overlay = container.querySelector('.fixed.inset-0.z-40') as HTMLElement
      fireEvent.click(overlay)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should render close button when onClose is provided', () => {
      const onClose = vi.fn()
      render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const closeButton = screen.getByLabelText('Close menu')
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const closeButton = screen.getByLabelText('Close menu')
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when navigation link is clicked', () => {
      const onClose = vi.fn()
      render(<Sidebar userProfile={superAdminProfile} isOpen={true} onClose={onClose} />)
      const homeLink = screen.getByText('Home')
      fireEvent.click(homeLink)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose on link click when onClose is not provided', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} isOpen={true} />)
      const homeLink = screen.getByText('Home')
      // Should not throw error
      fireEvent.click(homeLink)
      expect(container).toBeInTheDocument()
    })

    it('should hide close button on mobile when onClose is not provided', () => {
      render(<Sidebar userProfile={superAdminProfile} isOpen={true} />)
      const closeButton = screen.queryByLabelText('Close menu')
      expect(closeButton).not.toBeInTheDocument()
    })

    it('should have transition classes for smooth animations', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = container.querySelector('.flex.h-full.w-64') as HTMLElement
      expect(sidebar).toHaveClass('transition-transform', 'duration-300', 'ease-in-out')
    })

    it('should maintain desktop behavior with md:relative class', () => {
      const { container } = render(<Sidebar userProfile={superAdminProfile} />)
      const sidebar = container.querySelector('.flex.h-full.w-64') as HTMLElement
      expect(sidebar).toHaveClass('md:relative', 'md:translate-x-0')
    })
  })
})
