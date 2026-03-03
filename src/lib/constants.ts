export const APP_NAME = 'Clone Your Way'
export const APP_SHORT_NAME = 'CYW'
export const APP_TAGLINE = 'Molecular Biology Suite'

export const MAX_UNDO_STEPS = 100

export const DEFAULT_SAMPLE_SEQUENCE = {
  name: 'pUC19',
  bases: 'TCGCGCGTTTCGGTGATGACGGTGAAAACCTCTGACACATGCAGCTCCCGGAGACGGTCACAGCTTGTCTGTAAGCGGATG',
  isCircular: true,
}

export const FEATURE_COLORS: Record<string, string> = {
  CDS: '#31A354',
  promoter: '#E6994D',
  terminator: '#D94F4F',
  gene: '#4A90D9',
  rep_origin: '#8B6DAF',
  misc_feature: '#7B8A8B',
  primer_bind: '#5BB5C5',
  regulatory: '#C4A84D',
  protein_bind: '#C75B8E',
  exon: '#2E86C1',
  intron: '#A0A0A0',
  mRNA: '#27AE60',
  "5'UTR": '#F39C12',
  "3'UTR": '#E67E22',
  sig_peptide: '#8E44AD',
  mat_peptide: '#16A085',
  misc_RNA: '#95A5A6',
  ncRNA: '#D4AC0D',
  rRNA: '#CB4335',
  tRNA: '#6C3483',
}

/** Darken a hex color by a given amount (0–1). */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Lighten a hex color by a given amount (0–1). */
export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount))
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount))
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

import type { ThemeConfig } from './theme'
import { STRONG_FEATURE_TYPES, STRONG_FILL_OPACITY } from './theme'

/** Look up a themed feature color, falling back to the default FEATURE_COLORS map. */
export function getThemedFeatureColor(type: string, theme: ThemeConfig): string {
  return theme.featureColors[type] ?? FEATURE_COLORS[type] ?? '#607D8B'
}

/** Return fill/stroke style object for a feature arc given the theme.
 *  @param opacityMultiplier — global multiplier for fill opacity (default 1.0) */
export function getThemedFeatureStyle(
  type: string,
  color: string,
  theme: ThemeConfig,
  opacityMultiplier = 1.0,
): { fill: string; fillOpacity: number; stroke: string; strokeWidth: number } {
  const isStrong = STRONG_FEATURE_TYPES.has(type)
  const baseOpacity = isStrong ? STRONG_FILL_OPACITY : theme.style.featureFillOpacity
  return {
    fill: color,
    fillOpacity: Math.min(1, baseOpacity * opacityMultiplier),
    stroke: color,
    strokeWidth: theme.strokes.featureBorder,
  }
}

export const ZOOM_CONFIG = {
  minLevel: 0.1,
  maxLevel: 10,
  defaultLevel: 1,
  step: 0.25,
}
