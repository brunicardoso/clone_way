import type { Sequence, Feature, RestrictionSite } from '@/types'
import { COMMON_ENZYMES, TYPE_IIS_ENZYMES, findRestrictionSites } from './enzymes'
import { v4 as uuidv4 } from 'uuid'
import { FEATURE_COLORS } from '@/lib/constants'

export interface DigestFragment {
  /** Unique id for this fragment */
  id: string
  /** DNA bases of the fragment */
  bases: string
  /** Fragment length in bp */
  size: number
  /** Features inherited from the original sequence (coordinates shifted) */
  features: Feature[]
  /** Position in the original sequence where the fragment starts */
  startInOriginal: number
  /** Position in the original sequence where the fragment ends */
  endInOriginal: number
  /** Enzyme that created the left cut */
  leftEnzyme: string
  /** Enzyme that created the right cut */
  rightEnzyme: string
  /** Overhang type on the left */
  leftOverhang: 'blunt' | '5prime' | '3prime'
  /** Overhang type on the right */
  rightOverhang: 'blunt' | '5prime' | '3prime'
  /** Actual overhang bases on the left (empty for blunt) */
  leftOverhangBases: string
  /** Actual overhang bases on the right (empty for blunt) */
  rightOverhangBases: string
}

export interface DigestResult {
  /** Original sequence (preserved) */
  original: Sequence
  /** Enzymes used for the digest */
  enzymes: string[]
  /** Resulting fragments sorted by size (largest first) */
  fragments: DigestFragment[]
}

interface CutSite {
  position: number
  enzyme: string
  cutOffset: number
  recognitionSequence: string
  overhang: 'blunt' | '5prime' | '3prime'
}

/**
 * Digest a sequence using one or more restriction enzymes.
 * Preserves the original sequence and returns fragments with inherited features.
 */
export function digestSequence(
  sequence: Sequence,
  enzymeNames: string[],
): DigestResult {
  // Gather all cut sites for selected enzymes
  const cutSites: CutSite[] = []
  for (const name of enzymeNames) {
    const enzyme = [...COMMON_ENZYMES, ...TYPE_IIS_ENZYMES].find((e) => e.name === name)
    if (!enzyme) continue
    const sites = findRestrictionSites(sequence.bases, enzyme)
    for (const site of sites) {
      cutSites.push({
        position: site.position + site.cutOffset,
        enzyme: site.enzyme,
        cutOffset: site.cutOffset,
        recognitionSequence: site.recognitionSequence,
        overhang: site.overhang,
      })
    }
  }

  if (cutSites.length === 0) {
    // No cuts — return the whole sequence as one fragment
    return {
      original: sequence,
      enzymes: enzymeNames,
      fragments: [
        {
          id: uuidv4(),
          bases: sequence.bases,
          size: sequence.length,
          features: sequence.features.map((f) => ({ ...f, id: uuidv4() })),
          startInOriginal: 0,
          endInOriginal: sequence.length - 1,
          leftEnzyme: 'none',
          rightEnzyme: 'none',
          leftOverhang: 'blunt',
          rightOverhang: 'blunt',
          leftOverhangBases: '',
          rightOverhangBases: '',
        },
      ],
    }
  }

  // Sort cut sites by position
  cutSites.sort((a, b) => a.position - b.position)

  // Deduplicate cuts at same position
  const uniqueCuts: CutSite[] = []
  for (const cut of cutSites) {
    if (uniqueCuts.length === 0 || uniqueCuts[uniqueCuts.length - 1].position !== cut.position) {
      uniqueCuts.push(cut)
    }
  }

  const fragments: DigestFragment[] = []
  const seqLen = sequence.length
  const bases = sequence.bases

  if (sequence.isCircular) {
    // Circular: N cuts produce N fragments
    for (let i = 0; i < uniqueCuts.length; i++) {
      const leftCut = uniqueCuts[i]
      const rightCut = uniqueCuts[(i + 1) % uniqueCuts.length]
      const start = leftCut.position
      const end = rightCut.position

      let fragBases: string
      let fragStart: number
      let fragEnd: number
      if (end > start) {
        fragBases = bases.slice(start, end)
        fragStart = start
        fragEnd = end - 1
      } else {
        // Wraps around origin
        fragBases = bases.slice(start) + bases.slice(0, end)
        fragStart = start
        fragEnd = end - 1 + seqLen // virtual end for feature inheritance
      }

      fragments.push({
        id: uuidv4(),
        bases: fragBases,
        size: fragBases.length,
        features: inheritFeatures(sequence.features, fragStart, fragBases.length, seqLen, true),
        startInOriginal: start,
        endInOriginal: end > start ? end - 1 : (end === 0 ? seqLen - 1 : end - 1),
        leftEnzyme: leftCut.enzyme,
        rightEnzyme: rightCut.enzyme,
        leftOverhang: leftCut.overhang,
        rightOverhang: rightCut.overhang,
        leftOverhangBases: getOverhangBases(bases, leftCut, seqLen),
        rightOverhangBases: getOverhangBases(bases, rightCut, seqLen),
      })
    }
  } else {
    // Linear: N cuts produce N+1 fragments
    const cutPositions = [0, ...uniqueCuts.map((c) => c.position), seqLen]
    const cutEnzymes = [
      { enzyme: 'end', overhang: 'blunt' as const, cutOffset: 0, recognitionSequence: '', position: 0 },
      ...uniqueCuts,
      { enzyme: 'end', overhang: 'blunt' as const, cutOffset: 0, recognitionSequence: '', position: seqLen },
    ]

    for (let i = 0; i < cutPositions.length - 1; i++) {
      const start = cutPositions[i]
      const end = cutPositions[i + 1]
      const fragBases = bases.slice(start, end)
      const leftCut = cutEnzymes[i]
      const rightCut = cutEnzymes[i + 1]

      fragments.push({
        id: uuidv4(),
        bases: fragBases,
        size: fragBases.length,
        features: inheritFeatures(sequence.features, start, fragBases.length, seqLen, false),
        startInOriginal: start,
        endInOriginal: end - 1,
        leftEnzyme: leftCut.enzyme,
        rightEnzyme: rightCut.enzyme,
        leftOverhang: leftCut.overhang,
        rightOverhang: rightCut.overhang,
        leftOverhangBases: leftCut.enzyme === 'end' ? '' : getOverhangBases(bases, leftCut, seqLen),
        rightOverhangBases: rightCut.enzyme === 'end' ? '' : getOverhangBases(bases, rightCut, seqLen),
      })
    }
  }

  // Sort by size descending
  fragments.sort((a, b) => b.size - a.size)

  return {
    original: sequence,
    enzymes: enzymeNames,
    fragments,
  }
}

/**
 * Inherit features from the original sequence that fall within a fragment range.
 * Shifts feature coordinates to be relative to the fragment start.
 */
function inheritFeatures(
  features: Feature[],
  fragStart: number,
  fragLength: number,
  seqLen: number,
  isCircular: boolean,
): Feature[] {
  const result: Feature[] = []

  for (const f of features) {
    // Check if feature overlaps with fragment
    let overlapStart: number | null = null
    let overlapEnd: number | null = null

    if (isCircular && fragStart + fragLength > seqLen) {
      // Fragment wraps around origin: segment1 = [fragStart..seqLen-1], segment2 = [0..fragEnd2]
      const fragEnd1 = seqLen - 1
      const wrapEnd = (fragStart + fragLength) % seqLen
      const fragEnd2 = wrapEnd === 0 ? seqLen - 1 : wrapEnd - 1
      const shift = seqLen - fragStart

      // Handle wraparound features (f.start > f.end) by expanding them into
      // two virtual ranges for overlap checking
      const featureRanges: { start: number; end: number }[] = []
      if (f.start > f.end) {
        // Wraparound feature: [f.start..seqLen-1] and [0..f.end]
        featureRanges.push({ start: f.start, end: seqLen - 1 })
        featureRanges.push({ start: 0, end: f.end })
      } else {
        featureRanges.push({ start: f.start, end: f.end })
      }

      for (const fr of featureRanges) {
        // Check if this feature range overlaps segment1 (fragStart..seqLen-1)
        if (fr.start <= fragEnd1 && fr.end >= fragStart) {
          const oStart = Math.max(fr.start, fragStart) - fragStart
          const oEnd = Math.min(fr.end, fragEnd1) - fragStart
          if (overlapStart !== null && overlapEnd !== null) {
            overlapStart = Math.min(overlapStart, oStart)
            overlapEnd = Math.max(overlapEnd, oEnd)
          } else {
            overlapStart = oStart
            overlapEnd = oEnd
          }
        }
        // Check if this feature range overlaps segment2 (0..fragEnd2)
        if (fr.end >= 0 && fr.start <= fragEnd2) {
          const oStart = Math.max(fr.start, 0) + shift
          const oEnd = Math.min(fr.end, fragEnd2) + shift
          if (overlapStart !== null && overlapEnd !== null) {
            overlapStart = Math.min(overlapStart, oStart)
            overlapEnd = Math.max(overlapEnd, oEnd)
          } else {
            overlapStart = oStart
            overlapEnd = oEnd
          }
        }
      }
    } else {
      const fragEnd = fragStart + fragLength - 1
      // Feature fully or partially within fragment
      if (f.end >= fragStart && f.start <= fragEnd) {
        overlapStart = Math.max(f.start, fragStart) - fragStart
        overlapEnd = Math.min(f.end, fragEnd) - fragStart
      }
    }

    if (overlapStart !== null && overlapEnd !== null && overlapEnd >= overlapStart) {
      result.push({
        id: uuidv4(),
        name: f.name,
        type: f.type,
        start: overlapStart,
        end: overlapEnd,
        strand: f.strand,
        color: f.color || FEATURE_COLORS[f.type],
        annotations: [...f.annotations],
      })
    }
  }

  return result
}

/**
 * Get the overhang bases at a cut site.
 */
function getOverhangBases(
  bases: string,
  cut: CutSite,
  seqLen: number,
): string {
  if (cut.overhang === 'blunt') return ''

  const recLen = cut.recognitionSequence.length
  // cut.position = siteStart + cutOffset (sense strand cut)
  const siteStart = cut.position - cut.cutOffset
  const senseCut = cut.position
  // Anti-sense cut is always at recLen - cutOffset from site start
  const antiCut = siteStart + recLen - cut.cutOffset

  const start = Math.min(senseCut, antiCut)
  const end = Math.max(senseCut, antiCut)

  if (start < 0 || end > seqLen) return ''
  return bases.slice(start, end).toUpperCase()
}

/**
 * Convert a DigestFragment to a full Sequence object for opening in a tab.
 */
export function fragmentToSequence(
  fragment: DigestFragment,
  originalName: string,
): Sequence {
  const now = new Date().toISOString()
  const leftLabel = fragment.leftEnzyme === 'end' ? 'end' : fragment.leftEnzyme
  const rightLabel = fragment.rightEnzyme === 'end' ? 'end' : fragment.rightEnzyme

  return {
    id: fragment.id,
    name: `${originalName} [${leftLabel}–${rightLabel}] ${fragment.size} bp`,
    description: `Fragment from ${originalName} digest (${fragment.startInOriginal + 1}..${fragment.endInOriginal + 1})`,
    bases: fragment.bases,
    isCircular: false,
    length: fragment.size,
    features: fragment.features,
    restrictionSites: [],
    orfs: [],
    annotations: [
      { key: 'source', value: `Restriction digest of ${originalName}` },
      { key: 'left_enzyme', value: leftLabel },
      { key: 'right_enzyme', value: rightLabel },
      { key: 'left_overhang', value: fragment.leftOverhang },
      { key: 'right_overhang', value: fragment.rightOverhang },
    ],
    createdAt: now,
    updatedAt: now,
  }
}
