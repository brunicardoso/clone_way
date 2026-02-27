'use client'

const BASE_COLORS: Record<string, string> = {
  A: '#22c55e',
  T: '#ef4444',
  G: '#a1a1aa',
  C: '#3b82f6',
}

interface MagnifyingLensProps {
  x: number
  y: number
  bases: string
  centerBp: number
  windowSize: number
}

export function MagnifyingLens({
  x,
  y,
  bases,
  centerBp,
  windowSize,
}: MagnifyingLensProps) {
  const halfWindow = Math.floor(windowSize / 2)
  const startBp = centerBp - halfWindow

  return (
    <div
      className="pointer-events-none absolute z-50 rounded-lg border border-[#e8e5df] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
      style={{
        left: x - 150,
        top: y - 70,
        minWidth: 300,
      }}
    >
      <div className="mb-1 text-center text-[9px] text-[#9c9690]">
        {startBp + 1}..{startBp + bases.length}
      </div>
      <div className="flex justify-center font-mono text-xs leading-tight tracking-wider">
        {bases.split('').map((base, i) => {
          const isCenter = i === halfWindow
          return (
            <span
              key={i}
              className={isCenter ? 'font-bold underline' : ''}
              style={{ color: BASE_COLORS[base.toUpperCase()] || '#6b6560' }}
            >
              {base.toUpperCase()}
            </span>
          )
        })}
      </div>
    </div>
  )
}
