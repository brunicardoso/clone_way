'use client'

import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'

export function Footer() {
  const sequence = useSequenceStore((s) => s.sequence)
  const selectedRange = useEditorStore((s) => s.selectedRange)

  return (
    <footer className="flex h-7 items-center justify-between border-t border-[#e8e5df] bg-[#faf9f5] px-4 text-xs text-[#9c9690]">
      <div className="flex items-center gap-4">
        {sequence ? (
          <>
            <span>{sequence.name}</span>
            <span>{sequence.length} bp</span>
            <span>{sequence.isCircular ? 'Circular' : 'Linear'}</span>
          </>
        ) : (
          <span>No sequence loaded</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {selectedRange && (
          <span>
            Selection: {selectedRange.start + 1}..{selectedRange.end + 1}
            {selectedRange.wrapsAround && ' (wraps)'}
          </span>
        )}
      </div>
    </footer>
  )
}
