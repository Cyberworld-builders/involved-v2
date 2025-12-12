# Mobile Responsive Design Patterns

This document outlines the mobile responsive design patterns implemented across the Involved Talent v2 application.

## Table of Contents
- [Overview](#overview)
- [Breakpoints](#breakpoints)
- [Navigation](#navigation)
- [Layout Components](#layout-components)
- [Table Responsiveness](#table-responsiveness)
- [Testing](#testing)

## Overview

The application uses a mobile-first responsive design approach with Tailwind CSS utility classes. All pages are optimized for mobile, tablet, and desktop viewports.

## Breakpoints

The application uses Tailwind's default responsive breakpoints:

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

## Navigation

### Mobile Navigation (< 768px)

**Features:**
- Hamburger menu button in header
- Sidebar hidden by default (off-screen with `-translate-x-full`)
- Slide-in animation when opened
- Semi-transparent overlay when sidebar is open
- Close button in sidebar
- Automatically closes when navigation link is clicked

**Implementation:**
```tsx
// Sidebar is fixed on mobile, relative on desktop
className="fixed inset-y-0 left-0 z-50 md:relative"

// Hidden by default on mobile
className={isOpen ? 'translate-x-0' : '-translate-x-full'}

// Overlay (only rendered on mobile when open)
{isOpen && onClose && (
  <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" />
)}
```

### Tablet & Desktop (≥ 768px)

**Features:**
- Sidebar always visible
- Hamburger menu hidden
- Sidebar positioned statically in layout
- No overlay needed

## Layout Components

### DashboardLayout

**Mobile:**
- Hamburger menu button visible
- Responsive padding: `px-4 py-4`
- Responsive title size: `text-xl`
- Responsive content padding: `p-4`

**Tablet:**
- Hamburger menu hidden (`md:hidden`)
- Increased padding: `md:px-6`
- Larger title: `md:text-2xl`
- More content padding: `md:p-6`

**Desktop:**
- Sidebar statically positioned
- Full navigation visible
- Maximum content width maintained

### Page Headers

**Pattern:**
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
  <div>
    <h1 className="text-xl md:text-2xl font-bold">Title</h1>
    <p className="text-sm md:text-base">Description</p>
  </div>
  <Button />
</div>
```

**Benefits:**
- Stacks vertically on mobile
- Horizontal layout on tablet+
- Proper spacing with gap utilities

## Table Responsiveness

### Approach

Tables use a progressive disclosure pattern where less critical columns are hidden on smaller screens:

**Mobile (< 640px):**
- Show only essential columns (e.g., Name, Actions)
- Horizontal scroll if needed
- Reduce padding: `px-3 py-4`

**Tablet (≥ 640px, < 1024px):**
- Show moderately important columns
- More padding: `sm:px-6`

**Desktop (≥ 1024px):**
- Show all columns
- Full padding and spacing

### Implementation Example

```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="min-w-full">
      <thead>
        <tr>
          {/* Always visible */}
          <th className="px-3 sm:px-6">Name</th>
          
          {/* Hidden on mobile, visible on tablet+ */}
          <th className="hidden sm:table-cell px-3 sm:px-6">Type</th>
          
          {/* Hidden on mobile/tablet, visible on desktop */}
          <th className="hidden md:table-cell px-3 sm:px-6">Status</th>
          
          {/* Always visible */}
          <th className="px-3 sm:px-6">Actions</th>
        </tr>
      </thead>
      <tbody>
        {/* Similar pattern for td elements */}
      </tbody>
    </table>
  </div>
</div>
```

### Column Visibility Guidelines

**Always Show:**
- Primary identifier (name, title)
- Critical actions (edit, delete, view)

**Show on Tablet+ (`sm:table-cell`):**
- Secondary identifiers
- Common metadata

**Show on Desktop+ (`md:table-cell`, `lg:table-cell`):**
- Status indicators
- Timestamps
- Additional metadata

## Grid Layouts

Cards and content grids follow this pattern:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Cards */}
</div>
```

**Benefits:**
- Single column on mobile
- Two columns on tablet
- Three columns on desktop
- Responsive gap spacing

## Form Layouts

Forms use `w-full` on inputs to ensure they fill their container on all screen sizes:

```tsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-md" />
```

## Testing

### Unit Tests

Mobile responsiveness is tested via:
- Component class assertions
- Viewport-specific behavior
- Responsive utility classes

**Example:**
```tsx
it('should have mobile menu button with proper styling', () => {
  render(<DashboardLayout><div>Test</div></DashboardLayout>)
  const menuButton = screen.getByLabelText('Open menu')
  expect(menuButton).toHaveClass('md:hidden', 'p-2')
})
```

### E2E Tests

End-to-end tests verify:
- Navigation at different viewports
- Table responsiveness
- Touch interactions
- Orientation changes

**Test File:** `e2e/feature-mobile-responsiveness.test.ts`

**Run E2E Tests:**
```bash
npm run test:e2e
```

## Best Practices

1. **Mobile First:** Start with mobile styles, add complexity for larger screens
2. **Progressive Disclosure:** Hide less critical information on smaller screens
3. **Touch Targets:** Ensure buttons/links are at least 44x44px
4. **Test on Devices:** Test on actual devices when possible
5. **Viewport Meta Tag:** Always include proper viewport configuration
6. **Breakpoint Consistency:** Use consistent breakpoints across the app
7. **Performance:** Minimize layout shifts during responsive transitions

## Viewport Meta Tag

The root layout includes:

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}
```

This ensures:
- Proper scaling on mobile devices
- Allows user zoom up to 5x
- Prevents unintended zoom on input focus

## Future Improvements

- Add mobile-specific optimizations for images
- Implement container queries for component-level responsiveness
- Add dark mode support for mobile
- Consider PWA features for mobile app-like experience
