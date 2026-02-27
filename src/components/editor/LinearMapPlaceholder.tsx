'use client'

import { useSequenceStore } from '@/stores/useSequenceStore'
import { FEATURE_COLORS } from '@/lib/constants'

export function LinearMapPlaceholder() {
  const sequence = useSequenceStore((s) => s.sequence)

  if (!sequence) return null

  const seqLen = sequence.length || 1

  return (
    <div className="mx-4 mb-2">
      <div className="relative h-8 rounded bg-zinc-900">
        {/* Base bar */}
        <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-zinc-700" />
        {/* Feature blocks */}
        {sequence.features.map((f) => {
          const left = (f.start / seqLen) * 100
          const width = Math.max(((f.end - f.start) / seqLen) * 100, 0.5)
          return (
            <div
              key={f.id}
              className="absolute top-2 h-4 rounded-sm opacity-80"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor:
                  f.color ?? FEATURE_COLORS[f.type] ?? '#666',
              }}
              title={`${f.name} (${f.start}..${f.end})`}
            />
          )
        })}
      </div>
    </div>
  )
}
