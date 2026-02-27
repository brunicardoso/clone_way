export type ViewMode = 'linear' | 'circular' | 'sequence'

export type ToolType =
  | 'select'
  | 'annotate'
  | 'restriction'
  | 'orf'
  | 'primer'

export interface SelectionRange {
  start: number
  end: number
  /** True when selection wraps around origin in circular sequences */
  wrapsAround: boolean
}

export interface ZoomConfig {
  level: number
  minLevel: number
  maxLevel: number
  step: number
}
