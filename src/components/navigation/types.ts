/**
 * Shared navigation types for consistent navigation across the application
 */

export interface NavigationItem {
  name: string
  href: string
  icon?: string
}

export interface NavigationProps {
  className?: string
}
