'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="text-sm text-gray-600">
      {user ? (
        <div>
          <p>✅ Authenticated as: {user.email}</p>
          <p>User ID: {user.id}</p>
        </div>
      ) : (
        <p>❌ Not authenticated</p>
      )}
    </div>
  )
}
