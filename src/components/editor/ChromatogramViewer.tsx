'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import type { ChromatogramData } from '@/services/bio/abif'

const TRACE_COLORS = {
  A: '#22c55e', // green
  C: '#3b82f6', // blue
  G: '#374151', // dark gray
  T: '#ef4444', // red
}

const BASE_COLORS: Record<string, string> = {
  A: '#22c55e',
  C: '#3b82f6',
  G: '#6b7280',
  T: '#ef4444',
  N: '#9c9690',
}

interface ChromatogramViewerProps {
  data: ChromatogramData
  pixelsPerPoint?: number
  height?: number
}

export function ChromatogramViewer({
  data,
  pixelsPerPoint = 2,
  height = 240,
}: ChromatogramViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredBase, setHoveredBase] = useState<number | null>(null)

  const traceLength = Math.max(
    data.traceA.length,
    data.traceC.length,
    data.traceG.length,
    data.traceT.length,
  )

  const svgWidth = traceLength * pixelsPerPoint
  const qualityBarHeight = 20
  const baseCallHeight = 18
  const traceHeight = height - baseCallHeight - qualityBarHeight

  // Find max trace value for normalization
  const maxVal = useMemo(() => {
    let max = 0
    for (const arr of [data.traceA, data.traceC, data.traceG, data.traceT]) {
      for (const v of arr) {
        if (v > max) max = v
      }
    }
    return max || 1
  }, [data])

  // Build SVG path for a trace channel
  const buildPath = useCallback(
    (trace: number[]): string => {
      if (trace.length === 0) return ''
      const points: string[] = []
      for (let i = 0; i < trace.length; i++) {
        const x = i * pixelsPerPoint
        const y = traceHeight - (trace[i] / maxVal) * (traceHeight - 10)
        points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
      }
      return points.join(' ')
    },
    [pixelsPerPoint, traceHeight, maxVal],
  )

  const pathA = useMemo(() => buildPath(data.traceA), [data.traceA, buildPath])
  const pathC = useMemo(() => buildPath(data.traceC), [data.traceC, buildPath])
  const pathG = useMemo(() => buildPath(data.traceG), [data.traceG, buildPath])
  const pathT = useMemo(() => buildPath(data.traceT), [data.traceT, buildPath])

  // Pre-compute base position x-coordinates for hover detection
  const baseXPositions = useMemo(() => {
    return data.baseCalls.split('').map((_, i) => {
      const pos = data.basePositions[i]
      return pos !== undefined ? pos * pixelsPerPoint : null
    })
  }, [data.baseCalls, data.basePositions, pixelsPerPoint])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const scrollLeft = containerRef.current?.scrollLeft || 0
      const x = e.clientX - rect.left + scrollLeft

      // Find nearest base
      let closest = -1
      let closestDist = Infinity
      for (let i = 0; i < baseXPositions.length; i++) {
        const bx = baseXPositions[i]
        if (bx === null) continue
        const dist = Math.abs(bx - x)
        if (dist < closestDist) {
          closestDist = dist
          closest = i
        }
      }
      setHoveredBase(closestDist < 20 * pixelsPerPoint ? closest : null)
    },
    [baseXPositions, pixelsPerPoint],
  )

  const hoveredInfo = hoveredBase !== null
    ? {
        base: data.baseCalls[hoveredBase]?.toUpperCase() ?? '?',
        position: hoveredBase + 1,
        quality: data.qualityValues[hoveredBase] ?? 0,
        x: baseXPositions[hoveredBase],
      }
    : null

  return (
    <div ref={containerRef} className="relative overflow-x-auto bg-[#faf9f5]">
      <svg
        width={svgWidth}
        height={height}
        className="block"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredBase(null)}
      >
        {/* Alternating position markers every 10 bases */}
        {data.baseCalls.split('').map((_, i) => {
          if (i % 10 !== 0) return null
          const pos = data.basePositions[i]
          if (pos === undefined) return null
          const x = pos * pixelsPerPoint
          return (
            <g key={`marker-${i}`}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={traceHeight}
                stroke="#e8e5df"
                strokeWidth={0.5}
              />
              <text
                x={x}
                y={10}
                textAnchor="middle"
                fill="#c8c4be"
                fontSize={8}
                fontFamily="monospace"
              >
                {i + 1}
              </text>
            </g>
          )
        })}

        {/* Trace lines */}
        <path d={pathA} fill="none" stroke={TRACE_COLORS.A} strokeWidth={1.2} opacity={0.8} />
        <path d={pathC} fill="none" stroke={TRACE_COLORS.C} strokeWidth={1.2} opacity={0.8} />
        <path d={pathG} fill="none" stroke={TRACE_COLORS.G} strokeWidth={1.2} opacity={0.8} />
        <path d={pathT} fill="none" stroke={TRACE_COLORS.T} strokeWidth={1.2} opacity={0.8} />

        {/* Hover highlight line */}
        {hoveredInfo?.x != null && (
          <line
            x1={hoveredInfo.x}
            y1={0}
            x2={hoveredInfo.x}
            y2={traceHeight}
            stroke="#1a1a1a"
            strokeWidth={1}
            opacity={0.2}
            strokeDasharray="3,3"
          />
        )}

        {/* Quality score bars */}
        {data.baseCalls.split('').map((_, i) => {
          const pos = data.basePositions[i]
          if (pos === undefined) return null
          const x = pos * pixelsPerPoint
          const q = data.qualityValues[i] ?? 0
          const barHeight = Math.min(qualityBarHeight - 2, (q / 60) * (qualityBarHeight - 2))
          const color = q >= 30 ? '#22c55e' : q >= 20 ? '#84cc16' : q >= 10 ? '#eab308' : '#ef4444'
          const isHovered = hoveredBase === i
          return (
            <rect
              key={`q-${i}`}
              x={x - 3}
              y={traceHeight + qualityBarHeight - barHeight}
              width={6}
              height={barHeight}
              fill={color}
              opacity={isHovered ? 1 : 0.5}
              rx={1}
            />
          )
        })}

        {/* Quality bar baseline */}
        <line
          x1={0}
          y1={traceHeight + qualityBarHeight}
          x2={svgWidth}
          y2={traceHeight + qualityBarHeight}
          stroke="#e8e5df"
          strokeWidth={0.5}
        />

        {/* Base calls */}
        {data.baseCalls.split('').map((base, i) => {
          const pos = data.basePositions[i]
          if (pos === undefined) return null
          const x = pos * pixelsPerPoint
          const isHovered = hoveredBase === i
          const upper = base.toUpperCase()

          return (
            <g key={`base-${i}`}>
              {/* Highlight background for hovered base */}
              {isHovered && (
                <rect
                  x={x - 6}
                  y={traceHeight + qualityBarHeight + 1}
                  width={12}
                  height={baseCallHeight - 2}
                  fill={BASE_COLORS[upper] || '#9c9690'}
                  opacity={0.15}
                  rx={2}
                />
              )}
              {/* Base letter */}
              <text
                x={x}
                y={height - 4}
                textAnchor="middle"
                fill={BASE_COLORS[upper] || '#9c9690'}
                fontSize={isHovered ? 12 : 10}
                fontFamily="monospace"
                fontWeight={isHovered ? '900' : 'bold'}
              >
                {upper}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredInfo && (
        <div className="pointer-events-none absolute bottom-1 left-2 z-10 flex items-center gap-3 rounded bg-[#1a1a1a]/80 px-3 py-1 font-mono text-[10px] text-white backdrop-blur-sm">
          <span>
            Base #{' '}
            <span className="text-emerald-400">{hoveredInfo.position}</span>
          </span>
          <span>
            Call:{' '}
            <span style={{ color: BASE_COLORS[hoveredInfo.base] || '#9c9690' }}>
              {hoveredInfo.base}
            </span>
          </span>
          <span>
            Quality:{' '}
            <span
              className={
                hoveredInfo.quality >= 30
                  ? 'text-emerald-400'
                  : hoveredInfo.quality >= 20
                    ? 'text-lime-400'
                    : hoveredInfo.quality >= 10
                      ? 'text-yellow-400'
                      : 'text-red-400'
              }
            >
              {hoveredInfo.quality}
            </span>
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-2 right-2 flex items-center gap-3 rounded bg-white/80 px-2 py-1 text-[9px] backdrop-blur-sm">
        {Object.entries(TRACE_COLORS).map(([base, color]) => (
          <span key={base} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span style={{ color }} className="font-mono font-bold">
              {base}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
