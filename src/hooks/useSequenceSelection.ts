'use client'

import { useMemo } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'

/** Returns the selected bases, handling circular wraparound. */
export function useSequenceSelection() {
  const sequence = useSequenceStore((s) => s.sequence)
  const selectedRange = useEditorStore((s) => s.selectedRange)

  const selectedBases = useMemo(() => {
    if (!sequence || !selectedRange) return ''

    const { start, end, wrapsAround } = selectedRange
    const len = sequence.bases.length
    // Guard against out-of-bounds
    if (start < 0 || end < 0 || start >= len || end >= len) return ''
    if (wrapsAround) {
      // Circular wraparound: end of sequence + beginning
      return sequence.bases.slice(start) + sequence.bases.slice(0, end + 1)
    }
    return sequence.bases.slice(start, end + 1)
  }, [sequence, selectedRange])

  return {
    selectedBases,
    selectionLength: selectedBases.length,
    hasSelection: selectedBases.length > 0,
  }
}
