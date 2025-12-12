'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  className?: string
}

/**
 * Header component for public pages
 * Provides consistent navigation across non-authenticated pages
 */
export default function Header({ className }: HeaderProps) {
  return (
    <nav className={cn('bg-white shadow-sm', className)} role="navigation" aria-label="Main navigation">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            aria-label="Involved Talent Home"
          >
            Involved Talent
          </Link>
          
          {/* Navigation Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
