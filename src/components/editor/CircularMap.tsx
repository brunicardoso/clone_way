'use client'

import { useMemo, useCallback, useState, useRef } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { FEATURE_COLORS, getThemedFeatureColor, getThemedFeatureStyle } from '@/lib/constants'
import { PAPER_THEME, COLOR_PALETTES } from '@/lib/theme'
import type { ColorPaletteName } from '@/lib/theme'
import { Download, Camera } from 'lucide-react'
import type { Sequence } from '@/types'

interface CircularMapProps {
  sequence?: Sequence | null
}

// ── Theme-driven layout constants ──────────────────────────────────────
const baseTheme = PAPER_THEME

const SIZE = baseTheme.layout.size
const CENTER = SIZE / 2
const BACKBONE_RADIUS = baseTheme.layout.backboneRadius
const BACKBONE_WIDTH = baseTheme.layout.backboneWidth
const FEATURE_WIDTH = baseTheme.layout.featureWidth
const OUTER_FEATURE_RADIUS = BACKBONE_RADIUS + FEATURE_WIDTH + 6
const INNER_FEATURE_RADIUS = BACKBONE_RADIUS - FEATURE_WIDTH - 6
const SITE_TICK_INNER = BACKBONE_RADIUS - 8
const SITE_TICK_OUTER = BACKBONE_RADIUS + 8
const ORF_RADIUS = BACKBONE_RADIUS - FEATURE_WIDTH - 26
const RULER_TICK_RADIUS_MINOR = BACKBONE_RADIUS - BACKBONE_WIDTH / 2 - 3
const RULER_TICK_RADIUS_MAJOR = BACKBONE_RADIUS - BACKBONE_WIDTH / 2 - 6
const RULER_LABEL_RADIUS = BACKBONE_RADIUS - BACKBONE_WIDTH / 2 - 14
// Feature types that render as directional arrows (all others are plain arcs)
const ARROW_FEATURE_TYPES: Set<string> = new Set(['CDS', 'promoter'])
const ARROWHEAD_ANGLE = 0.04  // radians (~2.3°) reserved for arrowhead tip

// Small-feature badge dimensions (outline style)
const SMALL_BADGE_H = 11
const SMALL_BADGE_CHAR_W = 4
const SMALL_BADGE_PAD_X = 5

// ViewBox padding from theme
const PAD_X = baseTheme.layout.viewBoxPaddingX
const PAD_Y = baseTheme.layout.viewBoxPaddingY
const TOTAL_W = SIZE + PAD_X * 2
const TOTAL_H = SIZE + PAD_Y * 2

// Shared external label layout — circular arrangement
const LABEL_ELBOW_RADIUS = OUTER_FEATURE_RADIUS + 2
const LABEL_RADIUS = LABEL_ELBOW_RADIUS + 26  // radius at which labels orbit the map (1.3x longer lines)

// Non-scaling stroke attribute
const NSS = baseTheme.style.nonScalingStroke ? { vectorEffect: 'non-scaling-stroke' as const } : {}

function bpToAngle(bp: number, seqLen: number): number {
  return (bp / seqLen) * Math.PI * 2 - Math.PI / 2
}

function polarToCart(angle: number, radius: number) {
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  }
}

function arcPath(
  startBp: number,
  endBp: number,
  seqLen: number,
  radius: number,
  width: number,
): string {
  const startAngle = bpToAngle(startBp, seqLen)
  const endAngle = bpToAngle(endBp, seqLen)
  const outerR = radius + width / 2
  const innerR = radius - width / 2

  let angleDiff = endAngle - startAngle
  if (angleDiff < 0) angleDiff += Math.PI * 2
  const largeArc = angleDiff > Math.PI ? 1 : 0

  const outerStart = polarToCart(startAngle, outerR)
  const outerEnd = polarToCart(endAngle, outerR)
  const innerStart = polarToCart(startAngle, innerR)
  const innerEnd = polarToCart(endAngle, innerR)

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function simpleArcPath(
  startBp: number,
  endBp: number,
  seqLen: number,
  radius: number,
): string {
  const startAngle = bpToAngle(startBp, seqLen)
  const endAngle = bpToAngle(endBp, seqLen)
  let angleDiff = endAngle - startAngle
  if (angleDiff < 0) angleDiff += Math.PI * 2
  const largeArc = angleDiff > Math.PI ? 1 : 0
  const start = polarToCart(startAngle, radius)
  const end = polarToCart(endAngle, radius)
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * Arc path with integrated arrowhead — tip ends exactly at the feature boundary.
 * The body arc is shortened and a triangular tip fills the remaining span.
 */
function arcWithArrowPath(
  startBp: number,
  endBp: number,
  seqLen: number,
  radius: number,
  width: number,
  strand: 1 | -1,
): string {
  const startAngle = bpToAngle(startBp, seqLen)
  const endAngle = bpToAngle(endBp, seqLen)
  const outerR = radius + width / 2
  const innerR = radius - width / 2

  let angleDiff = endAngle - startAngle
  if (angleDiff < 0) angleDiff += Math.PI * 2

  // Arrow takes at most 40% of the arc span
  const arrowAngle = Math.min(ARROWHEAD_ANGLE, angleDiff * 0.4)

  if (strand === 1) {
    // Tip at endAngle, body from startAngle to (endAngle - arrowAngle)
    const bodyEnd = endAngle - arrowAngle
    let bodyDiff = bodyEnd - startAngle
    if (bodyDiff < 0) bodyDiff += Math.PI * 2
    const lg = bodyDiff > Math.PI ? 1 : 0

    const os = polarToCart(startAngle, outerR)
    const obe = polarToCart(bodyEnd, outerR)
    const tip = polarToCart(endAngle, radius)
    const ibe = polarToCart(bodyEnd, innerR)
    const is_ = polarToCart(startAngle, innerR)

    return [
      `M ${os.x} ${os.y}`,
      `A ${outerR} ${outerR} 0 ${lg} 1 ${obe.x} ${obe.y}`,
      `L ${tip.x} ${tip.y}`,
      `L ${ibe.x} ${ibe.y}`,
      `A ${innerR} ${innerR} 0 ${lg} 0 ${is_.x} ${is_.y}`,
      'Z',
    ].join(' ')
  } else {
    // Tip at startAngle, body from (startAngle + arrowAngle) to endAngle
    const bodyStart = startAngle + arrowAngle
    let bodyDiff = endAngle - bodyStart
    if (bodyDiff < 0) bodyDiff += Math.PI * 2
    const lg = bodyDiff > Math.PI ? 1 : 0

    const tip = polarToCart(startAngle, radius)
    const obs = polarToCart(bodyStart, outerR)
    const oe = polarToCart(endAngle, outerR)
    const ie = polarToCart(endAngle, innerR)
    const ibs = polarToCart(bodyStart, innerR)

    return [
      `M ${tip.x} ${tip.y}`,
      `L ${obs.x} ${obs.y}`,
      `A ${outerR} ${outerR} 0 ${lg} 1 ${oe.x} ${oe.y}`,
      `L ${ie.x} ${ie.y}`,
      `A ${innerR} ${innerR} 0 ${lg} 0 ${ibs.x} ${ibs.y}`,
      'Z',
    ].join(' ')
  }
}

/**
 * Arc path for SVG textPath — always produces left-to-right readable text.
 * Reverses path direction when the midpoint is in the bottom half.
 */
function textArcPath(
  startBp: number,
  endBp: number,
  seqLen: number,
  radius: number,
): string {
  const startAngle = bpToAngle(startBp, seqLen)
  const endAngle = bpToAngle(endBp, seqLen)
  let angleDiff = endAngle - startAngle
  if (angleDiff < 0) angleDiff += Math.PI * 2
  const midAngle = startAngle + angleDiff / 2
  const largeArc = angleDiff > Math.PI ? 1 : 0

  // If midpoint is in the bottom half, reverse path so text reads L→R
  if (Math.sin(midAngle) > 0) {
    const e = polarToCart(endAngle, radius)
    const s = polarToCart(startAngle, radius)
    return `M ${e.x} ${e.y} A ${radius} ${radius} 0 ${largeArc} 0 ${s.x} ${s.y}`
  }
  const s = polarToCart(startAngle, radius)
  const e = polarToCart(endAngle, radius)
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

/** A label to be placed in the left/right columns outside the map. */
interface ExternalLabel {
  id: string
  name: string
  angle: number
  kind: 'site' | 'feature'
  color: string
  anchorRadius?: number
}

interface ExternalLabelPlacement extends ExternalLabel {
  side: 'left' | 'right'
  labelX: number
  labelY: number
  labelAngle: number
}

/** Place external labels in a circular arrangement around the map. */
function assignExternalLabels(items: ExternalLabel[]): ExternalLabelPlacement[] {
  if (items.length === 0) return []

  // Sort all items by angle for even circular distribution
  const sorted = [...items].sort((a, b) => a.angle - b.angle)

  // Minimum angular separation between labels (in radians)
  const minSep = Math.max(0.08, (2 * Math.PI) / Math.max(sorted.length, 1) * 0.8)

  // Assign label angles: start from each item's natural angle, then push apart if overlapping
  const labelAngles: number[] = sorted.map((item) => item.angle)

  // Push overlapping labels apart (multiple passes)
  for (let pass = 0; pass < 20; pass++) {
    let moved = false
    for (let i = 0; i < labelAngles.length; i++) {
      const next = (i + 1) % labelAngles.length
      let gap = labelAngles[next] - labelAngles[i]
      if (next === 0) gap += Math.PI * 2  // wrap
      if (gap < minSep) {
        const push = (minSep - gap) / 2
        labelAngles[i] -= push
        labelAngles[next] += push
        moved = true
      }
    }
    if (!moved) break
  }

  return sorted.map((item, i) => {
    const lAngle = labelAngles[i]
    const lx = CENTER + LABEL_RADIUS * Math.cos(lAngle)
    const ly = CENTER + LABEL_RADIUS * Math.sin(lAngle)
    const side = Math.cos(lAngle) >= 0 ? 'right' as const : 'left' as const
    return { ...item, side, labelX: lx, labelY: ly, labelAngle: lAngle }
  })
}

/** Compute GC content as a percentage. */
function computeGC(bases: string): number {
  if (!bases || bases.length === 0) return 0
  let gc = 0
  for (let i = 0; i < bases.length; i++) {
    const ch = bases[i].toUpperCase()
    if (ch === 'G' || ch === 'C') gc++
  }
  return (gc / bases.length) * 100
}

export function CircularMap({ sequence: sequenceProp }: CircularMapProps = {}) {
  const storeSequence = useSequenceStore((s) => s.sequence)
  const sequence = sequenceProp ?? storeSequence
  const zoom = useEditorStore((s) => s.mapZoom)
  const mapZoomBy = useEditorStore((s) => s.mapZoomBy)
  const selectedRange = useEditorStore((s) => s.selectedRange)
  const setSelectedRange = useEditorStore((s) => s.setSelectedRange)
  const showFeatures = useEditorStore((s) => s.showFeatures)
  const showOrfs = useEditorStore((s) => s.showOrfs)
  const showRestrictionSites = useEditorStore((s) => s.showRestrictionSites)
  const colorOpacity = useEditorStore((s) => s.colorOpacity)
  const setColorOpacity = useEditorStore((s) => s.setColorOpacity)
  const colorPalette = useEditorStore((s) => s.colorPalette)
  const setColorPalette = useEditorStore((s) => s.setColorPalette)
  const theme = useMemo(() => ({
    ...baseTheme,
    featureColors: COLOR_PALETTES[colorPalette],
  }), [colorPalette])
  const [hoverBp, setHoverBp] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!sequence) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      // Account for padded viewBox: SVG coordinate origin is at (-PAD_X, -PAD_Y)
      const scaleX = TOTAL_W / rect.width
      const scaleY = TOTAL_H / rect.height
      const svgX = (e.clientX - rect.left) * scaleX - PAD_X
      const svgY = (e.clientY - rect.top) * scaleY - PAD_Y
      const x = svgX - CENTER
      const y = svgY - CENTER
      const dist = Math.sqrt(x * x + y * y)

      if (dist < BACKBONE_RADIUS * 0.3 || dist > BACKBONE_RADIUS * 1.8) {
        setHoverBp(null)
        return
      }

      let angle = Math.atan2(y, x) + Math.PI / 2
      if (angle < 0) angle += Math.PI * 2
      const bp = Math.round((angle / (Math.PI * 2)) * sequence.length) % sequence.length
      setHoverBp(bp)
    },
    [sequence],
  )

  const handleCircleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!sequence) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const scaleX = TOTAL_W / rect.width
      const scaleY = TOTAL_H / rect.height
      const svgX = (e.clientX - rect.left) * scaleX - PAD_X
      const svgY = (e.clientY - rect.top) * scaleY - PAD_Y
      const x = svgX - CENTER
      const y = svgY - CENTER
      const dist = Math.sqrt(x * x + y * y)

      if (dist < BACKBONE_RADIUS * 0.5 || dist > BACKBONE_RADIUS * 1.5) return

      let angle = Math.atan2(y, x) + Math.PI / 2
      if (angle < 0) angle += Math.PI * 2
      const bp = Math.round((angle / (Math.PI * 2)) * sequence.length) % sequence.length
      setSelectedRange({ start: bp, end: bp, wrapsAround: false })
    },
    [sequence, setSelectedRange],
  )

  // Classify features into large (inline text) and small (external badge)
  const { largeFeatures, smallFeatures } = useMemo(() => {
    type F = Sequence['features']
    if (!sequence || !showFeatures)
      return { largeFeatures: [] as F, smallFeatures: [] as F }

    const large: F = []
    const small: F = []

    for (const f of sequence.features) {
      const radius = f.strand === 1
        ? OUTER_FEATURE_RADIUS - FEATURE_WIDTH / 2
        : INNER_FEATURE_RADIUS + FEATURE_WIDTH / 2

      let angleDiff = bpToAngle(f.end, sequence.length) - bpToAngle(f.start, sequence.length)
      if (angleDiff < 0) angleDiff += Math.PI * 2
      // Arc length at center radius
      const arcLen = angleDiff * radius
      const textW = f.name.length * 4.5 + 8
      if (arcLen > textW) {
        large.push(f)
      } else {
        small.push(f)
      }
    }
    return { largeFeatures: large, smallFeatures: small }
  }, [sequence, showFeatures])

  // Unified external labels: restriction sites + small features in shared left/right columns
  const externalLabels = useMemo(() => {
    if (!sequence) return [] as ExternalLabelPlacement[]

    const items: ExternalLabel[] = []

    // Add restriction site labels
    if (showRestrictionSites) {
      for (const site of sequence.restrictionSites) {
        items.push({
          id: `site-${site.enzyme}-${site.position}`,
          name: site.enzyme,
          angle: bpToAngle(site.position, sequence.length),
          kind: 'site',
          color: theme.colors.restrictionSite,
        })
      }
    }

    // Add small feature labels
    if (showFeatures) {
      for (const f of smallFeatures) {
        const midBp = f.start <= f.end
          ? (f.start + f.end) / 2
          : ((f.start + f.end + sequence.length) / 2) % sequence.length
        const arcRadius = f.strand === 1
          ? OUTER_FEATURE_RADIUS
          : INNER_FEATURE_RADIUS
        items.push({
          id: f.id,
          name: f.name,
          angle: bpToAngle(midBp, sequence.length),
          kind: 'feature',
          color: getThemedFeatureColor(f.type, theme),
          anchorRadius: arcRadius,
        })
      }
    }

    return assignExternalLabels(items)
  }, [sequence, showFeatures, showRestrictionSites, smallFeatures])

  // Ruler ticks
  const rulerTicks = useMemo(() => {
    if (!sequence || sequence.length === 0) return []
    const interval = Math.max(
      1,
      Math.pow(10, Math.floor(Math.log10(sequence.length / 10))),
    )
    const ticks: { bp: number; major: boolean }[] = []
    for (let bp = 0; bp < sequence.length; bp += interval) {
      ticks.push({ bp, major: bp % (interval * 5) === 0 })
    }
    return ticks
  }, [sequence])

  // Export map as SVG or PNG
  const exportMap = useCallback(async (format: 'svg' | 'png') => {
    const svg = svgRef.current
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)

    if (format === 'svg') {
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sequence?.name ?? 'circular-map'}.svg`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const img = new Image()
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = TOTAL_W * 2
        canvas.height = TOTAL_H * 2
        const ctx = canvas.getContext('2d')!
        ctx.scale(2, 2)
        ctx.fillStyle = theme.colors.background
        ctx.fillRect(0, 0, TOTAL_W, TOTAL_H)
        ctx.drawImage(img, 0, 0, TOTAL_W, TOTAL_H)
        URL.revokeObjectURL(url)
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return
          const pngUrl = URL.createObjectURL(pngBlob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `${sequence?.name ?? 'circular-map'}.png`
          a.click()
          URL.revokeObjectURL(pngUrl)
        }, 'image/png')
      }
      img.src = url
    }
  }, [sequence])

  if (!sequence || sequence.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#9c9690]">
        {!sequence ? 'No sequence loaded' : 'Empty sequence — add bases in Edit Mode'}
      </div>
    )
  }

  const seqLen = sequence.length

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-auto bg-white p-4">
      {/* Export buttons */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <button
          onClick={() => exportMap('svg')}
          title="Save as SVG"
          className="flex items-center gap-1 rounded border border-[#e8e5df] bg-white/90 px-2 py-1 text-[10px] text-[#6b6560] shadow-sm hover:bg-[#f5f3ee] backdrop-blur-sm"
        >
          <Download className="h-3 w-3" />
          SVG
        </button>
        <button
          onClick={() => exportMap('png')}
          title="Save as PNG"
          className="flex items-center gap-1 rounded border border-[#e8e5df] bg-white/90 px-2 py-1 text-[10px] text-[#6b6560] shadow-sm hover:bg-[#f5f3ee] backdrop-blur-sm"
        >
          <Camera className="h-3 w-3" />
          PNG
        </button>
      </div>

      {/* Zoom + Opacity controls stacked bottom-right */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 rounded border border-[#e8e5df] bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
          <span className="text-[9px] text-[#9c9690] select-none">Zoom</span>
          <input
            type="range"
            min={10}
            max={500}
            value={Math.round(zoom.level * 100)}
            onChange={(e) => mapZoomBy((Number(e.target.value) / 100) - zoom.level)}
            className="h-1 w-16 cursor-pointer appearance-none rounded bg-[#e8e5df] accent-[#6b6560] [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6b6560]"
          />
          <span className="w-7 text-right text-[8px] tabular-nums text-[#9c9690] select-none">{Math.round(zoom.level * 100)}%</span>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-[#e8e5df] bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
          <span className="text-[9px] text-[#9c9690] select-none">Color</span>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(colorOpacity * 100)}
            onChange={(e) => setColorOpacity(Number(e.target.value) / 100)}
            className="h-1 w-16 cursor-pointer appearance-none rounded bg-[#e8e5df] accent-[#6b6560] [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6b6560]"
          />
          <span className="w-7 text-right text-[8px] tabular-nums text-[#9c9690] select-none">{Math.round(colorOpacity * 100)}%</span>
        </div>
        <div className="flex items-center gap-0.5 rounded border border-[#e8e5df] bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur-sm">
          <span className="text-[9px] text-[#9c9690] select-none mr-1">Palette</span>
          {(['paper', 'vivid', 'ocean', 'colorblind', 'grayscale'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setColorPalette(p)}
              className={`rounded px-1.5 py-0.5 text-[8px] font-medium capitalize transition-colors ${
                colorPalette === p
                  ? 'bg-[#6b6560] text-white'
                  : 'text-[#9c9690] hover:bg-[#eae7e1]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        width={TOTAL_W}
        height={TOTAL_H}
        viewBox={`${-PAD_X} ${-PAD_Y} ${TOTAL_W} ${TOTAL_H}`}
        style={{ transform: `scale(${zoom.level})`, transformOrigin: 'center' }}
        onClick={handleCircleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverBp(null)}
      >
        {/* Gradient definitions — gated by theme */}
        {theme.style.useGradients && (
          <defs>
            {/* Gradients would be defined here for themes that use them */}
          </defs>
        )}

        {/* Backbone — single thin ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={BACKBONE_RADIUS}
          fill="none"
          stroke={theme.colors.backbone}
          strokeWidth={theme.strokes.backbone}
          {...NSS}
        />

        {/* Ruler ticks around the ring */}
        {rulerTicks.map((tick) => {
          const angle = bpToAngle(tick.bp, seqLen)
          const outer = polarToCart(angle, BACKBONE_RADIUS - BACKBONE_WIDTH / 2 - 1)
          const inner = polarToCart(angle, tick.major ? RULER_TICK_RADIUS_MAJOR : RULER_TICK_RADIUS_MINOR)
          return (
            <g key={`tick-${tick.bp}`}>
              <line
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke={theme.colors.ruler}
                strokeWidth={tick.major ? theme.strokes.rulerTickMajor : theme.strokes.rulerTickMinor}
                {...NSS}
              />
              {tick.major && (
                <text
                  x={polarToCart(angle, RULER_LABEL_RADIUS).x}
                  y={polarToCart(angle, RULER_LABEL_RADIUS).y}
                  fill={theme.colors.rulerLabel}
                  fontSize={theme.typography.rulerLabelSize}
                  fontFamily={theme.typography.fontFamily}
                  fontWeight={theme.typography.coordWeight}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${(angle * 180) / Math.PI + 90}, ${polarToCart(angle, RULER_LABEL_RADIUS).x}, ${polarToCart(angle, RULER_LABEL_RADIUS).y})`}
                >
                  {tick.bp}
                </text>
              )}
            </g>
          )
        })}

        {/* ── Feature arcs — flat muted fills ─────────────────────── */}
        {showFeatures &&
          sequence.features.map((f) => {
            const color = getThemedFeatureColor(f.type, theme)
            const style = getThemedFeatureStyle(f.type, color, theme, colorOpacity)
            const radius =
              f.strand === 1
                ? OUTER_FEATURE_RADIUS - FEATURE_WIDTH / 2
                : INNER_FEATURE_RADIUS + FEATURE_WIDTH / 2
            const hasArrow = ARROW_FEATURE_TYPES.has(f.type)

            const onClick = (e: React.MouseEvent) => {
              e.stopPropagation()
              setSelectedRange({
                start: f.start,
                end: f.end,
                wrapsAround: f.start > f.end,
              })
            }

            const buildPath = (sBp: number, eBp: number) =>
              hasArrow
                ? arcWithArrowPath(sBp, eBp, seqLen, radius, FEATURE_WIDTH, f.strand)
                : arcPath(sBp, eBp, seqLen, radius, FEATURE_WIDTH)

            const pathProps = {
              fill: style.fill,
              fillOpacity: style.fillOpacity,
              stroke: style.stroke,
              strokeWidth: style.strokeWidth,
              ...NSS,
            }

            if (f.start <= f.end) {
              return (
                <g key={f.id} onClick={onClick} className="cursor-pointer">
                  <path d={buildPath(f.start, f.end)} {...pathProps} />
                  <title>{f.name} ({f.start}..{f.end})</title>
                </g>
              )
            }
            // Wraparound feature — two segments
            const seg1HasArrow = hasArrow && f.strand === -1
            const seg2HasArrow = hasArrow && f.strand === 1
            return (
              <g key={f.id} onClick={onClick} className="cursor-pointer">
                <path
                  d={seg1HasArrow
                    ? arcWithArrowPath(f.start, seqLen, seqLen, radius, FEATURE_WIDTH, f.strand)
                    : arcPath(f.start, seqLen, seqLen, radius, FEATURE_WIDTH)}
                  {...pathProps}
                />
                <path
                  d={seg2HasArrow
                    ? arcWithArrowPath(0, f.end, seqLen, radius, FEATURE_WIDTH, f.strand)
                    : arcPath(0, f.end, seqLen, radius, FEATURE_WIDTH)}
                  {...pathProps}
                />
                <title>{f.name} ({f.start}..{f.end}) [wraparound]</title>
              </g>
            )
          })}

        {/* ── Large-feature inline labels (curved text inside the arc) ── */}
        {showFeatures && largeFeatures.map((f) => {
          const radius = f.strand === 1
            ? OUTER_FEATURE_RADIUS - FEATURE_WIDTH / 2
            : INNER_FEATURE_RADIUS + FEATURE_WIDTH / 2
          const textPathId = `tp-${f.id}`

          // For arrow features, inset the text path to avoid the arrowhead zone
          const hasArrow = ARROW_FEATURE_TYPES.has(f.type)
          let tpStart = f.start
          let tpEnd = f.end

          if (hasArrow && f.start <= f.end) {
            const bpSpan = f.end - f.start
            const inset = Math.round(bpSpan * 0.08)
            if (f.strand === 1) {
              tpEnd = f.end - inset
            } else {
              tpStart = f.start + inset
            }
          }

          // Adaptive text color: light fills (opacity < 0.2) use the base color,
          // strong fills use white with shadow for contrast
          const featureColor = getThemedFeatureColor(f.type, theme)
          const featureStyle = getThemedFeatureStyle(f.type, featureColor, theme, colorOpacity)
          const isLightFill = featureStyle.fillOpacity < 0.2
          const textFill = isLightFill ? featureColor : theme.colors.inlineLabelLight
          const textShadow = isLightFill ? 'none' : '0 0.5px 1px rgba(0,0,0,0.4)'

          return (
            <g key={`ilabel-${f.id}`}>
              <defs>
                <path
                  id={textPathId}
                  d={textArcPath(tpStart, tpEnd, seqLen, radius)}
                  fill="none"
                />
              </defs>
              <text
                fill={textFill}
                fontSize={theme.typography.inlineLabelSize}
                fontFamily={theme.typography.fontFamily}
                fontWeight={theme.typography.nameWeight}
                dominantBaseline="central"
                style={{ textShadow }}
              >
                <textPath
                  href={`#${textPathId}`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {f.name}
                </textPath>
              </text>
            </g>
          )
        })}

        {/* ── Restriction site markers ─────────────────────────────── */}
        {showRestrictionSites &&
          sequence.restrictionSites.map((site, i) => {
            const angle = bpToAngle(site.position, seqLen)

            if (theme.style.restrictionSiteCircles) {
              // Hollow circle marker at backbone radius
              const pos = polarToCart(angle, BACKBONE_RADIUS)
              return (
                <g key={`site-${i}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={theme.style.restrictionSiteCircleRadius}
                    fill="none"
                    stroke={theme.colors.restrictionSite}
                    strokeWidth={theme.strokes.restrictionMarker}
                    {...NSS}
                  />
                  <title>{site.enzyme} at {site.position}</title>
                </g>
              )
            }

            // Tick fallback for themes that don't use circles
            const inner = polarToCart(angle, SITE_TICK_INNER)
            const outer = polarToCart(angle, SITE_TICK_OUTER)
            return (
              <g key={`site-${i}`}>
                <line
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                  stroke={theme.colors.restrictionSite}
                  strokeWidth={theme.strokes.restrictionMarker}
                  {...NSS}
                />
                <title>{site.enzyme} at {site.position}</title>
              </g>
            )
          })}

        {/* ── Unified external labels (restriction sites + small features) ── */}
        {externalLabels.map((item) => {
          // Anchor point: where the leader starts on the map
          const anchorR = item.kind === 'site'
            ? BACKBONE_RADIUS + theme.style.restrictionSiteCircleRadius + 1
            : (item.anchorRadius ?? OUTER_FEATURE_RADIUS)
          const anchorPos = polarToCart(item.angle, anchorR)

          // Elbow: always radially outward from anchor
          const elbowR = Math.max(anchorR + 4, LABEL_ELBOW_RADIUS)
          const elbowPos = polarToCart(item.angle, elbowR)

          // Text anchor: right-side labels start from left edge, left-side from right edge
          const textAnchor = item.side === 'right' ? 'start' : 'end'
          // Nudge text slightly outward from the label point
          const nudge = item.side === 'right' ? 3 : -3

          if (item.kind === 'site') {
            return (
              <g key={`el-${item.id}`}>
                <polyline
                  points={`${anchorPos.x},${anchorPos.y} ${elbowPos.x},${elbowPos.y} ${item.labelX},${item.labelY}`}
                  fill="none"
                  stroke={theme.colors.leaderLine}
                  strokeWidth={theme.strokes.leaderLine}
                  {...NSS}
                />
                <text
                  x={item.labelX + nudge} y={item.labelY}
                  fill={theme.colors.restrictionSiteLabel}
                  fontSize={theme.typography.externalLabelSize}
                  fontFamily={theme.typography.fontFamily}
                  fontWeight={theme.typography.nameWeight}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                >
                  {item.name}
                </text>
              </g>
            )
          }

          // Small feature: outlined pill badge with leader
          const badgeW = item.name.length * SMALL_BADGE_CHAR_W + SMALL_BADGE_PAD_X * 2
          const badgeX = item.side === 'right' ? item.labelX + 2 : item.labelX - badgeW - 2
          return (
            <g key={`el-${item.id}`}>
              <polyline
                points={`${anchorPos.x},${anchorPos.y} ${elbowPos.x},${elbowPos.y} ${item.labelX},${item.labelY}`}
                fill="none"
                stroke={theme.colors.leaderLine}
                strokeWidth={theme.strokes.leaderLine}
                {...NSS}
              />
              <rect
                x={badgeX} y={item.labelY - SMALL_BADGE_H / 2}
                width={badgeW} height={SMALL_BADGE_H}
                rx={SMALL_BADGE_H / 2}
                fill="white" stroke={item.color} strokeWidth={1} opacity={0.9}
              />
              <text
                x={badgeX + badgeW / 2} y={item.labelY}
                fill={item.color}
                fontSize={6.5}
                fontFamily={theme.typography.fontFamily}
                fontWeight={theme.typography.nameWeight}
                textAnchor="middle" dominantBaseline="central"
              >
                {item.name}
              </text>
            </g>
          )
        })}

        {/* ORF arcs */}
        {showOrfs &&
          sequence.orfs.map((orf) => {
            const radius = ORF_RADIUS - orf.frame * 10
            const start = Math.min(orf.start, orf.end)
            const end = Math.max(orf.start, orf.end)
            const midBp = (start + end) / 2
            const midAngle = bpToAngle(midBp, seqLen)
            const labelPos = polarToCart(midAngle, radius)
            const orfLabel = `ORF ${orf.strand === 1 ? '+' : '−'}${orf.frame + 1}`
            const spanAngle = ((end - start) / seqLen) * Math.PI * 2
            const showLabel = spanAngle > 0.3

            return (
              <g key={orf.id}>
                <path
                  d={simpleArcPath(start, end, seqLen, radius)}
                  fill="none"
                  stroke={theme.colors.orf}
                  strokeWidth={theme.strokes.orf}
                  opacity={0.3}
                  strokeLinecap="round"
                  {...NSS}
                />
                {showLabel && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    fill={theme.colors.orfLabel}
                    fontSize={6}
                    fontFamily={theme.typography.fontFamily}
                    fontWeight={theme.typography.nameWeight}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={0.7}
                  >
                    {orfLabel}
                  </text>
                )}
                <title>
                  ORF {orf.strand === 1 ? '+' : '-'}
                  {orf.frame} ({orf.start}..{orf.end})
                </title>
              </g>
            )
          })}

        {/* Selection arc */}
        {selectedRange && (
          <path
            d={simpleArcPath(
              selectedRange.start,
              selectedRange.end,
              seqLen,
              BACKBONE_RADIUS,
            )}
            fill="none"
            stroke={theme.colors.selection}
            strokeWidth={theme.strokes.selection}
            opacity={0.4}
            pointerEvents="none"
            {...NSS}
          />
        )}

        {/* Center info */}
        <text
          x={CENTER}
          y={CENTER - 6}
          fill={theme.colors.centerName}
          fontSize={theme.typography.centerNameSize}
          fontFamily={theme.typography.fontFamily}
          fontWeight={theme.typography.nameWeight}
          textAnchor="middle"
        >
          {sequence.name}
        </text>
        <text
          x={CENTER}
          y={CENTER + 12}
          fill={theme.colors.centerBp}
          fontSize={theme.typography.centerBpSize}
          fontFamily={theme.typography.fontFamily}
          fontWeight={theme.typography.coordWeight}
          textAnchor="middle"
        >
          {sequence.length.toLocaleString()} bp
        </text>

        {/* Stats block — bottom-right corner */}
        {theme.style.showStatsBlock && (
          <text
            x={SIZE + PAD_X - 4}
            y={SIZE + PAD_Y - 4}
            fill={theme.colors.statsText}
            fontSize={theme.typography.statsSize}
            fontFamily={theme.typography.monoFontFamily}
            fontWeight={theme.typography.coordWeight}
            textAnchor="end"
            dominantBaseline="auto"
          >
            {sequence.length.toLocaleString()} bp · {computeGC(sequence.bases).toFixed(1)}% GC
          </text>
        )}
      </svg>
      {hoverBp !== null && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-[#1a1a1a]/80 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
          Position: <span className="text-emerald-400">{hoverBp + 1}</span>
          {' / '}
          {sequence.length} bp
          {sequence.bases[hoverBp] && (
            <>
              {' · Base: '}
              <span className="text-sky-400">{sequence.bases[hoverBp].toUpperCase()}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
