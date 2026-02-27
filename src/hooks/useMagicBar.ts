'use client'

import { useContext } from 'react'
import { MagicBarContext } from '@/components/magic-bar/MagicBarProvider'

export function useMagicBar() {
  const context = useContext(MagicBarContext)
  if (!context) {
    throw new Error('useMagicBar must be used within a MagicBarProvider')
  }
  return context
}
