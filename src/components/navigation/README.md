# Navigation Components Documentation

## Overview

This directory contains the consistent navigation system for the Involved Talent application. The navigation components provide a unified, accessible, and reusable navigation experience across both public and authenticated pages.

## Components

### Header

**File**: `header.tsx`

**Purpose**: Public-facing navigation component used on landing pages and other unauthenticated pages.

**Features**:
- Clean, minimal design with logo and authentication actions
- Responsive layout with mobile support
- Accessibility-compliant with ARIA labels
- Consistent branding and color scheme

**Usage**:
```tsx
import { Header } from '@/components/navigation'

export default function PublicPage() {
  return (
    <div>
      <Header />
      {/* Page content */}
    </div>
  )
}
```

**Props**:
- `className?: string` - Optional custom classes for styling

### Sidebar

**File**: `sidebar.tsx`

**Purpose**: Dashboard navigation component used on authenticated pages within the application.

**Features**:
- Vertical navigation with icons
- Active link highlighting based on current route
- User information display
- Logo with brand identity
- Accessibility-compliant with ARIA labels
- Responsive with custom className support

**Usage**:
```tsx
import { Sidebar } from '@/components/navigation'

export default function DashboardPage() {
  return (
    <div className="flex">
      <Sidebar />
      {/* Page content */}
    </div>
  )
}
```

**Props**:
- `className?: string` - Optional custom classes for styling (useful for responsive behavior)

## Type Definitions

### NavigationItem

Defines a single navigation link item.

```tsx
interface NavigationItem {
  name: string      // Display name of the link
  href: string      // URL path
  icon?: string     // Optional icon (emoji or icon class)
}
```

### NavigationProps

Base props interface for navigation components.

```tsx
interface NavigationProps {
  className?: string  // Optional custom CSS classes
}
```

### HeaderProps

Props interface for the Header component. Currently extends NavigationProps for future extensibility.

```tsx
interface HeaderProps extends NavigationProps {}
```

**Future possibilities**:
- `showAuth?: boolean` - Toggle authentication buttons
- `theme?: 'light' | 'dark'` - Theme support
- `transparent?: boolean` - Transparent background option

### SidebarProps

Props interface for the Sidebar component. Currently extends NavigationProps for future extensibility.

```tsx
interface SidebarProps extends NavigationProps {}
```

**Future possibilities**:
- `collapsed?: boolean` - Collapsed sidebar state
- `userInfo?: UserInfo` - User information display
- `onNavigate?: (href: string) => void` - Navigation callback

## Design Principles

### Consistency

Both Header and Sidebar use:
- Consistent branding ("Involved Talent")
- Indigo color scheme (`indigo-600`)
- Shared navigation types
- Similar accessibility patterns

### Accessibility

All navigation components follow WCAG 2.1 guidelines:
- Semantic HTML with `<nav>` elements
- ARIA labels for screen readers
  - Header: "Main navigation"
  - Sidebar: "Dashboard navigation"
- Keyboard navigation support via native links
- Clear focus indicators
- Descriptive link text

### Responsiveness

Components are designed to work across all screen sizes:
- Header uses responsive container (`container mx-auto`)
- Sidebar accepts custom classes for responsive behavior
- Flexbox layouts for flexible sizing
- Mobile-first design approach

### Maintainability

The navigation system is easy to maintain:
- Centralized exports via `index.ts`
- Shared types prevent duplication
- Well-documented code with JSDoc comments
- Comprehensive test coverage

## Adding New Navigation Items

### Header

To add new buttons to the Header, edit `header.tsx`:

```tsx
<div className="flex items-center space-x-4">
  <Link href="/auth/login">
    <Button variant="ghost">Login</Button>
  </Link>
  <Link href="/auth/signup">
    <Button>Sign Up</Button>
  </Link>
  {/* Add new button here */}
  <Link href="/about">
    <Button variant="outline">About</Button>
  </Link>
</div>
```

### Sidebar

To add new navigation links, edit the `navigation` array in `sidebar.tsx`:

```tsx
const navigation: NavigationItem[] = [
  // ... existing items
  {
    name: 'New Feature',
    href: '/dashboard/new-feature',
    icon: '✨',
  },
]
```

## Testing

The navigation system has comprehensive test coverage:

### Test Files
- `header.test.tsx` - 38 tests for Header component
- `navigation-component.test.tsx` - 31 tests for Sidebar component
- `navigation-consistency.test.tsx` - 17 tests for cross-component consistency

### Test Coverage Areas
- Component rendering
- Navigation links
- Active link highlighting
- Responsive behavior
- Accessibility (ARIA labels, roles, keyboard navigation)
- Edge cases
- Visual consistency
- Integration scenarios

### Running Tests

```bash
# Run all navigation tests
npm test -- src/components/navigation/__tests__/

# Run specific test file
npm test -- src/components/navigation/__tests__/header.test.tsx

# Run with coverage
npm run test:coverage
```

## Best Practices

### DO

✅ Use the exported components from `@/components/navigation`
✅ Pass custom classes for responsive behavior
✅ Maintain consistent branding and colors
✅ Write tests for any modifications
✅ Keep navigation items focused and clear
✅ Use semantic HTML and ARIA attributes

### DON'T

❌ Hardcode navigation in page components
❌ Duplicate navigation logic
❌ Skip accessibility attributes
❌ Ignore test failures
❌ Override core styling without considering consistency
❌ Add too many navigation items (keep it focused)

## Future Enhancements

Potential improvements for the navigation system:

1. **Mobile Menu**: Add hamburger menu for Header on mobile devices
2. **Breadcrumbs**: Add breadcrumb navigation for deep page hierarchies
3. **Search**: Integrate search functionality in navigation
4. **Notifications**: Add notification indicators
5. **Theme Support**: Dark/light theme switching
6. **Internationalization**: Multi-language support
7. **User Menu**: Dropdown menu with user actions in Header
8. **Collapsible Sidebar**: Toggle between expanded/collapsed states

## Contributing

When contributing to the navigation system:

1. **Maintain Consistency**: Ensure changes work across all components
2. **Add Tests**: Write comprehensive tests for new features
3. **Update Documentation**: Keep this README up to date
4. **Follow Patterns**: Use existing patterns and conventions
5. **Consider Accessibility**: Test with screen readers
6. **Review Types**: Update TypeScript types as needed

## Migration Guide

If you have existing navigation code that needs to be migrated:

### Before (Inline Navigation)

```tsx
export default function Page() {
  return (
    <div>
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              Involved Talent
            </Link>
            {/* ... navigation items ... */}
          </div>
        </div>
      </nav>
      {/* Page content */}
    </div>
  )
}
```

### After (Using Header Component)

```tsx
import { Header } from '@/components/navigation'

export default function Page() {
  return (
    <div>
      <Header />
      {/* Page content */}
    </div>
  )
}
```

## Support

For questions or issues with the navigation system:
1. Check this documentation
2. Review existing tests for usage examples
3. Consult the component source code
4. Open an issue on GitHub

## License

This navigation system is part of the Involved Talent v2 application, which is proprietary software owned by Cyberworld Builders.
