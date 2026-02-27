'use client'

import { createContext, useState, useCallback, type ReactNode } from 'react'

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

  return (
    <MagicBarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MagicBarContext.Provider>
  )
}
