'use client'

import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface MagicBarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const MagicBarContext = createContext<MagicBarContextValue | null>(null)

export function MagicBarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  // Allow opening via custom event (used by mobile toolbar)
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('cyw:trigger-magic-bar', handler)
    return () => window.removeEventListener('cyw:trigger-magic-bar', handler)
  }, [])

  return (
    <MagicBarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MagicBarContext.Provider>
  )
}
