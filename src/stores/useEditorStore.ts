import { create } from 'zustand'
import type { ViewMode, SelectionRange, ZoomConfig, ToolType } from '@/types'
import { ZOOM_CONFIG } from '@/lib/constants'
import type { ColorPaletteName } from '@/lib/theme'

function makeZoom(): ZoomConfig {
  return {
    level: ZOOM_CONFIG.defaultLevel,
    minLevel: ZOOM_CONFIG.minLevel,
    maxLevel: ZOOM_CONFIG.maxLevel,
    step: ZOOM_CONFIG.step,
  }
}

function clampZoom(z: ZoomConfig, delta: number): ZoomConfig {
  return {
    ...z,
    level: Math.max(z.minLevel, Math.min(z.maxLevel, z.level + delta)),
  }
}

interface EditorState {
  viewMode: ViewMode
  selectedRange: SelectionRange | null
  /** @deprecated use mapZoom / seqZoom instead */
  zoom: ZoomConfig
  mapZoom: ZoomConfig
  seqZoom: ZoomConfig
  activeTool: ToolType
  featurePanelOpen: boolean
  showFeatures: boolean
  showOrfs: boolean
  showRestrictionSites: boolean
  showTranslation: boolean
  selectedEnzymes: Set<string>
  clipboard: string | null
  editMode: boolean
  cursorPosition: number | null
  /** Global color opacity multiplier for map features (0.1–1.0, default 0.5) */
  colorOpacity: number
  colorPalette: ColorPaletteName

  setViewMode: (mode: ViewMode) => void
  setSelectedRange: (range: SelectionRange | null) => void
  /** @deprecated */
  zoomIn: () => void
  /** @deprecated */
  zoomOut: () => void
  /** @deprecated */
  resetZoom: () => void
  mapZoomIn: () => void
  mapZoomOut: () => void
  mapZoomBy: (delta: number) => void
  resetMapZoom: () => void
  seqZoomIn: () => void
  seqZoomOut: () => void
  seqZoomBy: (delta: number) => void
  resetSeqZoom: () => void
  setActiveTool: (tool: ToolType) => void
  toggleFeaturePanel: () => void
  toggleFeatures: () => void
  toggleOrfs: () => void
  toggleRestrictionSites: () => void
  toggleTranslation: () => void
  toggleEnzymeSelection: (name: string) => void
  setSelectedEnzymes: (names: Set<string>) => void
  setClipboard: (bases: string) => void
  setEditMode: (on: boolean) => void
  setCursorPosition: (pos: number | null) => void
  setColorOpacity: (opacity: number) => void
  setColorPalette: (name: ColorPaletteName) => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  viewMode: 'linear',
  selectedRange: null,
  zoom: makeZoom(),
  mapZoom: makeZoom(),
  seqZoom: makeZoom(),
  activeTool: 'select',
  featurePanelOpen: true,
  showFeatures: true,
  showOrfs: true,
  showRestrictionSites: true,
  showTranslation: false,
  selectedEnzymes: new Set<string>(),
  clipboard: null,
  editMode: false,
  cursorPosition: null,
  colorOpacity: 0.5,
  colorPalette: 'paper',

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedRange: (range) => set({ selectedRange: range }),

  // Legacy zoom (controls both)
  zoomIn: () =>
    set((s) => ({
      zoom: clampZoom(s.zoom, s.zoom.step),
      mapZoom: clampZoom(s.mapZoom, s.mapZoom.step),
      seqZoom: clampZoom(s.seqZoom, s.seqZoom.step),
    })),
  zoomOut: () =>
    set((s) => ({
      zoom: clampZoom(s.zoom, -s.zoom.step),
      mapZoom: clampZoom(s.mapZoom, -s.mapZoom.step),
      seqZoom: clampZoom(s.seqZoom, -s.seqZoom.step),
    })),
  resetZoom: () =>
    set(() => ({
      zoom: makeZoom(),
      mapZoom: makeZoom(),
      seqZoom: makeZoom(),
    })),

  // Map zoom
  mapZoomIn: () => set((s) => ({ mapZoom: clampZoom(s.mapZoom, s.mapZoom.step) })),
  mapZoomOut: () => set((s) => ({ mapZoom: clampZoom(s.mapZoom, -s.mapZoom.step) })),
  mapZoomBy: (delta) => set((s) => ({ mapZoom: clampZoom(s.mapZoom, delta) })),
  resetMapZoom: () => set(() => ({ mapZoom: makeZoom() })),

  // Sequence zoom
  seqZoomIn: () => set((s) => ({ seqZoom: clampZoom(s.seqZoom, s.seqZoom.step) })),
  seqZoomOut: () => set((s) => ({ seqZoom: clampZoom(s.seqZoom, -s.seqZoom.step) })),
  seqZoomBy: (delta) => set((s) => ({ seqZoom: clampZoom(s.seqZoom, delta) })),
  resetSeqZoom: () => set(() => ({ seqZoom: makeZoom() })),

  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleFeaturePanel: () =>
    set((s) => ({ featurePanelOpen: !s.featurePanelOpen })),
  toggleFeatures: () => set((s) => ({ showFeatures: !s.showFeatures })),
  toggleOrfs: () => set((s) => ({ showOrfs: !s.showOrfs })),
  toggleRestrictionSites: () =>
    set((s) => ({ showRestrictionSites: !s.showRestrictionSites })),
  toggleTranslation: () =>
    set((s) => ({ showTranslation: !s.showTranslation })),
  toggleEnzymeSelection: (name) =>
    set((s) => {
      const next = new Set(s.selectedEnzymes)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return { selectedEnzymes: next }
    }),
  setSelectedEnzymes: (names) => set({ selectedEnzymes: names }),
  setClipboard: (bases) => set({ clipboard: bases }),
  setEditMode: (on) => set({ editMode: on, cursorPosition: null, selectedRange: on ? null : null }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  setColorOpacity: (opacity) => set({ colorOpacity: Math.max(0.1, Math.min(1.0, opacity)) }),
  setColorPalette: (name) => set({ colorPalette: name }),
}))
