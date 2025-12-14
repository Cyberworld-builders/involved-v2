'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface SendInviteButtonProps {
  userId: string
  userName: string
  userEmail: string
}

export default function SendInviteButton({ userId, userName, userEmail }: SendInviteButtonProps) {
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSendInvite = async () => {
    setIsSending(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/users/${userId}/invite`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setMessage({
        type: 'success',
        text: data.warning || `Invite email sent successfully to ${userEmail}`,
      })
    } catch (error) {
      console.error('Error sending invite:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send invite. Please try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSendInvite}
        disabled={isSending}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {isSending ? 'Sending...' : '📧 Send Invite'}
      </Button>
      {message && (
        <div
          className={`text-sm p-2 rounded ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
