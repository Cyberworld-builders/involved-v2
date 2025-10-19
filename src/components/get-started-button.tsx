'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function GetStartedButton() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch (error) {
        console.error('Error checking authentication:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [supabase.auth])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // User is authenticated, redirect to dashboard
      router.push('/dashboard')
    } else {
      // User is not authenticated, redirect to login
      router.push('/auth/login')
    }
  }

  if (isLoading) {
    return (
      <Button size="lg" className="mr-4" disabled>
        Loading...
      </Button>
    )
  }

  return (
    <Button size="lg" className="mr-4" onClick={handleGetStarted}>
      Get Started
    </Button>
  )
}
