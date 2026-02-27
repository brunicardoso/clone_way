'use client'

import { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { getThemedFeatureColor, getThemedFeatureStyle } from '@/lib/constants'
import { PAPER_THEME, COLOR_PALETTES } from '@/lib/theme'
import type { ColorPaletteName } from '@/lib/theme'
import { Download, Camera } from 'lucide-react'
import type { Feature, Sequence } from '@/types'
import { MagnifyingLens } from './MagnifyingLens'

// ── Theme ────────────────────────────────────────────────────────────────
const baseTheme = PAPER_THEME

// ── Layout zones (top→bottom) ───────────────────────────────────────────
// Zone 1: Small-feature labels (detached above)
const SMALL_LABEL_ZONE_TOP = 4
const SMALL_LABEL_TIER_H = 14
const NUM_SMALL_LABEL_TIERS = 6
const SMALL_LABEL_ZONE_H = SMALL_LABEL_TIER_H * NUM_SMALL_LABEL_TIERS + 4

// Zone 2: Features + backbone
const ZONE2_TOP = SMALL_LABEL_ZONE_TOP + SMALL_LABEL_ZONE_H + 8
const FEATURE_HEIGHT = 16
const TRACK_GAP = 3
const BACKBONE_THICKNESS = baseTheme.layout.backboneWidth
const ORF_HEIGHT = 8
const ORF_GAP = 4
const ARROW_TIP_WIDTH = 8

// Zone 3: Ruler + restriction site labels (detached below)
const RULER_GAP = 30
const RULER_TICK_MAJOR_H = 8
const RULER_TICK_MINOR_H = 4
const RULER_LABEL_OFFSET = 14
const SITE_LABEL_TIER_H = 13
const NUM_SITE_LABEL_TIERS = 8

// Non-scaling stroke attribute
const NSS = baseTheme.style.nonScalingStroke ? { vectorEffect: 'non-scaling-stroke' as const } : {}

interface LinearMapProps {
  sequence?: Sequence | null
}

function assignTracks(features: Feature[]): Map<string, number> {
  const sorted = [...features].sort((a, b) => a.start - b.start)
  const tracks = new Map<string, number>()
  const trackEnds: number[] = []

  for (const f of sorted) {
    let placed = false
    for (let t = 0; t < trackEnds.length; t++) {
      if (f.start > trackEnds[t]) {
        trackEnds[t] = f.end
        tracks.set(f.id, t)
        placed = true
        break
      }
    }
    if (!placed) {
      tracks.set(f.id, trackEnds.length)
      trackEnds.push(f.end)
    }
  }
  return tracks
}

/** Arrow-shaped path: rounded back edge, pointed tip. */
function featureArrowPath(
  x: number,
  y: number,
  width: number,
  height: number,
  strand: 1 | -1,
): string {
  const r = Math.min(3, width / 4, height / 4)
  const tip = Math.min(ARROW_TIP_WIDTH, width * 0.4)
  const bodyW = Math.max(0, width - tip)

  if (strand === 1) {
    return [
      `M ${x + r} ${y}`,
      `L ${x + bodyW} ${y}`,
      `L ${x + width} ${y + height / 2}`,
      `L ${x + bodyW} ${y + height}`,
      `L ${x + r} ${y + height}`,
      `Q ${x} ${y + height} ${x} ${y + height - r}`,
      `L ${x} ${y + r}`,
      `Q ${x} ${y} ${x + r} ${y}`,
      'Z',
    ].join(' ')
  }
  return [
    `M ${x} ${y + height / 2}`,
    `L ${x + tip} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height - r}`,
    `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,
    `L ${x + tip} ${y + height}`,
    'Z',
  ].join(' ')
}

interface TieredLabel {
  id: string
  name: string
  cx: number
  tier: number
}

/** Greedy tier assignment for horizontally-placed labels. */
function assignLabelTiers(
  items: { id: string; name: string; cx: number }[],
  numTiers: number,
  charW: number,
  gap: number,
): TieredLabel[] {
  const sorted = [...items].sort((a, b) => a.cx - b.cx)
  const tierEnds: number[] = Array(numTiers).fill(-Infinity)

  return sorted.map((item) => {
    const labelW = item.name.length * charW + gap
    const left = item.cx - labelW / 2

    let bestTier = 0
    let found = false
    for (let t = 0; t < numTiers; t++) {
      if (left >= tierEnds[t]) {
        bestTier = t
        found = true
        break
      }
    }
    if (!found) {
      let minOverlap = Infinity
      for (let k = 0; k < numTiers; k++) {
        const overlap = tierEnds[k] - left
        if (overlap < minOverlap) {
          minOverlap = overlap
          bestTier = k
        }
      }
    }

    tierEnds[bestTier] = item.cx + labelW / 2
    return { ...item, tier: bestTier }
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

export function LinearMap({ sequence: sequenceProp }: LinearMapProps = {}) {
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

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverInfo, setHoverInfo] = useState<{
    x: number
    y: number
    bp: number
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -zoom.step : zoom.step
        mapZoomBy(delta)
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [mapZoomBy, zoom.step])

  const containerWidth = 800
  const svgWidth = Math.max(containerWidth, containerWidth * zoom.level)

  const bpToX = useCallback(
    (bp: number) => {
      if (!sequence || sequence.length === 0) return 0
      return (bp / sequence.length) * svgWidth
    },
    [sequence, svgWidth],
  )

  const xToBp = useCallback(
    (x: number) => {
      if (!sequence || sequence.length === 0) return 0
      return Math.round((x / svgWidth) * sequence.length)
    },
    [sequence, svgWidth],
  )

  // ── Feature tracks ────────────────────────────────────────────────────
  const featureTracks = useMemo(() => {
    if (!sequence || !showFeatures) return new Map<string, number>()
    return assignTracks(sequence.features)
  }, [sequence, showFeatures])

  const forwardFeatures = useMemo(
    () => (sequence?.features ?? []).filter((f) => f.strand === 1),
    [sequence],
  )
  const reverseFeatures = useMemo(
    () => (sequence?.features ?? []).filter((f) => f.strand === -1),
    [sequence],
  )

  const maxForwardTrack = useMemo(
    () => forwardFeatures.reduce((m, f) => Math.max(m, featureTracks.get(f.id) ?? 0), -1),
    [forwardFeatures, featureTracks],
  )
  const maxReverseTrack = useMemo(
    () => reverseFeatures.reduce((m, f) => Math.max(m, featureTracks.get(f.id) ?? 0), -1),
    [reverseFeatures, featureTracks],
  )

  // ── Y layout ──────────────────────────────────────────────────────────
  const forwardZoneH = (maxForwardTrack + 1) * (FEATURE_HEIGHT + TRACK_GAP)
  const reverseZoneH = (maxReverseTrack + 1) * (FEATURE_HEIGHT + TRACK_GAP)

  const backboneY = ZONE2_TOP + forwardZoneH + 4 + BACKBONE_THICKNESS / 2
  const reverseEndY = backboneY + BACKBONE_THICKNESS / 2 + 4 + reverseZoneH

  // Account for ORF tracks below the reverse features
  const orfTrackCount = showOrfs && sequence ? Math.max(0, ...sequence.orfs.filter(o => o.strand === -1).map(o => o.frame + 1), 0) : 0
  const orfZoneH = orfTrackCount > 0 ? ORF_GAP + orfTrackCount * (ORF_HEIGHT + 2) : 0

  // Ruler line Y — pushed below features + ORFs
  const rulerY = reverseEndY + orfZoneH + RULER_GAP
  // Total SVG height — enough for ruler labels + site label tiers
  const mapHeight = rulerY + RULER_LABEL_OFFSET + 4 + NUM_SITE_LABEL_TIERS * SITE_LABEL_TIER_H + 8

  // ── Small-feature labels (detached zone 1) ────────────────────────────
  const smallFeatureLabels = useMemo(() => {
    if (!sequence || !showFeatures) return [] as TieredLabel[]
    const SMALL_THRESHOLD = 30
    const items = sequence.features
      .map((f) => {
        const x = bpToX(f.start)
        const w = Math.max(2, bpToX(f.end) - bpToX(f.start))
        return { id: f.id, name: f.name, cx: x + w / 2, width: w }
      })
      .filter((f) => f.width <= SMALL_THRESHOLD)

    return assignLabelTiers(items, NUM_SMALL_LABEL_TIERS, 5.5, 12)
  }, [sequence, showFeatures, bpToX])

  // Build a Set for quick lookup of which features already have a top-zone label
  const smallFeatureIds = useMemo(
    () => new Set(smallFeatureLabels.map((l) => l.id)),
    [smallFeatureLabels],
  )

  // ── Ruler ticks ───────────────────────────────────────────────────────
  const rulerTicks = useMemo(() => {
    if (!sequence || sequence.length === 0) return []
    const interval = Math.max(
      1,
      Math.pow(10, Math.floor(Math.log10(sequence.length / (10 * zoom.level)))),
    )
    const ticks: { bp: number; major: boolean }[] = []
    for (let bp = 0; bp <= sequence.length; bp += interval) {
      ticks.push({ bp, major: bp % (interval * 5) === 0 })
    }
    return ticks
  }, [sequence, zoom.level])

  // ── Restriction site labels on ruler (zone 3) ────────────────────────
  const siteLabelTiers = useMemo(() => {
    if (!sequence || !showRestrictionSites) return [] as (TieredLabel & { position: number })[]
    const items = sequence.restrictionSites.map((site) => ({
      id: `site-${site.enzyme}-${site.position}`,
      name: site.enzyme,
      cx: bpToX(site.position + site.cutOffset),
      position: site.position,
    }))
    const tiered = assignLabelTiers(items, NUM_SITE_LABEL_TIERS, 5, 10)
    return tiered.map((t, i) => ({ ...t, position: items[i].position }))
  }, [sequence, showRestrictionSites, bpToX])

  // ── Event handlers ────────────────────────────────────────────────────
  const handleBackboneClick = useCallback(
    (e: React.MouseEvent<SVGLineElement>) => {
      if (!svgRef.current || !sequence) return
      const rect = svgRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const bp = xToBp(x)
      setSelectedRange({ start: bp, end: bp, wrapsAround: false })
    },
    [sequence, xToBp, setSelectedRange],
  )

  const LENS_WINDOW = 30

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!svgRef.current || !sequence) return
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      const svgRect = svgRef.current.getBoundingClientRect()
      const xInSvg = e.clientX - svgRect.left
      const bp = xToBp(xInSvg)
      setHoverInfo({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
        bp: Math.max(0, Math.min(bp, sequence.length - 1)),
      })
    },
    [sequence, xToBp],
  )

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null)
  }, [])

  const lensBasesInfo = useMemo(() => {
    if (!hoverInfo || !sequence) return null
    const half = Math.floor(LENS_WINDOW / 2)
    let start = hoverInfo.bp - half
    let end = hoverInfo.bp + half
    let bases: string
    if (sequence.isCircular) {
      bases = ''
      for (let i = start; i <= end; i++) {
        const idx = ((i % sequence.length) + sequence.length) % sequence.length
        bases += sequence.bases[idx]
      }
    } else {
      start = Math.max(0, start)
      end = Math.min(sequence.length - 1, end)
      bases = sequence.bases.slice(start, end + 1)
    }
    return { bases, centerBp: hoverInfo.bp }
  }, [hoverInfo, sequence])

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
      a.download = `${sequence?.name ?? 'linear-map'}.svg`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const img = new Image()
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = svgWidth * 2
        canvas.height = mapHeight * 2
        const ctx = canvas.getContext('2d')!
        ctx.scale(2, 2)
        ctx.fillStyle = theme.colors.background
        ctx.fillRect(0, 0, svgWidth, mapHeight)
        ctx.drawImage(img, 0, 0, svgWidth, mapHeight)
        URL.revokeObjectURL(url)
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return
          const pngUrl = URL.createObjectURL(pngBlob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `${sequence?.name ?? 'linear-map'}.png`
          a.click()
          URL.revokeObjectURL(pngUrl)
        }, 'image/png')
      }
      img.src = url
    }
  }, [sequence, svgWidth, mapHeight])

  if (!sequence || sequence.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[#9c9690]">
        {!sequence ? 'No sequence loaded' : 'Empty sequence — add bases in Edit Mode'}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative shrink-0 overflow-x-auto border-b border-[#e8e5df] bg-white"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Export buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1.5">
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


      <svg
        ref={svgRef}
        width={svgWidth}
        height={mapHeight}
        className="block"
      >
        {/* ═══════════════════════════════════════════════════════════
            ZONE 1 — Small-feature labels (detached above)
            ═══════════════════════════════════════════════════════════ */}
        {showFeatures && smallFeatureLabels.map((label) => {
          const labelY = SMALL_LABEL_ZONE_TOP + SMALL_LABEL_ZONE_H - label.tier * SMALL_LABEL_TIER_H
          const f = sequence.features.find((feat) => feat.id === label.id)
          if (!f) return null
          const track = featureTracks.get(f.id) ?? 0
          const fX = bpToX(f.start)
          const fW = Math.max(2, bpToX(f.end) - bpToX(f.start))
          const arrowY = f.strand === 1
            ? backboneY - BACKBONE_THICKNESS / 2 - 4 - FEATURE_HEIGHT - track * (FEATURE_HEIGHT + TRACK_GAP)
            : backboneY + BACKBONE_THICKNESS / 2 + 4 + track * (FEATURE_HEIGHT + TRACK_GAP) + FEATURE_HEIGHT
          const color = getThemedFeatureColor(f.type, theme)

          return (
            <g key={`sl-${label.id}`}>
              {/* Leader line from label down to the feature arrow */}
              <line
                x1={label.cx}
                y1={labelY + 4}
                x2={fX + fW / 2}
                y2={arrowY}
                stroke={theme.colors.leaderLine}
                strokeWidth={theme.strokes.leaderLine}
                strokeDasharray="2,2"
                {...NSS}
              />
              {/* Label text */}
              <text
                x={label.cx}
                y={labelY}
                fill={color}
                fontSize={theme.typography.externalLabelSize + 1}
                fontFamily={theme.typography.fontFamily}
                fontWeight={theme.typography.nameWeight}
                textAnchor="middle"
              >
                {label.name}
              </text>
            </g>
          )
        })}

        {/* Thin separator between zone 1 and zone 2 */}
        <line
          x1={0}
          y1={ZONE2_TOP - 4}
          x2={svgWidth}
          y2={ZONE2_TOP - 4}
          stroke="#eae7e1"
          strokeWidth={0.5}
          {...NSS}
        />

        {/* ═══════════════════════════════════════════════════════════
            ZONE 2 — Backbone + Features
            ═══════════════════════════════════════════════════════════ */}

        {/* Backbone — single thin line */}
        <line
          x1={0}
          y1={backboneY}
          x2={svgWidth}
          y2={backboneY}
          stroke={theme.colors.backbone}
          strokeWidth={theme.strokes.backbone}
          onClick={handleBackboneClick}
          className="cursor-crosshair"
          {...NSS}
        />

        {/* Selection overlay */}
        {selectedRange && (
          <rect
            x={bpToX(selectedRange.start)}
            y={backboneY - 8}
            width={Math.max(2, bpToX(selectedRange.end) - bpToX(selectedRange.start))}
            height={16}
            fill={theme.colors.selection} opacity={0.3} rx={3} pointerEvents="none"
          />
        )}

        {/* Forward features (above backbone) */}
        {showFeatures && forwardFeatures.map((f) => {
          const track = featureTracks.get(f.id) ?? 0
          const x = bpToX(f.start)
          const width = Math.max(2, bpToX(f.end) - bpToX(f.start))
          const y = backboneY - BACKBONE_THICKNESS / 2 - 4 - FEATURE_HEIGHT - track * (FEATURE_HEIGHT + TRACK_GAP)
          const color = getThemedFeatureColor(f.type, theme)
          const style = getThemedFeatureStyle(f.type, color, theme, colorOpacity)
          const isSmall = smallFeatureIds.has(f.id)
          // Adaptive text color: use base color when fill is light, white when opaque
          const isLightFill = style.fillOpacity < 0.2
          const textFill = isLightFill ? color : theme.colors.inlineLabelLight
          const textShadow = isLightFill ? 'none' : '0 1px 1px rgba(0,0,0,0.3)'

          return (
            <g
              key={f.id}
              onClick={() => setSelectedRange({ start: f.start, end: f.end, wrapsAround: false })}
              className="cursor-pointer"
            >
              <path
                d={featureArrowPath(x, y, width, FEATURE_HEIGHT, 1)}
                fill={style.fill}
                fillOpacity={style.fillOpacity}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                {...NSS}
              />
              {/* Inline label for wide features */}
              {!isSmall && width > 30 && (
                <text
                  x={x + 4}
                  y={y + FEATURE_HEIGHT / 2 + 3.5}
                  fill={textFill}
                  fontSize={9}
                  fontFamily={theme.typography.fontFamily}
                  fontWeight={theme.typography.nameWeight}
                  style={{ textShadow }}
                >
                  {f.name.length > width / 6
                    ? f.name.slice(0, Math.floor(width / 6)) + '…'
                    : f.name}
                </text>
              )}
              <title>{f.name} ({f.start}..{f.end})</title>
            </g>
          )
        })}

        {/* Reverse features (below backbone) */}
        {showFeatures && reverseFeatures.map((f) => {
          const track = featureTracks.get(f.id) ?? 0
          const x = bpToX(f.start)
          const width = Math.max(2, bpToX(f.end) - bpToX(f.start))
          const y = backboneY + BACKBONE_THICKNESS / 2 + 4 + track * (FEATURE_HEIGHT + TRACK_GAP)
          const color = getThemedFeatureColor(f.type, theme)
          const style = getThemedFeatureStyle(f.type, color, theme, colorOpacity)
          const isSmall = smallFeatureIds.has(f.id)
          // Adaptive text color: use base color when fill is light, white when opaque
          const isLightFill = style.fillOpacity < 0.2
          const textFill = isLightFill ? color : theme.colors.inlineLabelLight
          const textShadow = isLightFill ? 'none' : '0 1px 1px rgba(0,0,0,0.3)'

          return (
            <g
              key={f.id}
              onClick={() => setSelectedRange({ start: f.start, end: f.end, wrapsAround: false })}
              className="cursor-pointer"
            >
              <path
                d={featureArrowPath(x, y, width, FEATURE_HEIGHT, -1)}
                fill={style.fill}
                fillOpacity={style.fillOpacity}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                {...NSS}
              />
              {!isSmall && width > 30 && (
                <text
                  x={x + (ARROW_TIP_WIDTH + 2)}
                  y={y + FEATURE_HEIGHT / 2 + 3.5}
                  fill={textFill}
                  fontSize={9}
                  fontFamily={theme.typography.fontFamily}
                  fontWeight={theme.typography.nameWeight}
                  style={{ textShadow }}
                >
                  {f.name.length > width / 6
                    ? f.name.slice(0, Math.floor(width / 6)) + '…'
                    : f.name}
                </text>
              )}
              <title>{f.name} ({f.start}..{f.end})</title>
            </g>
          )
        })}

        {/* Restriction site markers on backbone */}
        {showRestrictionSites && sequence.restrictionSites.map((site, i) => {
          const x = bpToX(site.position + site.cutOffset)

          if (theme.style.restrictionSiteCircles) {
            return (
              <circle
                key={`rs-tick-${i}`}
                cx={x}
                cy={backboneY}
                r={theme.style.restrictionSiteCircleRadius}
                fill="none"
                stroke={theme.colors.restrictionSite}
                strokeWidth={theme.strokes.restrictionMarker}
                {...NSS}
              />
            )
          }

          return (
            <line
              key={`rs-tick-${i}`}
              x1={x} y1={backboneY - 5}
              x2={x} y2={backboneY + 5}
              stroke={theme.colors.restrictionSite}
              strokeWidth={theme.strokes.restrictionMarker}
              {...NSS}
            />
          )
        })}

        {/* ORF blocks */}
        {showOrfs && sequence.orfs.map((orf) => {
          const x = bpToX(Math.min(orf.start, orf.end))
          const width = Math.max(
            2,
            bpToX(Math.max(orf.start, orf.end)) - bpToX(Math.min(orf.start, orf.end)),
          )
          const y = orf.strand === 1
            ? backboneY - BACKBONE_THICKNESS / 2 - 4 - forwardZoneH - ORF_GAP - (orf.frame + 1) * (ORF_HEIGHT + 2)
            : backboneY + BACKBONE_THICKNESS / 2 + 4 + reverseZoneH + ORF_GAP + orf.frame * (ORF_HEIGHT + 2)
          const orfLabel = `ORF ${orf.strand === 1 ? '+' : '−'}${orf.frame + 1}`
          return (
            <g key={orf.id}>
              <rect
                x={x} y={y} width={width} height={ORF_HEIGHT}
                fill={theme.colors.orf} opacity={0.3} rx={2}
              />
              {width > 40 && (
                <text
                  x={x + 4}
                  y={y + ORF_HEIGHT / 2 + 3}
                  fill={theme.colors.orfLabel}
                  fontSize={7}
                  fontFamily={theme.typography.fontFamily}
                  fontWeight={theme.typography.nameWeight}
                  opacity={0.8}
                >
                  {orfLabel}
                </text>
              )}
              <title>ORF {orf.strand === 1 ? '+' : '-'}{orf.frame} ({orf.start}..{orf.end})</title>
            </g>
          )
        })}

        {/* ═══════════════════════════════════════════════════════════
            ZONE 3 — Ruler + Restriction site labels (detached below)
            ═══════════════════════════════════════════════════════════ */}

        {/* Subtle separator line */}
        <line
          x1={0} y1={rulerY - RULER_GAP / 2}
          x2={svgWidth} y2={rulerY - RULER_GAP / 2}
          stroke="#eae7e1" strokeWidth={0.5}
          {...NSS}
        />

        {/* Ruler baseline */}
        <line
          x1={0} y1={rulerY} x2={svgWidth} y2={rulerY}
          stroke={theme.colors.ruler} strokeWidth={theme.strokes.rulerTickMajor}
          {...NSS}
        />

        {/* Ruler ticks + bp labels */}
        {rulerTicks.map((tick) => {
          const x = bpToX(tick.bp)
          return (
            <g key={`ruler-${tick.bp}`}>
              <line
                x1={x} y1={rulerY}
                x2={x} y2={rulerY - (tick.major ? RULER_TICK_MAJOR_H : RULER_TICK_MINOR_H)}
                stroke={theme.colors.ruler}
                strokeWidth={tick.major ? theme.strokes.rulerTickMajor : theme.strokes.rulerTickMinor}
                {...NSS}
              />
              {tick.major && (
                <text
                  x={x} y={rulerY - RULER_TICK_MAJOR_H - 2}
                  fill={theme.colors.rulerLabel}
                  fontSize={7.5}
                  fontFamily={theme.typography.fontFamily}
                  fontWeight={theme.typography.coordWeight}
                  textAnchor="middle"
                >
                  {tick.bp}
                </text>
              )}
            </g>
          )
        })}

        {/* Restriction site labels on ruler (zone 3) */}
        {showRestrictionSites && siteLabelTiers.map((item, i) => {
          const labelY = rulerY + RULER_LABEL_OFFSET + item.tier * SITE_LABEL_TIER_H
          return (
            <g key={`rsl-${i}`}>
              {/* Hollow circle marker on ruler */}
              {theme.style.restrictionSiteCircles ? (
                <circle
                  cx={item.cx}
                  cy={rulerY}
                  r={theme.style.restrictionSiteCircleRadius}
                  fill="none"
                  stroke={theme.colors.restrictionSite}
                  strokeWidth={theme.strokes.restrictionMarker}
                  {...NSS}
                />
              ) : (
                <>
                  <line
                    x1={item.cx} y1={rulerY}
                    x2={item.cx} y2={rulerY + 4}
                    stroke={theme.colors.restrictionSite}
                    strokeWidth={theme.strokes.restrictionMarker}
                    {...NSS}
                  />
                  <polygon
                    points={`${item.cx},${rulerY + 1} ${item.cx - 2},${rulerY + 5} ${item.cx + 2},${rulerY + 5}`}
                    fill={theme.colors.restrictionSite} opacity={0.6}
                  />
                </>
              )}
              {/* Leader line to label tier */}
              <line
                x1={item.cx} y1={rulerY + (theme.style.restrictionSiteCircles ? theme.style.restrictionSiteCircleRadius + 1 : 5)}
                x2={item.cx} y2={labelY - 4}
                stroke={theme.colors.leaderLine}
                strokeWidth={theme.strokes.leaderLine}
                {...NSS}
              />
              {/* Enzyme name */}
              <text
                x={item.cx} y={labelY}
                fill={theme.colors.restrictionSiteLabel}
                fontSize={theme.typography.externalLabelSize}
                fontFamily={theme.typography.fontFamily}
                fontWeight={theme.typography.nameWeight}
                textAnchor="middle"
              >
                {item.name}
              </text>
            </g>
          )
        })}

        {/* Stats block — bottom-right corner */}
        {theme.style.showStatsBlock && (
          <text
            x={svgWidth - 8}
            y={mapHeight - 6}
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

      {hoverInfo && lensBasesInfo && (
        <MagnifyingLens
          x={hoverInfo.x}
          y={hoverInfo.y}
          bases={lensBasesInfo.bases}
          centerBp={lensBasesInfo.centerBp}
          windowSize={LENS_WINDOW}
        />
      )}
      {hoverInfo && sequence && (
        <div className="pointer-events-none absolute bottom-1 left-2 z-10 rounded bg-[#1a1a1a]/80 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
          Position: <span className="text-emerald-400">{hoverInfo.bp + 1}</span>
          {' / '}{sequence.length} bp
        </div>
      )}
      {/* Zoom + Opacity controls stacked bottom-right */}
      <div className="absolute bottom-2 right-2 z-10 flex flex-col gap-1.5">
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
    </div>
  )
}
