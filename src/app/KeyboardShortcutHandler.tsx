'use client'

import { useCallback } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useMagicBar } from '@/hooks/useMagicBar'
import { useCommandDispatch } from '@/hooks/useCommandDispatch'

export function KeyboardShortcutHandler() {
  const { toggle } = useMagicBar()
  const { dispatch } = useCommandDispatch()

  const handleAction = useCallback(
    (action: string) => {
      if (action === 'magic-bar') {
        toggle()
        return
      }
      dispatch(action)
    },
    [toggle, dispatch],
  )

  useKeyboardShortcuts(handleAction)

  return null
}
