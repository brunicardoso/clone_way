'use client'

import { useEffect } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'

export function UnsavedChangesGuard() {
  const isDirty = useSequenceStore((s) => s.isDirty)

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  return null
}
