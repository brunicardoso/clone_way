'use client'

import { LinearMap } from './LinearMap'
import { CircularMap } from './CircularMap'
import { SequenceView } from './SequenceView'
import { useEditorStore } from '@/stores/useEditorStore'
import type { Sequence } from '@/types'

interface EditorPanelProps {
  sequence: Sequence | null
  viewMode?: 'linear' | 'circular' | 'sequence'
}

export function EditorPanel({ sequence, viewMode: overrideViewMode }: EditorPanelProps) {
  const storeViewMode = useEditorStore((s) => s.viewMode)
  const viewMode = overrideViewMode ?? storeViewMode

  if (!sequence) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#9c9690]">
        <p>No sequence loaded. Import a file or select from the library.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {viewMode === 'linear' && (
        <>
          <LinearMap sequence={sequence} />
          <SequenceView sequence={sequence} />
        </>
      )}
      {viewMode === 'circular' && <CircularMap sequence={sequence} />}
      {viewMode === 'sequence' && <SequenceView sequence={sequence} />}
    </div>
  )
}
