'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { Minus, Plus, MousePointer, Pencil, Trash2, Circle, Minus as LinearIcon } from 'lucide-react'
import { FEATURE_COLORS } from '@/lib/constants'
import { translate } from '@/services/bio/codons'
import { RenameFeatureDialog } from './RenameFeatureDialog'
import type { Feature, Sequence } from '@/types'

const BASE_FONT_SIZE = 14
const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 48
const BASE_CHARS_PER_ROW = 60
const GUTTER_WIDTH = 64
const MOBILE_GUTTER_WIDTH = 40

const COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G', N: 'N',
  a: 't', t: 'a', g: 'c', c: 'g', n: 'n',
}

const VALID_BASES = new Set(['a', 't', 'g', 'c', 'n'])

function reverseComplement(seq: string): string {
  const comp: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C', N: 'N' }
  let rc = ''
  for (let i = seq.length - 1; i >= 0; i--) {
    rc += comp[seq[i].toUpperCase()] ?? 'N'
  }
  return rc
}


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
  const [containerWidth, setContainerWidth] = useState(0)
  const [selectStart, setSelectStart] = useState<number | null>(null)
  const [selectEnd, setSelectEnd] = useState<number | null>(null)
  const isSelecting = useRef(false)
  const selectEndRef = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMouseY = useRef<number>(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; feature: Feature } | null>(null)
  const [renameFeature, setRenameFeature] = useState<Feature | null>(null)
  const removeFeature = useSequenceStore((s) => s.removeFeature)

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

  // Track container width for responsive layout
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const isMobile = containerWidth > 0 && containerWidth < 600
  const gutterWidth = isMobile ? MOBILE_GUTTER_WIDTH : GUTTER_WIDTH

  const fontSize = Math.max(
    MIN_FONT_SIZE,
    Math.min(MAX_FONT_SIZE, Math.round(BASE_FONT_SIZE * zoom.level)),
  )
  // On mobile, compute chars per row based on available width
  const charsPerRow = useMemo(() => {
    if (isMobile && containerWidth > 0) {
      const charWidth = fontSize * 0.6
      const availableWidth = containerWidth - gutterWidth - 8 // 8px for padding on mobile
      return Math.max(10, Math.floor(availableWidth / charWidth))
    }
    return Math.max(10, Math.min(120, Math.round(BASE_CHARS_PER_ROW / zoom.level)))
  }, [isMobile, containerWidth, gutterWidth, fontSize, zoom.level])

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

  // Pre-compute feature name for each base position (for tooltip)
  const baseFeatureNames = useMemo(() => {
    if (!sequence || !showFeatures) return []
    const names: (string | null)[] = new Array(sequence.length).fill(null)
    for (const feature of sequence.features) {
      const label = `${feature.name} (${feature.type})`
      if (feature.start <= feature.end) {
        for (let i = feature.start; i <= feature.end && i < sequence.length; i++) {
          if (!names[i]) names[i] = label
        }
      } else {
        for (let i = feature.start; i < sequence.length; i++) {
          if (!names[i]) names[i] = label
        }
        for (let i = 0; i <= feature.end && i < sequence.length; i++) {
          if (!names[i]) names[i] = label
        }
      }
    }
    return names
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
        if (feature.start <= feature.end) {
          subseq = sequence.bases.slice(feature.start, feature.end + 1)
        } else {
          // Wraparound CDS on circular sequence
          subseq = sequence.bases.slice(feature.start) + sequence.bases.slice(0, feature.end + 1)
        }
        const isMinus = feature.strand === -1
        const protein = translate(isMinus ? reverseComplement(subseq) : subseq)
        for (let i = 0; i < protein.length; i++) {
          // For plus strand: amino acid i at the 2nd base of codon i (left to right)
          // For minus strand: amino acid i at the 2nd base of codon i reading right to left
          let pos: number
          if (isMinus) {
            // RC codon i corresponds to original positions [end - 3i, end - 3i - 1, end - 3i - 2]
            const featureEnd = feature.start <= feature.end ? feature.end : feature.end + sequence.length
            pos = (featureEnd - 3 * i - 1) % sequence.length
          } else {
            pos = (feature.start + i * 3 + 1) % sequence.length
          }
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
        const isMinus = orf.strand === -1
        const protein = translate(isMinus ? reverseComplement(subseq) : subseq)
        for (let i = 0; i < protein.length; i++) {
          // For minus strand ORFs: codons read right to left
          const pos = isMinus ? end - 3 * i - 1 : start + i * 3 + 1
          if (pos < 0 || pos >= sequence.length) continue
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

  // Stop auto-scroll and clean up animation frame
  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current)
      autoScrollTimer.current = null
    }
  }, [])

  // Start auto-scrolling when the mouse is near the edges during selection
  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) return
    autoScrollTimer.current = setInterval(() => {
      const container = containerRef.current
      if (!container || !isSelecting.current) {
        stopAutoScroll()
        return
      }
      const rect = container.getBoundingClientRect()
      const y = lastMouseY.current
      const edgeZone = 40 // pixels from edge to trigger scroll

      let scrollDelta = 0
      if (y < rect.top + edgeZone) {
        // Near top edge — scroll up
        scrollDelta = -Math.max(8, (edgeZone - (y - rect.top)) * 0.5)
      } else if (y > rect.bottom - edgeZone) {
        // Near bottom edge — scroll down
        scrollDelta = Math.max(8, (edgeZone - (rect.bottom - y)) * 0.5)
      }

      if (scrollDelta !== 0) {
        container.scrollTop += scrollDelta
        // After scrolling, find the element under the mouse and update selection
        const el = document.elementFromPoint(lastMouseY.current > rect.bottom ? rect.left + gutterWidth + 20 : rect.left + gutterWidth + 20, Math.min(Math.max(y, rect.top + 4), rect.bottom - 4))
        if (el instanceof HTMLElement) {
          const baseEl = el.closest('[data-base-idx]') as HTMLElement | null
          if (baseEl) {
            const idx = Number(baseEl.dataset.baseIdx)
            if (!isNaN(idx) && idx !== selectEndRef.current) {
              selectEndRef.current = idx
              setSelectEnd(idx)
            }
          }
        }
      }
    }, 30) // ~33fps for auto-scroll
  }, [stopAutoScroll, gutterWidth])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll()
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [stopAutoScroll])

  const handleMouseDown = useCallback(
    (index: number) => {
      if (editMode) {
        setCursorPosition(index)
      }
      // Always clear any previous committed selection when starting a new drag
      setSelectedRange(null)
      isSelecting.current = true
      selectEndRef.current = index
      setSelectStart(index)
      setSelectEnd(index)
    },
    [editMode, setCursorPosition, setSelectedRange],
  )

  // Container-level mousemove: use elementFromPoint to reliably find the base
  // under the cursor (e.target is unreliable during drag due to pointer capture)
  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || !(el instanceof HTMLElement)) {
        if (!isSelecting.current) setHoveredIndex(null)
        return
      }
      const baseEl = el.closest('[data-base-idx]') as HTMLElement | null
      if (baseEl) {
        const idx = Number(baseEl.dataset.baseIdx)
        if (!isNaN(idx)) {
          setHoveredIndex(idx)
          if (isSelecting.current) {
            selectEndRef.current = idx
            if (rafId.current === null) {
              rafId.current = requestAnimationFrame(() => {
                rafId.current = null
                setSelectEnd(selectEndRef.current)
              })
            }
          }
        }
      } else {
        if (!isSelecting.current) {
          setHoveredIndex(null)
        }
      }
    },
    [],
  )

  const handleMouseUp = useCallback(() => {
    stopAutoScroll()
    if (isSelecting.current && selectStart !== null) {
      isSelecting.current = false
      // Use the ref for the latest value to avoid stale closure
      const end = selectEndRef.current ?? selectStart
      const start = Math.min(selectStart, end)
      const finalEnd = Math.max(selectStart, end)
      if (start === finalEnd) {
        // Single click — clear any existing selection
        setSelectedRange(null)
        if (editMode) {
          setCursorPosition(start)
        }
      } else {
        setSelectedRange({ start, end: finalEnd, wrapsAround: false })
        if (editMode) {
          setCursorPosition(null)
        }
      }
      setSelectStart(null)
      setSelectEnd(null)
      selectEndRef.current = null
    }
  }, [selectStart, setSelectedRange, editMode, setCursorPosition, stopAutoScroll])

  // Touch event handlers for mobile selection
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (!el || !(el instanceof HTMLElement)) return
      const baseEl = el.closest('[data-base-idx]') as HTMLElement | null
      if (!baseEl) return
      const idx = Number(baseEl.dataset.baseIdx)
      if (isNaN(idx)) return
      handleMouseDown(idx)
    },
    [handleMouseDown],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSelecting.current) return
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (!el || !(el instanceof HTMLElement)) return
      const baseEl = el.closest('[data-base-idx]') as HTMLElement | null
      if (!baseEl) return
      const idx = Number(baseEl.dataset.baseIdx)
      if (!isNaN(idx) && idx !== selectEndRef.current) {
        selectEndRef.current = idx
        if (rafId.current === null) {
          rafId.current = requestAnimationFrame(() => {
            rafId.current = null
            setSelectEnd(selectEndRef.current)
          })
        }
      }
    },
    [],
  )

  const handleTouchEnd = useCallback(() => {
    handleMouseUp()
  }, [handleMouseUp])

  // Track mouse position for auto-scroll and handle mouseup outside container
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      lastMouseY.current = e.clientY
    }
    const handleGlobalUp = () => {
      // Finalize selection even if mouse is released outside the container
      handleMouseUp()
    }
    if (selectStart !== null) {
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleGlobalUp)
      startAutoScroll()
    }
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleGlobalUp)
    }
  }, [selectStart, startAutoScroll, stopAutoScroll, handleMouseUp])

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

  // Find the first feature covering a given base position
  const featureAtPosition = useCallback(
    (pos: number): Feature | undefined => {
      if (!sequence) return undefined
      return sequence.features.find((f) => {
        if (f.start <= f.end) return pos >= f.start && pos <= f.end
        return pos >= f.start || pos <= f.end // wraparound
      })
    },
    [sequence],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, idx: number) => {
      if (isReadOnly) return
      const feature = featureAtPosition(idx)
      if (!feature) return
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, feature })
    },
    [isReadOnly, featureAtPosition],
  )

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleClose = () => setContextMenu(null)
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null) }
    window.addEventListener('click', handleClose)
    window.addEventListener('keydown', handleEsc)
    window.addEventListener('scroll', handleClose, true)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', handleEsc)
      window.removeEventListener('scroll', handleClose, true)
    }
  }, [contextMenu])

  // Clear selection when clicking on empty background areas outside the sequence view
  // Don't clear when clicking buttons, dialogs, panels, or other interactive elements
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(e.target as Node)) return
      const target = e.target as HTMLElement
      // Don't clear selection when clicking interactive elements or UI panels
      if (target.closest('button, [role="dialog"], [role="menu"], [data-radix-popper-content-wrapper], input, textarea, select, a, label')) return
      if (target.closest('[class*="toolbar"], [class*="panel"], [class*="sidebar"], [class*="tab-bar"]')) return
      setSelectedRange(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [setSelectedRange])

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
      className={`relative flex-1 overflow-auto bg-white p-2 select-none sm:p-4 ${
        editMode && !isReadOnly ? 'ring-2 ring-amber-500/50 ring-inset' : ''
      }`}
      onMouseUp={handleMouseUp}
      onMouseMove={handleContainerMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={() => {
        if (!isSelecting.current) {
          setHoveredIndex(null)
        }
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
            <div key={row.startIndex} className="font-mono" style={{ marginTop: extraMargin, marginBottom: fontSize * 0.5 }}>
              {/* Translation row — amino acids above the sense strand */}
              {hasTranslation && (
                <div className="flex">
                  <span className="shrink-0" style={{ width: gutterWidth }} />
                  <div className="flex flex-wrap" style={{ fontSize, lineHeight: 1.2 }}>
                    {row.bases.split('').map((_base, j) => {
                      const idx = row.startIndex + j
                      const td = translationData.get(idx)
                      if (td) {
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center justify-center"
                            style={{ width: `${fontSize * 0.6}px` }}
                            title={td.amino === '*' ? 'Stop codon' : td.amino}
                          >
                            <span className="font-bold" style={{ fontSize: fontSize * 0.75, color: td.color }}>
                              {td.amino}
                            </span>
                          </span>
                        )
                      }
                      return <span key={idx} style={{ width: `${fontSize * 0.6}px` }}>{'\u00A0'}</span>
                    })}
                  </div>
                </div>
              )}
              {/* Sense strand (5' → 3') */}
              <div className="flex">
              <span
                className="shrink-0 text-right text-[#9c9690] select-none"
                style={{ width: gutterWidth, paddingRight: isMobile ? 6 : 12 }}
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
                      data-base-idx={idx}
                      onMouseDown={() => handleMouseDown(idx)}
                      onContextMenu={(e) => handleContextMenu(e, idx)}
                      className={`relative cursor-text inline-flex items-center justify-center ${isCursor ? 'cyw-cursor' : ''}`}
                      title={[baseFeatureNames[idx], siteStartList?.map((s) => s.enzyme).join(', ')].filter(Boolean).join(' · ') || undefined}
                      style={{
                        width: `${fontSize * 0.6}px`,
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
                      {/* Cut marker — sense strand cuts only */}
                      {cutInfo && (cutInfo.side === 'sense' || cutInfo.overhang === 'blunt') && (
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
                      )}
                    </span>
                  )
                })}
              </div>
              </div>
              {/* Complement strand (3' → 5') */}
              <div className="flex" style={{ lineHeight: 1.3 }}>
                <span
                  className="shrink-0 text-right select-none"
                  style={{ width: gutterWidth, paddingRight: isMobile ? 6 : 12, color: '#c4c0ba', fontSize: fontSize * 0.85 }}
                />
                <div className="flex flex-wrap">
                  {row.bases.split('').map((base, j) => {
                    const idx = row.startIndex + j
                    const compBase = COMPLEMENT[base.toUpperCase()] ?? 'N'
                    const sel = isSelected(idx)
                    const featureColor = baseColors[idx]
                    const posColorIdx = restrictionData.positionColorIdx.get(idx)
                    const isRestriction = posColorIdx !== undefined
                    const enzymeColor = isRestriction
                      ? ENZYME_COLORS[posColorIdx % ENZYME_COLORS.length]
                      : undefined
                    const cutInfo = restrictionData.cutPositions.get(idx)
                    const showCut = cutInfo && (cutInfo.side === 'anti' || cutInfo.overhang === 'blunt')
                    const bgColor = sel
                      ? '#3b82f650'
                      : featureColor
                        ? `${featureColor}18`
                        : undefined
                    return (
                      <span
                        key={idx}
                        data-base-idx={idx}
                        onMouseDown={() => handleMouseDown(idx)}
                        className="relative cursor-text inline-flex items-center justify-center"
                        style={{
                          width: `${fontSize * 0.6}px`,
                          backgroundColor: bgColor,
                          color: featureColor ? `${featureColor}90` : '#9c9690',
                          fontWeight: isRestriction ? 600 : undefined,
                          borderTop: enzymeColor ? `1px solid ${enzymeColor.border}60` : undefined,
                          borderBottom: enzymeColor ? `2px solid ${enzymeColor.border}` : undefined,
                          paddingBottom: isRestriction ? 1 : undefined,
                        }}
                      >
                        {compBase}
                        {/* Cut marker — anti-sense strand cuts only */}
                        {showCut && (
                          <span
                            className="pointer-events-none absolute"
                            style={{
                              left: -1,
                              bottom: -2,
                              width: 1.5,
                              height: '55%',
                              backgroundColor: ENZYME_COLORS[cutInfo!.colorIdx % ENZYME_COLORS.length].cut,
                              borderRadius: '0 0 0.5px 0.5px',
                            }}
                          />
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Feature context menu (right-click in edit mode) */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border border-[#e8e5df] bg-[#faf9f5] p-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#9c9690]">
            {contextMenu.feature.name}
          </div>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-[#1a1a1a] hover:bg-[#eae7e1]"
            onClick={() => {
              setSelectedRange({
                start: contextMenu.feature.start,
                end: contextMenu.feature.end,
                wrapsAround: contextMenu.feature.start > contextMenu.feature.end,
              })
              setContextMenu(null)
            }}
          >
            <MousePointer className="h-3.5 w-3.5 text-[#9c9690]" />
            Select
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-[#1a1a1a] hover:bg-[#eae7e1]"
            onClick={() => {
              setRenameFeature(contextMenu.feature)
              setContextMenu(null)
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-[#9c9690]" />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              removeFeature(contextMenu.feature.id)
              setContextMenu(null)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}

      {/* Rename feature dialog */}
      <RenameFeatureDialog feature={renameFeature} onClose={() => setRenameFeature(null)} />

      {/* Bottom bar: position indicator + controls */}
      <div className="sticky bottom-0 left-0 z-10 mt-2 flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between">
        {/* Position / Selection indicator */}
        {(() => {
          // Compute active selection range: in-progress drag takes priority over committed range
          const activeRange = (selectStart !== null && selectEnd !== null && selectStart !== selectEnd)
            ? { start: Math.min(selectStart, selectEnd), end: Math.max(selectStart, selectEnd), wrapsAround: false }
            : selectedRange
          const hasHover = hoveredIndex !== null && hoveredBase
          if (!activeRange && !hasHover) return <div />
          return (
            <div className="pointer-events-none inline-flex flex-wrap items-center gap-1.5 rounded bg-[#1a1a1a]/80 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-sm sm:gap-3 sm:px-3 sm:text-xs">
              {hasHover && (
                <>
                  <span>
                    Position: <span className="text-emerald-400">{hoveredIndex! + 1}</span>
                  </span>
                  <span>
                    Base: <span className="text-sky-400">{hoveredBase!.toUpperCase()}</span>
                  </span>
                  <span>
                    Complement: <span className="text-amber-400">{hoveredComplement}</span>
                  </span>
                </>
              )}
              {activeRange && (() => {
                const selLen = activeRange.wrapsAround
                  ? sequence.length - activeRange.start + activeRange.end + 1
                  : activeRange.end - activeRange.start + 1
                return (
                  <>
                    {hasHover && <span className="text-[#9c9690]">|</span>}
                    <span>
                      Selection: <span className="text-emerald-400">{activeRange.start + 1}</span>
                      <span className="text-[#9c9690]"> — </span>
                      <span className="text-emerald-400">{activeRange.end + 1}</span>
                    </span>
                    <span>
                      Length: <span className="text-sky-400">{selLen} bp</span>
                    </span>
                  </>
                )
              })()}
            </div>
          )
        })()}
        {/* Topology toggle + Zoom slider */}
        <div className="flex flex-col items-end gap-1">
          {/* Circular / Linear topology toggle */}
          <button
            onClick={() => {
              const store = useSequenceStore.getState()
              store.toggleCircular()
              // If switching to linear while in circular view, fall back to linear view
              if (store.sequence?.isCircular === false) {
                const editorState = useEditorStore.getState()
                if (editorState.viewMode === 'circular') {
                  editorState.setViewMode('linear')
                }
              }
            }}
            title={sequence.isCircular ? 'Topology: Circular — click to make Linear' : 'Topology: Linear — click to make Circular'}
            className="flex items-center gap-1.5 rounded-md border border-[#e8e5df] bg-white/90 px-2 py-1 text-[10px] font-medium text-[#6b6560] shadow-sm backdrop-blur-sm transition-colors hover:bg-[#f5f3ee]"
          >
            {sequence.isCircular ? (
              <>
                <Circle className="h-3 w-3" />
                <span>Circular</span>
              </>
            ) : (
              <>
                <LinearIcon className="h-3 w-3" />
                <span>Linear</span>
              </>
            )}
          </button>
          {/* Zoom controls — horizontal slider style */}
          <div className="flex items-center gap-0.5 rounded-md border border-[#e8e5df] bg-white/90 px-1 py-0.5 shadow-sm backdrop-blur-sm">
            <button onClick={seqZoomOut} title="Zoom Out (Ctrl+Scroll)" className="rounded p-1 text-[#6b6560] hover:bg-[#f5f3ee]">
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="range"
              min={zoom.minLevel * 100}
              max={zoom.maxLevel * 100}
              step={zoom.step * 100}
              value={Math.round(zoom.level * 100)}
              onChange={(e) => {
                const newLevel = Number(e.target.value) / 100
                seqZoomBy(newLevel - zoom.level)
              }}
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-[#e8e5df] accent-[#6b6560] [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6b6560]"
              title={`Zoom: ${Math.round(zoom.level * 100)}%`}
            />
            <button onClick={seqZoomIn} title="Zoom In (Ctrl+Scroll)" className="rounded p-1 text-[#6b6560] hover:bg-[#f5f3ee]">
              <Plus className="h-3 w-3" />
            </button>
            <span className="min-w-[28px] text-center font-mono text-[9px] text-[#9c9690]">
              {Math.round(zoom.level * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
