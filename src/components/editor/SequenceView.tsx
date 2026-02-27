'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { FEATURE_COLORS } from '@/lib/constants'
import { translate } from '@/services/bio/codons'
import type { Sequence } from '@/types'

const BASE_FONT_SIZE = 14
const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 48
const BASE_CHARS_PER_ROW = 60
const GUTTER_WIDTH = 64

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G', N: 'N',
  a: 't', t: 'a', g: 'c', c: 'g', n: 'n',
}

const VALID_BASES = new Set(['a', 't', 'g', 'c', 'n'])


// Distinct colors for overlapping restriction enzyme sites
const ENZYME_COLORS = [
  { text: '#b91c1c', border: '#ef444480', bg: '#fef2f218', cut: '#dc262690', label: '#dc2626' },  // red
  { text: '#1d4ed8', border: '#3b82f680', bg: '#eff6ff18', cut: '#2563eb90', label: '#2563eb' },  // blue
  { text: '#7c3aed', border: '#8b5cf680', bg: '#f5f3ff18', cut: '#7c3aed90', label: '#7c3aed' },  // violet
  { text: '#b45309', border: '#f59e0b80', bg: '#fffbeb18', cut: '#d9770690', label: '#d97706' },  // amber
  { text: '#047857', border: '#10b98180', bg: '#ecfdf518', cut: '#05966990', label: '#059669' },  // emerald
  { text: '#be185d', border: '#ec489980', bg: '#fdf2f818', cut: '#db277780', label: '#db2777' },  // pink
  { text: '#0e7490', border: '#06b6d480', bg: '#ecfeff18', cut: '#088f9d90', label: '#0891b2' },  // cyan
  { text: '#92400e', border: '#d97706a0', bg: '#fef3c718', cut: '#b4530990', label: '#b45309' },  // brown
]

interface SequenceViewProps {
  sequence?: Sequence | null
}

export function SequenceView({ sequence: sequenceProp }: SequenceViewProps = {}) {
  const storeSequence = useSequenceStore((s) => s.sequence)
  const sequence = sequenceProp ?? storeSequence
  // When a sequence prop is passed, this is a split/secondary panel — read-only
  const isReadOnly = !!sequenceProp
  const zoom = useEditorStore((s) => s.seqZoom)
  const seqZoomBy = useEditorStore((s) => s.seqZoomBy)
  const seqZoomIn = useEditorStore((s) => s.seqZoomIn)
  const seqZoomOut = useEditorStore((s) => s.seqZoomOut)
  const selectedRange = useEditorStore((s) => s.selectedRange)
  const setSelectedRange = useEditorStore((s) => s.setSelectedRange)
  const showFeatures = useEditorStore((s) => s.showFeatures)
  const showOrfs = useEditorStore((s) => s.showOrfs)
  const showRestrictionSites = useEditorStore((s) => s.showRestrictionSites)
  const showTranslation = useEditorStore((s) => s.showTranslation)
  const editMode = useEditorStore((s) => s.editMode)
  const cursorPosition = useEditorStore((s) => s.cursorPosition)
  const setCursorPosition = useEditorStore((s) => s.setCursorPosition)

  const containerRef = useRef<HTMLDivElement>(null)
  const [selectStart, setSelectStart] = useState<number | null>(null)
  const [selectEnd, setSelectEnd] = useState<number | null>(null)
  const isSelecting = useRef(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Mouse wheel zoom (Ctrl/Cmd + scroll)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -zoom.step : zoom.step
        seqZoomBy(delta)
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [seqZoomBy, zoom.step])

  const fontSize = Math.max(
    MIN_FONT_SIZE,
    Math.min(MAX_FONT_SIZE, Math.round(BASE_FONT_SIZE * zoom.level)),
  )
  const charsPerRow = Math.max(
    10,
    Math.min(120, Math.round(BASE_CHARS_PER_ROW / zoom.level)),
  )

  // Pre-compute color for each base position from features
  const baseColors = useMemo(() => {
    if (!sequence || !showFeatures) return []
    const colors: (string | null)[] = new Array(sequence.length).fill(null)
    for (const feature of sequence.features) {
      const color =
        feature.color || FEATURE_COLORS[feature.type] || '#607D8B'
      if (feature.start <= feature.end) {
        for (let i = feature.start; i <= feature.end && i < sequence.length; i++) {
          if (!colors[i]) colors[i] = color
        }
      } else {
        // Wraparound feature
        for (let i = feature.start; i < sequence.length; i++) {
          if (!colors[i]) colors[i] = color
        }
        for (let i = 0; i <= feature.end && i < sequence.length; i++) {
          if (!colors[i]) colors[i] = color
        }
      }
    }
    return colors
  }, [sequence, showFeatures])

  // Pre-compute ORF positions for underline decoration
  const orfPositions = useMemo(() => {
    if (!sequence || !showOrfs) return new Set<number>()
    const positions = new Set<number>()
    for (const orf of sequence.orfs) {
      const start = Math.min(orf.start, orf.end)
      const end = Math.max(orf.start, orf.end)
      for (let i = start; i <= end && i < sequence.length; i++) {
        positions.add(i)
      }
    }
    return positions
  }, [sequence, showOrfs])

  // Pre-compute protein translation data for ORF/CDS regions
  const translationData = useMemo(() => {
    if (!sequence || !showTranslation) return new Map<number, { amino: string; color: string }>()
    const data = new Map<number, { amino: string; color: string }>()

    // CDS features take priority
    if (showFeatures) {
      for (const feature of sequence.features) {
        if (feature.type !== 'CDS') continue
        const color = feature.color || FEATURE_COLORS[feature.type] || '#607D8B'
        let subseq: string
        let startPos: number
        if (feature.start <= feature.end) {
          subseq = sequence.bases.slice(feature.start, feature.end + 1)
          startPos = feature.start
        } else {
          // Wraparound CDS on circular sequence
          subseq = sequence.bases.slice(feature.start) + sequence.bases.slice(0, feature.end + 1)
          startPos = feature.start
        }
        const protein = translate(subseq)
        for (let i = 0; i < protein.length; i++) {
          const pos = (startPos + i * 3 + 1) % sequence.length // second base of codon
          if (!data.has(pos)) {
            data.set(pos, { amino: protein[i], color: protein[i] === '*' ? '#dc2626' : color })
          }
        }
      }
    }

    // ORFs fill gaps
    if (showOrfs && sequence.orfs.length > 0) {
      for (const orf of sequence.orfs) {
        const start = Math.min(orf.start, orf.end)
        const end = Math.max(orf.start, orf.end)
        const subseq = sequence.bases.slice(start, end + 1)
        const protein = translate(subseq)
        for (let i = 0; i < protein.length; i++) {
          const pos = start + i * 3 + 1 // second base of codon
          if (!data.has(pos)) {
            data.set(pos, { amino: protein[i], color: protein[i] === '*' ? '#dc2626' : '#22c55e' })
          }
        }
      }
    }

    return data
  }, [sequence, showTranslation, showFeatures, showOrfs])

  // Pre-compute restriction site data per position
  const restrictionData = useMemo(() => {
    const empty = {
      // Each position -> the color index of the site that owns it
      positionColorIdx: new Map<number, number>(),
      cutPositions: new Map<number, { overhang: string; enzyme: string; side: 'sense' | 'anti'; colorIdx: number }>(),
      siteStarts: new Map<number, { enzyme: string; colorIdx: number }[]>(),
    }
    if (!sequence || !showRestrictionSites) return empty

    const seqLen = sequence.length
    const isCirc = sequence.isCircular

    // Sort sites by position so the greedy coloring processes them in sequence order.
    // This is critical because the store groups sites by enzyme, not by position.
    const sortedIndices = sequence.restrictionSites
      .map((_, i) => i)
      .sort((a, b) => sequence.restrictionSites[a].position - sequence.restrictionSites[b].position)
    const sites = sortedIndices.map((i) => sequence.restrictionSites[i])

    // Compute the start and end position for each site (resolved for circular)
    const siteRanges = sites.map((site) => {
      const len = site.recognitionSequence.length
      const start = site.position
      const end = start + len - 1
      return { start, end }
    })

    // Two sites are "neighbors" if they overlap OR are contiguous (touching).
    // Neighbors must get different colors so the user can distinguish them.
    function areNeighbors(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
      // Contiguous: a.end + 1 >= b.start (touching or overlapping)
      // We check both directions
      if (a.start <= b.end + 1 && b.start <= a.end + 1) return true
      // Handle circular wraparound
      if (isCirc) {
        // Check if site wraps and touches the other
        if (a.end >= seqLen && (b.start <= (a.end % seqLen) + 1)) return true
        if (b.end >= seqLen && (a.start <= (b.end % seqLen) + 1)) return true
      }
      return false
    }

    // Greedy graph-coloring: neighboring sites (overlapping or contiguous) get different colors.
    const siteColorIdx = new Array<number>(sites.length).fill(0)
    for (let i = 0; i < sites.length; i++) {
      const usedColors = new Set<number>()
      for (let j = 0; j < i; j++) {
        if (areNeighbors(siteRanges[i], siteRanges[j])) {
          usedColors.add(siteColorIdx[j])
        }
      }
      let color = 0
      while (usedColors.has(color)) color++
      siteColorIdx[i] = color
    }

    // Build lookup maps
    const positionColorIdx = new Map<number, number>()
    const cutPositions = new Map<number, { overhang: string; enzyme: string; side: 'sense' | 'anti'; colorIdx: number }>()
    const siteStarts = new Map<number, { enzyme: string; colorIdx: number }[]>()

    for (let si = 0; si < sites.length; si++) {
      const site = sites[si]
      const len = site.recognitionSequence.length
      const ci = siteColorIdx[si]
      // Write this site's color for all its positions
      for (let i = 0; i < len; i++) {
        let pos = site.position + i
        if (pos >= seqLen && isCirc) pos = pos % seqLen
        if (pos < seqLen) positionColorIdx.set(pos, ci)
      }
      // Enzyme label at start
      const startPos = site.position < seqLen ? site.position : site.position % seqLen
      const existingStarts = siteStarts.get(startPos)
      const entry = { enzyme: site.enzyme, colorIdx: ci }
      if (existingStarts) {
        existingStarts.push(entry)
      } else {
        siteStarts.set(startPos, [entry])
      }
      // Sense strand cut
      const senseCut = site.position + site.cutOffset
      const resolvedSense = senseCut >= seqLen && isCirc ? senseCut % seqLen : senseCut
      if (resolvedSense < seqLen) {
        cutPositions.set(resolvedSense, { overhang: site.overhang, enzyme: site.enzyme, side: 'sense', colorIdx: ci })
      }
      // Anti-sense strand cut
      if (site.overhang !== 'blunt') {
        const antiCut = site.position + (len - site.cutOffset)
        const resolvedAnti = antiCut >= seqLen && isCirc ? antiCut % seqLen : antiCut
        if (resolvedAnti < seqLen && resolvedAnti !== resolvedSense) {
          cutPositions.set(resolvedAnti, { overhang: site.overhang, enzyme: site.enzyme, side: 'anti', colorIdx: ci })
        }
      }
    }
    return { positionColorIdx, cutPositions, siteStarts }
  }, [sequence, showRestrictionSites])

  // Pre-compute which rows have enzyme labels and the max label stack count per row
  const rowEnzymeCounts = useMemo(() => {
    if (restrictionData.siteStarts.size === 0) return new Map<number, number>()
    const counts = new Map<number, number>()
    for (const [pos, labels] of restrictionData.siteStarts.entries()) {
      const row = Math.floor(pos / charsPerRow)
      const prev = counts.get(row) ?? 0
      if (labels.length > prev) counts.set(row, labels.length)
    }
    return counts
  }, [restrictionData.siteStarts, charsPerRow])

  const isSelected = useCallback(
    (index: number) => {
      const range = selectStart !== null && selectEnd !== null
        ? { start: Math.min(selectStart, selectEnd), end: Math.max(selectStart, selectEnd) }
        : selectedRange
      if (!range) return false
      if (range.start <= range.end) {
        return index >= range.start && index <= range.end
      }
      // Wraparound
      return index >= range.start || index <= range.end
    },
    [selectedRange, selectStart, selectEnd],
  )

  const handleMouseDown = useCallback(
    (index: number) => {
      if (editMode) {
        setCursorPosition(index)
        setSelectedRange(null)
      }
      isSelecting.current = true
      setSelectStart(index)
      setSelectEnd(index)
    },
    [editMode, setCursorPosition, setSelectedRange],
  )

  const handleMouseEnter = useCallback(
    (index: number) => {
      setHoveredIndex(index)
      if (isSelecting.current) {
        setSelectEnd(index)
      }
    },
    [],
  )

  const handleMouseUp = useCallback(() => {
    if (isSelecting.current && selectStart !== null && selectEnd !== null) {
      isSelecting.current = false
      const start = Math.min(selectStart, selectEnd)
      const end = Math.max(selectStart, selectEnd)
      if (start === end && editMode) {
        // Single click in edit mode — just set cursor, don't make selection
        setCursorPosition(start)
      } else {
        setSelectedRange({ start, end, wrapsAround: false })
        if (editMode) {
          setCursorPosition(null)
        }
      }
      setSelectStart(null)
      setSelectEnd(null)
    }
  }, [selectStart, selectEnd, setSelectedRange, editMode, setCursorPosition])

  // Helper: insert bases at current cursor/selection, cleaning input to valid DNA
  const insertBasesAtCursor = useCallback((bases: string) => {
    const clean = bases.replace(/[^ATGCNatgcn]/g, '').toUpperCase()
    if (!clean) return

    const sel = useEditorStore.getState().selectedRange
    let cursor = useEditorStore.getState().cursorPosition

    // For empty sequences or no cursor, default to position 0
    if (cursor === null && !sel) cursor = 0

    if (sel) {
      useSequenceStore.getState().deleteRange(sel.start, sel.end)
      useSequenceStore.getState().insertBases(sel.start, clean)
      useEditorStore.getState().setSelectedRange(null)
      useEditorStore.getState().setCursorPosition(sel.start + clean.length)
    } else {
      useSequenceStore.getState().insertBases(cursor!, clean)
      useEditorStore.getState().setCursorPosition(cursor! + clean.length)
    }
  }, [])

  // Keyboard handler for edit mode (disabled for read-only split panels)
  useEffect(() => {
    if (!editMode || !sequence || isReadOnly) return

    const handler = (e: KeyboardEvent) => {
      // Ignore events from inputs, textareas, and dialog elements
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('[role="dialog"]')) return

      // Allow Ctrl/Cmd+V paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Let the paste event handler deal with it
        return
      }

      // Allow Ctrl/Cmd+Z undo and Ctrl/Cmd+Shift+Z redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) return

      // Don't intercept other modifier combos
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()

      // Insert valid bases
      if (VALID_BASES.has(key)) {
        e.preventDefault()
        insertBasesAtCursor(e.key)
        return
      }

      // Backspace
      if (e.key === 'Backspace') {
        e.preventDefault()
        const sel = useEditorStore.getState().selectedRange
        const cursor = useEditorStore.getState().cursorPosition

        if (sel) {
          useSequenceStore.getState().deleteRange(sel.start, sel.end)
          useEditorStore.getState().setSelectedRange(null)
          useEditorStore.getState().setCursorPosition(sel.start)
        } else if (cursor !== null && cursor > 0) {
          useSequenceStore.getState().deleteRange(cursor - 1, cursor - 1)
          useEditorStore.getState().setCursorPosition(cursor - 1)
        }
        return
      }

      // Delete
      if (e.key === 'Delete') {
        e.preventDefault()
        const sel = useEditorStore.getState().selectedRange
        const cursor = useEditorStore.getState().cursorPosition
        const seqLen = useSequenceStore.getState().sequence?.length ?? 0

        if (sel) {
          useSequenceStore.getState().deleteRange(sel.start, sel.end)
          useEditorStore.getState().setSelectedRange(null)
          useEditorStore.getState().setCursorPosition(sel.start)
        } else if (cursor !== null && cursor < seqLen) {
          useSequenceStore.getState().deleteRange(cursor, cursor)
        }
        return
      }

      // Arrow keys
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const cursor = useEditorStore.getState().cursorPosition
        if (cursor !== null && cursor > 0) {
          useEditorStore.getState().setCursorPosition(cursor - 1)
          useEditorStore.getState().setSelectedRange(null)
        }
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const cursor = useEditorStore.getState().cursorPosition
        const seqLen = useSequenceStore.getState().sequence?.length ?? 0
        if (cursor !== null && cursor < seqLen) {
          useEditorStore.getState().setCursorPosition(cursor + 1)
          useEditorStore.getState().setSelectedRange(null)
        }
        return
      }

      // Escape exits edit mode
      if (e.key === 'Escape') {
        e.preventDefault()
        useEditorStore.getState().setEditMode(false)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editMode, sequence, insertBasesAtCursor, isReadOnly])

  // Paste handler for edit mode (disabled for read-only split panels)
  useEffect(() => {
    if (!editMode || !sequence || isReadOnly) return

    const handler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')
      if (!text) return
      e.preventDefault()
      insertBasesAtCursor(text)
    }

    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [editMode, sequence, insertBasesAtCursor, isReadOnly])

  if (!sequence) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#9c9690]">
        <p>No sequence loaded. Import a file or select from the library.</p>
      </div>
    )
  }

  const rows: { startIndex: number; bases: string }[] = []
  for (let i = 0; i < sequence.length; i += charsPerRow) {
    rows.push({
      startIndex: i,
      bases: sequence.bases.slice(i, i + charsPerRow),
    })
  }

  const hoveredBase = hoveredIndex !== null ? sequence.bases[hoveredIndex] : null
  const hoveredComplement = hoveredBase ? (COMPLEMENT[hoveredBase.toUpperCase()] ?? '?') : null

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-auto bg-white p-4 select-none ${
        editMode && !isReadOnly ? 'ring-2 ring-amber-500/50 ring-inset' : ''
      }`}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp()
        setHoveredIndex(null)
      }}
    >
      {/* Edit mode banner */}
      {editMode && !isReadOnly && (
        <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 rounded bg-amber-100 px-3 py-1 text-xs text-amber-700">
          <span className="font-semibold">EDIT MODE</span>
          <span className="text-amber-600/70">
            Type A/T/G/C/N to insert · Backspace/Delete to remove · Esc to exit
          </span>
        </div>
      )}

      {sequence.length === 0 ? (
        <div
          className="flex min-h-[120px] cursor-text items-center justify-center rounded border border-dashed border-[#e8e5df] font-mono text-sm text-[#9c9690]"
          onClick={() => {
            if (!editMode) {
              const confirmed = window.confirm(
                'Enable edit mode?\n\nYou will be able to type and delete bases directly in the sequence view.\n\nUse Ctrl+Z / Cmd+Z to undo any changes.',
              )
              if (confirmed) {
                useEditorStore.getState().setEditMode(true)
              } else {
                return
              }
            }
            setCursorPosition(0)
          }}
        >
          {editMode ? (
            <span className="cyw-cursor" style={{ borderLeft: '2px solid #f59e0b', paddingLeft: 4 }}>
              Start typing or paste bases (Ctrl+V)...
            </span>
          ) : (
            <span>Empty sequence — click to start editing or paste bases</span>
          )}
        </div>
      ) : (
        <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
          {rows.map((row) => {
            const rowIdx = row.startIndex / charsPerRow
            const labelStack = rowEnzymeCounts.get(rowIdx) ?? 0
            const extraMargin = labelStack > 0
              ? Math.max(14, fontSize * 0.9) * labelStack
              : undefined
            // Check if this row has any translation data
            const hasTranslation = showTranslation && (() => {
              for (let j = 0; j < row.bases.length; j++) {
                if (translationData.has(row.startIndex + j)) return true
              }
              return false
            })()
            return (
            <div key={row.startIndex} className="font-mono" style={{ marginTop: extraMargin, marginBottom: hasTranslation ? fontSize * 0.85 : undefined }}>
              <div className="flex">
              <span
                className="shrink-0 text-right text-[#9c9690] select-none"
                style={{ width: GUTTER_WIDTH, paddingRight: 12 }}
              >
                {row.startIndex + 1}
              </span>
              <div className="flex flex-wrap">
                {row.bases.split('').map((base, j) => {
                  const idx = row.startIndex + j
                  const sel = isSelected(idx)
                  const featureColor = baseColors[idx]
                  const isOrf = orfPositions.has(idx)
                  const posColorIdx = restrictionData.positionColorIdx.get(idx)
                  const isRestriction = posColorIdx !== undefined
                  const enzymeColor = isRestriction
                    ? ENZYME_COLORS[posColorIdx % ENZYME_COLORS.length]
                    : undefined
                  const cutInfo = restrictionData.cutPositions.get(idx)
                  const siteStartList = restrictionData.siteStarts.get(idx)
                  const isCursor = editMode && !isReadOnly && cursorPosition === idx
                  // Feature bg is always shown; restriction sites add borders/labels on top
                  const bgColor = sel
                    ? '#3b82f680'
                    : featureColor
                      ? `${featureColor}30`
                      : undefined
                  return (
                    <span
                      key={idx}
                      onMouseDown={() => handleMouseDown(idx)}
                      onMouseEnter={() => handleMouseEnter(idx)}
                      className={`relative cursor-text ${isCursor ? 'cyw-cursor' : ''}`}
                      title={siteStartList ? siteStartList.map((s) => s.enzyme).join(', ') : undefined}
                      style={{
                        backgroundColor: bgColor,
                        color: featureColor || '#1a1a1a',
                        fontWeight: isRestriction ? 600 : undefined,
                        textDecoration: isOrf ? 'underline' : undefined,
                        textDecorationColor: isOrf ? '#22c55e80' : undefined,
                        textDecorationThickness: isOrf ? '2px' : undefined,
                        textUnderlineOffset: isOrf ? '3px' : undefined,
                        borderLeft: isCursor ? '2px solid #f59e0b' : undefined,
                        borderBottom: enzymeColor ? `2px solid ${enzymeColor.border}` : undefined,
                        borderTop: enzymeColor ? `2px solid ${enzymeColor.border}` : undefined,
                        paddingBottom: isRestriction ? 1 : undefined,
                        paddingTop: isRestriction ? 1 : undefined,
                      }}
                    >
                      {base}
                      {/* Enzyme name labels above first base */}
                      {siteStartList && siteStartList.map((s, li) => (
                        <span
                          key={s.enzyme}
                          className="pointer-events-none absolute left-0 whitespace-nowrap font-bold leading-none"
                          style={{
                            fontSize: Math.max(7, fontSize * 0.5),
                            color: ENZYME_COLORS[s.colorIdx % ENZYME_COLORS.length].label,
                            top: -(12 + li * Math.max(8, fontSize * 0.55)),
                          }}
                        >
                          {s.enzyme}
                        </span>
                      ))}
                      {/* Cut marker */}
                      {cutInfo && (
                        <>
                          {cutInfo.overhang === 'blunt' ? (
                            /* Blunt: full-height thin line */
                            <span
                              className="pointer-events-none absolute"
                              style={{
                                left: -1,
                                top: -2,
                                width: 1.5,
                                height: 'calc(100% + 4px)',
                                backgroundColor: ENZYME_COLORS[cutInfo.colorIdx % ENZYME_COLORS.length].cut,
                                borderRadius: 0.5,
                              }}
                            />
                          ) : cutInfo.side === 'sense' ? (
                            /* Sense strand cut: top half */
                            <span
                              className="pointer-events-none absolute"
                              style={{
                                left: -1,
                                top: -2,
                                width: 1.5,
                                height: '55%',
                                backgroundColor: ENZYME_COLORS[cutInfo.colorIdx % ENZYME_COLORS.length].cut,
                                borderRadius: '0.5px 0.5px 0 0',
                              }}
                            />
                          ) : (
                            /* Anti-sense strand cut: bottom half */
                            <span
                              className="pointer-events-none absolute"
                              style={{
                                left: -1,
                                bottom: -2,
                                width: 1.5,
                                height: '55%',
                                backgroundColor: ENZYME_COLORS[cutInfo.colorIdx % ENZYME_COLORS.length].cut,
                                borderRadius: '0 0 0.5px 0.5px',
                              }}
                            />
                          )}
                        </>
                      )}
                    </span>
                  )
                })}
              </div>
              </div>
              {/* Translation row — amino acid centered on the 2nd base of each codon.
                   The outer div keeps fontSize equal to the sequence row so that each
                   cell spans exactly 1ch (one monospace character width). The amino
                   acid letter itself is scaled down via an inner span. */}
              {hasTranslation && (
                <div className="flex">
                  <span className="shrink-0" style={{ width: GUTTER_WIDTH }} />
                  <div className="flex" style={{ fontSize, lineHeight: 1.2 }}>
                    {row.bases.split('').map((_base, j) => {
                      const idx = row.startIndex + j
                      const td = translationData.get(idx)
                      if (td) {
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center justify-center"
                            style={{ width: '1ch' }}
                            title={td.amino === '*' ? 'Stop codon' : td.amino}
                          >
                            <span className="font-bold" style={{ fontSize: fontSize * 0.75, color: td.color }}>
                              {td.amino}
                            </span>
                          </span>
                        )
                      }
                      return <span key={idx} style={{ width: '1ch' }}>{'\u00A0'}</span>
                    })}
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}

      {/* Bottom bar: position indicator + zoom controls */}
      <div className="sticky bottom-0 left-0 z-10 mt-2 flex items-end justify-between">
        {/* Position indicator */}
        {hoveredIndex !== null && hoveredBase ? (
          <div className="pointer-events-none inline-flex items-center gap-3 rounded bg-[#1a1a1a]/80 px-3 py-1 font-mono text-xs text-white backdrop-blur-sm">
            <span>
              Position: <span className="text-emerald-400">{hoveredIndex + 1}</span>
            </span>
            <span>
              Base: <span className="text-sky-400">{hoveredBase.toUpperCase()}</span>
            </span>
            <span>
              Complement: <span className="text-amber-400">{hoveredComplement}</span>
            </span>
          </div>
        ) : <div />}
        {/* Zoom controls */}
        <div className="flex items-center gap-1 rounded-md border border-[#e8e5df] bg-white/90 px-1 py-0.5 shadow-sm backdrop-blur-sm">
          <button onClick={seqZoomOut} title="Zoom Out (Ctrl+Scroll)" className="rounded p-1 text-[#6b6560] hover:bg-[#f5f3ee]">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[32px] text-center font-mono text-[9px] text-[#9c9690]">
            {Math.round(zoom.level * 100)}%
          </span>
          <button onClick={seqZoomIn} title="Zoom In (Ctrl+Scroll)" className="rounded p-1 text-[#6b6560] hover:bg-[#f5f3ee]">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
