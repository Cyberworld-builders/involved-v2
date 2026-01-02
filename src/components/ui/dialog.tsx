'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  title?: string
  description?: string
  onClose?: () => void
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => onOpenChange(false)}
          />
          {children}
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function DialogContent({
  children,
  title,
  description,
  onClose,
}: DialogContentProps) {
  const { onOpenChange } = React.useContext(DialogContext)

  const handleClose = () => {
    onClose?.()
    onOpenChange(false)
  }

  return (
    <div className="relative z-50 w-full max-w-3xl max-h-[90vh] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
    </div>
  )
}

