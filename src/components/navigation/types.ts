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

/**
 * HeaderProps extends NavigationProps for future extensibility.
 * Currently matches NavigationProps but allows adding Header-specific props later
 * without breaking changes (e.g., showAuth?: boolean, theme?: 'light' | 'dark')
 */
export interface HeaderProps extends NavigationProps {}

/**
 * SidebarProps extends NavigationProps for future extensibility.
 * Currently matches NavigationProps but allows adding Sidebar-specific props later
 * without breaking changes (e.g., collapsed?: boolean, userInfo?: UserInfo)
 */
export interface SidebarProps extends NavigationProps {}
