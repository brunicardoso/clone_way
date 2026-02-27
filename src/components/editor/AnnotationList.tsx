'use client'

import { useSequenceStore } from '@/stores/useSequenceStore'

export function AnnotationList() {
  const sequence = useSequenceStore((s) => s.sequence)

  if (!sequence || sequence.annotations.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-600">
        No annotations
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      <ul className="divide-y divide-zinc-800">
        {sequence.annotations.map((ann) => (
          <li key={ann.key} className="px-3 py-2">
            <span className="block text-xs font-medium text-zinc-400">
              {ann.key}
            </span>
            <span className="block text-xs text-zinc-300">{ann.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
