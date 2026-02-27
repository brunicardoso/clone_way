'use client'

import { useEffect } from 'react'
import { KEYBINDINGS } from '@/lib/keybindings'

type ActionHandler = (action: string) => void

export function useKeyboardShortcuts(onAction: ActionHandler) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      for (const binding of KEYBINDINGS) {
        if (
          binding.key === e.key &&
          binding.mod === mod &&
          (binding.shift ?? false) === e.shiftKey
        ) {
          // Don't preventDefault on paste — allow the native paste event to fire
          // so SequenceView edit-mode paste handler and system clipboard both work
          if (binding.action !== 'paste') {
            e.preventDefault()
          }
          onAction(binding.action)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onAction])
}
