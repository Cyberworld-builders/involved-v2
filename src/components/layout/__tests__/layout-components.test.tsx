import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardLayout from '../dashboard-layout'

// Mock the Sidebar component
vi.mock('@/components/navigation/sidebar', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="sidebar" className={className}>
      Mocked Sidebar
    </div>
  ),
}))

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the dashboard layout', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Check that the main container is rendered
      const container = screen.getByRole('main')
      expect(container).toBeInTheDocument()
    })

    it('should render children content', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should render multiple children', () => {
      render(
        <DashboardLayout>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </DashboardLayout>
      )

      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
      expect(screen.getByText('Third Child')).toBeInTheDocument()
    })

    it('should render sidebar component', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })

    it('should render header with dashboard title', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should render notification button', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const notificationButton = screen.getByRole('button', { name: /notifications/i })
      expect(notificationButton).toBeInTheDocument()
    })

    it('should render settings button', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      expect(settingsButton).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('should have correct container structure', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Check for main flex container
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('flex', 'h-screen', 'bg-gray-100')
    })

    it('should have header with correct styling', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200')
    })

    it('should have main content area with correct styling', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      expect(main).toHaveClass('flex-1', 'overflow-auto')
    })

    it('should wrap children in padded container', () => {
      render(
        <DashboardLayout>
          <div data-testid="child-content">Test Content</div>
        </DashboardLayout>
      )

      const childContent = screen.getByTestId('child-content')
      const parentDiv = childContent.parentElement
      // Updated to match responsive padding classes
      expect(parentDiv).toHaveClass('p-4', 'lg:p-6')
    })

    it('should have flex column layout for content area', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Find the flex-1 div that contains header and main
      const contentColumn = container.querySelector('.flex-1.flex.flex-col.overflow-hidden')
      expect(contentColumn).toBeInTheDocument()
    })
  })

  describe('Responsive Breakpoints', () => {
    it('should have responsive classes for main container', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      // Verify responsive layout classes
      expect(mainContainer.className).toContain('flex')
      expect(mainContainer.className).toContain('h-screen')
    })

    it('should have flex layout for header items', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const header = screen.getByRole('banner')
      const headerContent = header.firstChild as HTMLElement
      expect(headerContent).toHaveClass('flex', 'items-center', 'justify-between')
    })

    it('should have responsive padding in header', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const header = screen.getByRole('banner')
      const headerContent = header.firstChild as HTMLElement
      expect(headerContent.className).toContain('px-6')
      expect(headerContent.className).toContain('py-4')
    })

    it('should have overflow handling for main content', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      expect(main).toHaveClass('overflow-auto')
    })

    it('should have overflow-hidden on content column', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const contentColumn = container.querySelector('.overflow-hidden')
      expect(contentColumn).toBeInTheDocument()
    })
  })

  describe('Mobile Layout Adaptation', () => {
    it('should render with mobile-friendly flex layout', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      // The flex class allows the layout to adapt on mobile
      expect(mainContainer).toHaveClass('flex')
    })

    it('should have full height layout', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('h-screen')
    })

    it('should have scrollable main content area for mobile', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      // overflow-auto allows scrolling on mobile devices
      expect(main).toHaveClass('overflow-auto')
    })

    it('should render sidebar for mobile (hidden via CSS)', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Sidebar should be rendered (hiding via CSS is handled by Sidebar component)
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeInTheDocument()
    })

    it('should have flex-1 on content area for flexible sizing', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const contentColumn = container.querySelector('.flex-1.flex.flex-col')
      expect(contentColumn).toBeInTheDocument()
    })

    it('should maintain proper spacing on mobile', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      const contentWrapper = main.firstChild as HTMLElement
      // Verify responsive padding that works on mobile
      expect(contentWrapper).toHaveClass('p-4', 'lg:p-6')
    })
  })

  describe('Header Buttons', () => {
    it('should render mobile menu button', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const menuButton = screen.getByRole('button', { name: /open menu/i })
      expect(menuButton).toBeInTheDocument()
    })

    it('should hide mobile menu button on desktop', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const menuButton = screen.getByRole('button', { name: /open menu/i })
      expect(menuButton).toHaveClass('lg:hidden')
    })

    it('should render notification button with icon', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const notificationButton = screen.getByRole('button', { name: /notifications/i })
      expect(notificationButton.textContent).toContain('🔔')
    })

    it('should render settings button with icon', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      expect(settingsButton.textContent).toContain('⚙️')
    })

    it('should have proper button styling', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const notificationButton = screen.getByRole('button', { name: /notifications/i })
      expect(notificationButton).toHaveClass('p-2', 'text-gray-400', 'hover:text-gray-600')
    })

    it('should render buttons in flex container', () => {
      const { container } = render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const header = container.querySelector('header')
      const buttonContainer = header?.querySelector('.flex.items-center.space-x-4')
      expect(buttonContainer).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null children gracefully', () => {
      render(
        <DashboardLayout>
          {null}
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })

    it('should handle undefined children gracefully', () => {
      render(
        <DashboardLayout>
          {undefined}
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })

    it('should handle empty children', () => {
      render(
        <DashboardLayout>
          {''}
        </DashboardLayout>
      )

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })

    it('should handle complex nested children', () => {
      render(
        <DashboardLayout>
          <div>
            <section>
              <article>
                <p>Nested Content</p>
              </article>
            </section>
          </div>
        </DashboardLayout>
      )

      expect(screen.getByText('Nested Content')).toBeInTheDocument()
    })

    it('should handle children with React fragments', () => {
      render(
        <DashboardLayout>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </DashboardLayout>
      )

      expect(screen.getByText('Fragment Child 1')).toBeInTheDocument()
      expect(screen.getByText('Fragment Child 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should have screen reader text for buttons', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const notificationButton = screen.getByRole('button', { name: /notifications/i })
      const screenReaderText = notificationButton.querySelector('.sr-only')
      expect(screenReaderText).toBeInTheDocument()
      expect(screenReaderText?.textContent).toBe('Notifications')
    })

    it('should have screen reader text for settings button', () => {
      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      const screenReaderText = settingsButton.querySelector('.sr-only')
      expect(screenReaderText).toBeInTheDocument()
      expect(screenReaderText?.textContent).toBe('Settings')
    })
  })
})
