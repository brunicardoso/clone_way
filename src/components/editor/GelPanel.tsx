'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DigestResult } from '@/services/bio/digest'

interface GelPanelProps {
  result: DigestResult
  onClose: () => void
}

// 1kb DNA ladder standard sizes
const LADDER_BANDS = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250]

const GEL_HEIGHT = 320
const WELL_Y = 30
const GEL_BOTTOM = GEL_HEIGHT - 20
const LANE_WIDTH = 60
const BAND_HEIGHT = 4

/** Convert fragment size to Y position using log scale */
function sizeToY(size: number, minLog: number, maxLog: number): number {
  const logSize = Math.log10(Math.max(1, size))
  const t = (logSize - minLog) / (maxLog - minLog)
  return GEL_BOTTOM - t * (GEL_BOTTOM - WELL_Y - 20)
}

export function GelPanel({ result, onClose }: GelPanelProps) {
  const [hoveredBand, setHoveredBand] = useState<{ lane: number; size: number; enzyme?: string } | null>(null)
  const [animationDone, setAnimationDone] = useState(false)
  const [animationStarted, setAnimationStarted] = useState(false)
  const [scale, setScale] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)

  // Start animation, then mark done after transition completes
  useEffect(() => {
    const startTimer = setTimeout(() => setAnimationStarted(true), 50)
    const doneTimer = setTimeout(() => setAnimationDone(true), 1800)
    return () => {
      clearTimeout(startTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  const allSizes = useMemo(() => {
    return [...LADDER_BANDS, ...result.fragments.map((f) => f.size)]
  }, [result])

  const minLog = useMemo(() => Math.log10(Math.max(1, Math.min(...allSizes) * 0.5)), [allSizes])
  const maxLog = useMemo(() => Math.log10(Math.max(...allSizes) * 2), [allSizes])

  const totalLanes = 2
  const svgWidth = (totalLanes + 1) * LANE_WIDTH + 40

  const bandOpacity = (size: number, maxSize: number) => {
    const ratio = size / maxSize
    return Math.max(0.4, Math.min(1, 0.3 + ratio * 0.7))
  }

  const maxFragSize = Math.max(...result.fragments.map((f) => f.size), 1)
  const maxLadderSize = Math.max(...LADDER_BANDS)

  // Pre-compute final Y positions (stable, never change)
  const ladderYPositions = useMemo(
    () => LADDER_BANDS.map((size) => sizeToY(size, minLog, maxLog)),
    [minLog, maxLog],
  )
  const fragmentYPositions = useMemo(
    () => result.fragments.map((frag) => sizeToY(frag.size, minLog, maxLog)),
    [result, minLog, maxLog],
  )

  const handleSavePng = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const dpr = 2 // high-res export
      canvas.width = svgWidth * scale * dpr
      canvas.height = GEL_HEIGHT * scale * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.drawImage(img, 0, 0, svgWidth * scale, GEL_HEIGHT * scale)
      URL.revokeObjectURL(url)

      canvas.toBlob((blob) => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `gel_${result.enzymes.join('_')}_digest.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')
    }
    img.src = url
  }, [result.enzymes, scale, svgWidth])

  // Transition style: only during initial animation, removed once done
  const animTransition = animationStarted && !animationDone
    ? 'transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : ''

  return (
    <div className="flex flex-col border-t border-[#e8e5df] bg-[#faf9f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8e5df] px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">
            Gel Electrophoresis
          </h3>
          <span className="text-xs text-[#9c9690]">
            {result.enzymes.join(' + ')} · {result.fragments.length} fragment{result.fragments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            title="Zoom Out"
            className="h-6 w-6 text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#eae7e1]"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
            title="Zoom In"
            className="h-6 w-6 text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#eae7e1]"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSavePng}
            title="Save as PNG"
            className="h-6 w-6 text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#eae7e1]"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-2 h-6 w-6 text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#eae7e1]"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Gel visualization */}
      <div className="flex items-start overflow-x-auto p-4">
        {/* Info panel on the left */}
        <div className="mr-4 min-w-[180px] space-y-2">
          {hoveredBand ? (
            <div className="rounded-md border border-[#e8e5df] bg-[#f5f3ee] p-3">
              <div className="font-mono text-sm font-bold text-[#1a1a1a]">
                {hoveredBand.size.toLocaleString()} bp
              </div>
              {hoveredBand.lane === 0 && (
                <div className="mt-1 text-xs text-[#6b6560]">DNA Ladder</div>
              )}
              {hoveredBand.lane === 1 && hoveredBand.enzyme && (
                <div className="mt-1 text-xs text-emerald-600">
                  {hoveredBand.enzyme}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-[#e8e5df] bg-[#f5f3ee] p-3 text-xs text-[#9c9690]">
              Hover over a band to see details
            </div>
          )}

          {/* Fragment summary */}
          <div className="rounded-md border border-[#e8e5df] bg-[#f5f3ee] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9c9690]">
              Fragments
            </div>
            {result.fragments.map((frag, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-0.5 font-mono text-[10px]"
              >
                <span className="text-[#6b6560]">
                  {frag.leftEnzyme}–{frag.rightEnzyme}
                </span>
                <span className="text-[#1a1a1a]">{frag.size.toLocaleString()} bp</span>
              </div>
            ))}
            <div className="mt-2 border-t border-[#e8e5df] pt-1 text-right font-mono text-[10px] text-[#9c9690]">
              Total: {result.fragments.reduce((s, f) => s + f.size, 0).toLocaleString()} bp
            </div>
          </div>
        </div>

        <svg
          ref={svgRef}
          width={svgWidth * scale}
          height={GEL_HEIGHT * scale}
          viewBox={`0 0 ${svgWidth} ${GEL_HEIGHT}`}
          className="mx-auto"
        >
          <defs>
            <linearGradient id="gel-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1117" />
              <stop offset="100%" stopColor="#0a0f18" />
            </linearGradient>
            <filter id="band-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="band-glow-hover" x="-50%" y="-100%" width="200%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Gel background */}
          <rect x="0" y="0" width={svgWidth} height={GEL_HEIGHT} rx="4" fill="url(#gel-bg)" />

          {/* Subtle gel texture lines */}
          {Array.from({ length: 20 }, (_, i) => (
            <line
              key={`tex-${i}`}
              x1="0"
              y1={i * (GEL_HEIGHT / 20)}
              x2={svgWidth}
              y2={i * (GEL_HEIGHT / 20)}
              stroke="#ffffff"
              strokeWidth={0.3}
              opacity={0.02}
            />
          ))}

          {/* Lane labels */}
          <text x={LANE_WIDTH} y={14} fill="#6b7280" fontSize={8} textAnchor="middle" fontWeight="bold">
            Ladder
          </text>
          <text x={LANE_WIDTH * 2} y={14} fill="#6b7280" fontSize={8} textAnchor="middle" fontWeight="bold">
            Digest
          </text>

          {/* Wells */}
          {[1, 2].map((lane) => (
            <rect
              key={`well-${lane}`}
              x={lane * LANE_WIDTH - 18}
              y={WELL_Y - 4}
              width={36}
              height={6}
              rx={1}
              fill="#1a1a2e"
              stroke="#2a2a3e"
              strokeWidth={0.5}
            />
          ))}

          {/* Horizontal guide lines at ladder positions */}
          {LADDER_BANDS.map((size, idx) => {
            const y = ladderYPositions[idx]
            const finalY = animationStarted ? y : WELL_Y
            return (
              <line
                key={`guide-${size}`}
                x1={LANE_WIDTH - 16}
                y1={finalY}
                x2={LANE_WIDTH * 2 + 20}
                y2={finalY}
                stroke="#ffffff"
                strokeWidth={0.3}
                opacity={0.04}
                strokeDasharray="2,4"
                style={animTransition ? { transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' } : undefined}
              />
            )
          })}

          {/* Ladder bands */}
          {LADDER_BANDS.map((size, idx) => {
            const y = ladderYPositions[idx]
            const isHovered = hoveredBand?.lane === 0 && hoveredBand?.size === size
            const opacity = bandOpacity(size, maxLadderSize)
            const finalY = animationStarted ? y - BAND_HEIGHT / 2 : WELL_Y
            return (
              <g key={`ladder-${size}`}>
                {/* Invisible wider hit area for hover */}
                <rect
                  x={LANE_WIDTH - 18}
                  y={finalY - 4}
                  width={36}
                  height={BAND_HEIGHT + 8}
                  fill="transparent"
                  onMouseEnter={() => setHoveredBand({ lane: 0, size })}
                  onMouseLeave={() => setHoveredBand(null)}
                  className="cursor-pointer"
                />
                <rect
                  x={LANE_WIDTH - 16}
                  y={finalY}
                  width={32}
                  height={BAND_HEIGHT}
                  rx={1}
                  fill={isHovered ? '#67e8f9' : '#e0e0e0'}
                  opacity={animationStarted ? opacity : 0}
                  filter={isHovered ? 'url(#band-glow-hover)' : 'url(#band-glow)'}
                  pointerEvents="none"
                  style={animTransition ? { transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' } : undefined}
                />
                {/* Size label */}
                <text
                  x={LANE_WIDTH - 22}
                  y={animationStarted ? y + 2 : WELL_Y}
                  fill="#4b5563"
                  fontSize={7}
                  textAnchor="end"
                  pointerEvents="none"
                  style={animTransition ? { transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' } : undefined}
                >
                  {size >= 1000 ? `${size / 1000}k` : size}
                </text>
              </g>
            )
          })}

          {/* Digest fragment bands */}
          {result.fragments.map((frag, i) => {
            const y = fragmentYPositions[i]
            const isHovered = hoveredBand?.lane === 1 && hoveredBand?.size === frag.size && hoveredBand?.enzyme === `${frag.leftEnzyme}–${frag.rightEnzyme}`
            const opacity = bandOpacity(frag.size, maxFragSize)
            const bandW = Math.max(24, Math.min(40, 24 + (frag.size / maxFragSize) * 16))
            const finalY = animationStarted ? y - BAND_HEIGHT / 2 : WELL_Y
            const delay = 0.1 + i * 0.08
            return (
              <g key={`frag-${i}`}>
                {/* Invisible wider hit area */}
                <rect
                  x={LANE_WIDTH * 2 - bandW / 2 - 2}
                  y={finalY - 4}
                  width={bandW + 4}
                  height={BAND_HEIGHT + 9}
                  fill="transparent"
                  onMouseEnter={() =>
                    setHoveredBand({
                      lane: 1,
                      size: frag.size,
                      enzyme: `${frag.leftEnzyme}–${frag.rightEnzyme}`,
                    })
                  }
                  onMouseLeave={() => setHoveredBand(null)}
                  className="cursor-pointer"
                />
                <rect
                  x={LANE_WIDTH * 2 - bandW / 2}
                  y={finalY}
                  width={bandW}
                  height={BAND_HEIGHT + 1}
                  rx={1}
                  fill={isHovered ? '#34d399' : '#e0f0e0'}
                  opacity={animationStarted ? opacity : 0}
                  filter={isHovered ? 'url(#band-glow-hover)' : 'url(#band-glow)'}
                  pointerEvents="none"
                  style={animTransition
                    ? { transition: `all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s` }
                    : undefined
                  }
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
