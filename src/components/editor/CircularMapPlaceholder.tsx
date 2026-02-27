'use client'

import { useSequenceStore } from '@/stores/useSequenceStore'
import { FEATURE_COLORS } from '@/lib/constants'

export function CircularMapPlaceholder() {
  const sequence = useSequenceStore((s) => s.sequence)

  if (!sequence) return null

  const cx = 100
  const cy = 100
  const r = 80
  const seqLen = sequence.length || 1

  function arcPath(start: number, end: number): string {
    const startAngle = (start / seqLen) * 2 * Math.PI - Math.PI / 2
    const endAngle = (end / seqLen) * 2 * Math.PI - Math.PI / 2
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48">
      {/* Base circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#3f3f46"
        strokeWidth="3"
      />
      {/* Feature arcs */}
      {sequence.features.map((f) => (
        <path
          key={f.id}
          d={arcPath(f.start, f.end)}
          fill="none"
          stroke={f.color ?? FEATURE_COLORS[f.type] ?? '#666'}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.8"
        >
          <title>{`${f.name} (${f.start}..${f.end})`}</title>
        </path>
      ))}
      {/* Center label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-zinc-400 text-[10px] font-medium"
      >
        {sequence.name}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        className="fill-zinc-600 text-[8px]"
      >
        {sequence.length} bp
      </text>
    </svg>
  )
}
