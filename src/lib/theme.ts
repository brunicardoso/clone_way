export interface ThemeColors {
  background: string
  backbone: string
  ruler: string
  rulerLabel: string
  centerName: string
  centerBp: string
  selection: string
  orf: string
  orfLabel: string
  leaderLine: string
  restrictionSite: string
  restrictionSiteLabel: string
  inlineLabelLight: string
  inlineLabelDark: string
  statsText: string
}

export interface ThemeFeatureColors {
  CDS: string
  promoter: string
  terminator: string
  gene: string
  rep_origin: string
  misc_feature: string
  primer_bind: string
  regulatory: string
  protein_bind: string
  [key: string]: string
}

export interface ThemeLayout {
  size: number
  backboneRadius: number
  backboneWidth: number
  featureWidth: number
  viewBoxPaddingX: number
  viewBoxPaddingY: number
  labelMarginY: number
}

export interface ThemeTypography {
  fontFamily: string
  monoFontFamily: string
  nameWeight: number
  coordWeight: number
  centerNameSize: number
  centerBpSize: number
  rulerLabelSize: number
  inlineLabelSize: number
  externalLabelSize: number
  statsSize: number
}

export interface ThemeStrokes {
  backbone: number
  featureBorder: number
  leaderLine: number
  restrictionMarker: number
  rulerTickMajor: number
  rulerTickMinor: number
  selection: number
  orf: number
}

export interface ThemeStyle {
  useGradients: boolean
  featureFillOpacity: number
  restrictionSiteCircles: boolean
  restrictionSiteCircleRadius: number
  showStatsBlock: boolean
  nonScalingStroke: boolean
}

export interface ThemeConfig {
  name: string
  colors: ThemeColors
  featureColors: ThemeFeatureColors
  layout: ThemeLayout
  typography: ThemeTypography
  strokes: ThemeStrokes
  style: ThemeStyle
}

/** Strong feature types get higher fill opacity for better visual weight. */
export const STRONG_FEATURE_TYPES = new Set(['CDS', 'promoter', 'rep_origin'])
export const STRONG_FILL_OPACITY = 0.8

export type ColorPaletteName = 'paper' | 'vivid' | 'ocean' | 'colorblind' | 'grayscale'

const VIVID_FEATURE_COLORS: ThemeFeatureColors = {
  CDS: '#31A354',
  promoter: '#E6994D',
  terminator: '#D94F4F',
  gene: '#4A90D9',
  rep_origin: '#8B6DAF',
  misc_feature: '#7B8A8B',
  primer_bind: '#5BB5C5',
  regulatory: '#C4A84D',
  protein_bind: '#C75B8E',
}

const OCEAN_FEATURE_COLORS: ThemeFeatureColors = {
  CDS: '#2B8A9E',
  promoter: '#5B7FC2',
  terminator: '#7C5BA8',
  gene: '#3A9DBF',
  rep_origin: '#4682B4',
  misc_feature: '#6A8EA0',
  primer_bind: '#48B0A0',
  regulatory: '#6078B0',
  protein_bind: '#8068B8',
}

/** Wong (2011) colorblind-safe palette — distinct under all forms of CVD */
const COLORBLIND_FEATURE_COLORS: ThemeFeatureColors = {
  CDS: '#009E73',        // bluish green
  promoter: '#E69F00',   // orange
  terminator: '#D55E00', // vermillion
  gene: '#0072B2',       // blue
  rep_origin: '#CC79A7', // reddish purple
  misc_feature: '#999999', // grey
  primer_bind: '#56B4E9', // sky blue
  regulatory: '#F0E442', // yellow
  protein_bind: '#000000', // black
}

const GRAYSCALE_FEATURE_COLORS: ThemeFeatureColors = {
  CDS: '#333333',
  promoter: '#666666',
  terminator: '#999999',
  gene: '#4D4D4D',
  rep_origin: '#808080',
  misc_feature: '#B3B3B3',
  primer_bind: '#5A5A5A',
  regulatory: '#737373',
  protein_bind: '#A6A6A6',
}

export const COLOR_PALETTES: Record<ColorPaletteName, ThemeFeatureColors> = {
  paper: {
    CDS: '#8AAF6E',
    promoter: '#CDA050',
    terminator: '#B86E6E',
    gene: '#6A94BF',
    rep_origin: '#7A9090',
    misc_feature: '#8A9696',
    primer_bind: '#68B0BC',
    regulatory: '#B0A060',
    protein_bind: '#B07A98',
  },
  vivid: VIVID_FEATURE_COLORS,
  ocean: OCEAN_FEATURE_COLORS,
  colorblind: COLORBLIND_FEATURE_COLORS,
  grayscale: GRAYSCALE_FEATURE_COLORS,
}

export const PAPER_THEME: ThemeConfig = {
  name: 'Paper',
  colors: {
    background: '#ffffff',
    backbone: '#333333',
    ruler: '#999999',
    rulerLabel: '#999999',
    centerName: '#1a1a1a',
    centerBp: '#888888',
    selection: '#3b82f6',
    orf: '#22c55e',
    orfLabel: '#16a34a',
    leaderLine: '#CCCCCC',
    restrictionSite: '#666666',
    restrictionSiteLabel: '#555555',
    inlineLabelLight: '#ffffff',
    inlineLabelDark: '#333333',
    statsText: '#999999',
  },
  featureColors: {
    CDS: '#8AAF6E',
    promoter: '#CDA050',
    terminator: '#B86E6E',
    gene: '#6A94BF',
    rep_origin: '#7A9090',
    misc_feature: '#8A9696',
    primer_bind: '#68B0BC',
    regulatory: '#B0A060',
    protein_bind: '#B07A98',
  },
  layout: {
    size: 600,
    backboneRadius: 150,
    backboneWidth: 1,
    featureWidth: 14,
    viewBoxPaddingX: 60,
    viewBoxPaddingY: 60,
    labelMarginY: 20,
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    monoFontFamily: 'JetBrains Mono, monospace',
    nameWeight: 500,
    coordWeight: 300,
    centerNameSize: 14,
    centerBpSize: 11,
    rulerLabelSize: 6,
    inlineLabelSize: 8,
    externalLabelSize: 7,
    statsSize: 8,
  },
  strokes: {
    backbone: 1,
    featureBorder: 1,
    leaderLine: 0.5,
    restrictionMarker: 1,
    rulerTickMajor: 0.8,
    rulerTickMinor: 0.4,
    selection: 8,
    orf: 4,
  },
  style: {
    useGradients: false,
    featureFillOpacity: 0.4,
    restrictionSiteCircles: true,
    restrictionSiteCircleRadius: 2.5,
    showStatsBlock: true,
    nonScalingStroke: true,
  },
}
