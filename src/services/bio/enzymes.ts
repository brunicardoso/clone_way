import type { RestrictionSite } from '@/types'

export interface Enzyme {
  name: string
  recognitionSequence: string
  cutOffset: number
  overhang: 'blunt' | '5prime' | '3prime'
  /** For Type IIS enzymes: distance from recognition site to sense cut */
  typeIIS?: boolean
  /** For Type IIS enzymes: cut offset on the anti-sense strand (downstream) */
  reverseOffset?: number
}

export const COMMON_ENZYMES: Enzyme[] = [
  { name: 'EcoRI', recognitionSequence: 'GAATTC', cutOffset: 1, overhang: '5prime' },
  { name: 'BamHI', recognitionSequence: 'GGATCC', cutOffset: 1, overhang: '5prime' },
  { name: 'HindIII', recognitionSequence: 'AAGCTT', cutOffset: 1, overhang: '5prime' },
  { name: 'XbaI', recognitionSequence: 'TCTAGA', cutOffset: 1, overhang: '5prime' },
  { name: 'SalI', recognitionSequence: 'GTCGAC', cutOffset: 1, overhang: '5prime' },
  { name: 'PstI', recognitionSequence: 'CTGCAG', cutOffset: 5, overhang: '3prime' },
  { name: 'SmaI', recognitionSequence: 'CCCGGG', cutOffset: 3, overhang: 'blunt' },
  { name: 'NotI', recognitionSequence: 'GCGGCCGC', cutOffset: 2, overhang: '5prime' },
  { name: 'XhoI', recognitionSequence: 'CTCGAG', cutOffset: 1, overhang: '5prime' },
  { name: 'NdeI', recognitionSequence: 'CATATG', cutOffset: 2, overhang: '5prime' },
  { name: 'NcoI', recognitionSequence: 'CCATGG', cutOffset: 1, overhang: '5prime' },
  { name: 'SpeI', recognitionSequence: 'ACTAGT', cutOffset: 1, overhang: '5prime' },
  { name: 'NheI', recognitionSequence: 'GCTAGC', cutOffset: 1, overhang: '5prime' },
  { name: 'BglII', recognitionSequence: 'AGATCT', cutOffset: 1, overhang: '5prime' },
  { name: 'ClaI', recognitionSequence: 'ATCGAT', cutOffset: 2, overhang: '5prime' },
  { name: 'EcoRV', recognitionSequence: 'GATATC', cutOffset: 3, overhang: 'blunt' },
  { name: 'KpnI', recognitionSequence: 'GGTACC', cutOffset: 5, overhang: '3prime' },
  { name: 'SacI', recognitionSequence: 'GAGCTC', cutOffset: 5, overhang: '3prime' },
  { name: 'ScaI', recognitionSequence: 'AGTACT', cutOffset: 3, overhang: 'blunt' },
  { name: 'ApaI', recognitionSequence: 'GGGCCC', cutOffset: 5, overhang: '3prime' },
]

/** Type IIS restriction enzymes used for Golden Gate assembly */
export const TYPE_IIS_ENZYMES: Enzyme[] = [
  { name: 'BsaI', recognitionSequence: 'GGTCTC', cutOffset: 7, overhang: '5prime', typeIIS: true, reverseOffset: 11 },
  { name: 'BpiI', recognitionSequence: 'GAAGAC', cutOffset: 8, overhang: '5prime', typeIIS: true, reverseOffset: 12 }, // BbsI is an isoschizomer
  { name: 'SapI', recognitionSequence: 'GCTCTTC', cutOffset: 8, overhang: '5prime', typeIIS: true, reverseOffset: 11 },
  { name: 'BsmBI', recognitionSequence: 'CGTCTC', cutOffset: 7, overhang: '5prime', typeIIS: true, reverseOffset: 11 },
]

/** IUPAC ambiguity codes for degenerate bases */
const IUPAC: Record<string, string> = {
  A: 'A', T: 'T', C: 'C', G: 'G',
  R: '[AG]', Y: '[CT]', S: '[GC]', W: '[AT]',
  K: '[GT]', M: '[AC]', B: '[CGT]', D: '[AGT]',
  H: '[ACT]', V: '[ACG]', N: '[ACGT]',
}

/** Convert a recognition sequence (possibly with IUPAC codes) to a regex pattern. */
function recognitionToRegex(recognition: string): RegExp {
  const pattern = recognition
    .toUpperCase()
    .split('')
    .map((ch) => IUPAC[ch] ?? ch)
    .join('')
  return new RegExp(pattern, 'gi')
}

/** Compute the reverse complement of a DNA sequence. */
function reverseComplement(seq: string): string {
  const complement: Record<string, string> = {
    A: 'T', T: 'A', C: 'G', G: 'C', N: 'N',
  }
  let rc = ''
  for (let i = seq.length - 1; i >= 0; i--) {
    rc += complement[seq[i].toUpperCase()] ?? 'N'
  }
  return rc
}

/**
 * Find all restriction sites for a given enzyme in a sequence.
 * Searches both strands (forward match and reverse complement match).
 * Returns positions on the original (sense) strand.
 */
export function findRestrictionSites(
  sequence: string,
  enzyme: Enzyme,
): RestrictionSite[] {
  const upper = sequence.toUpperCase()
  const sites: RestrictionSite[] = []
  const seen = new Set<number>()

  const regex = recognitionToRegex(enzyme.recognitionSequence)

  // Search forward strand
  let match: RegExpExecArray | null
  while ((match = regex.exec(upper)) !== null) {
    if (!seen.has(match.index)) {
      seen.add(match.index)
      sites.push({
        enzyme: enzyme.name,
        position: match.index,
        cutOffset: enzyme.cutOffset,
        recognitionSequence: enzyme.recognitionSequence,
        overhang: enzyme.overhang,
      })
    }
    // Move past this match by 1 to find overlapping sites
    regex.lastIndex = match.index + 1
  }

  // Check if the recognition sequence is a palindrome (most restriction enzymes are)
  const rc = reverseComplement(enzyme.recognitionSequence)
  if (rc !== enzyme.recognitionSequence.toUpperCase()) {
    // Non-palindromic: also search for reverse complement
    // For RC matches the cut is from the other end of the recognition site
    const rcRegex = recognitionToRegex(rc)
    const recLen = enzyme.recognitionSequence.length
    while ((match = rcRegex.exec(upper)) !== null) {
      if (!seen.has(match.index)) {
        seen.add(match.index)
        sites.push({
          enzyme: enzyme.name,
          position: match.index,
          cutOffset: recLen - enzyme.cutOffset,
          recognitionSequence: enzyme.recognitionSequence,
          overhang: enzyme.overhang,
        })
      }
      rcRegex.lastIndex = match.index + 1
    }
  }

  return sites.sort((a, b) => a.position - b.position)
}

/**
 * Find restriction sites for all common enzymes in a sequence.
 * Returns a map of enzyme name -> sites.
 */
export function findAllRestrictionSites(
  sequence: string,
  enzymes: Enzyme[] = COMMON_ENZYMES,
): Map<string, RestrictionSite[]> {
  const result = new Map<string, RestrictionSite[]>()
  for (const enzyme of enzymes) {
    const sites = findRestrictionSites(sequence, enzyme)
    if (sites.length > 0) {
      result.set(enzyme.name, sites)
    }
  }
  return result
}

/**
 * Find unique cutters — enzymes that cut the sequence exactly once.
 * Useful for cloning site selection.
 */
export function findUniqueCutters(
  sequence: string,
  enzymes: Enzyme[] = COMMON_ENZYMES,
): { enzyme: Enzyme; site: RestrictionSite }[] {
  const result: { enzyme: Enzyme; site: RestrictionSite }[] = []
  for (const enzyme of enzymes) {
    const sites = findRestrictionSites(sequence, enzyme)
    if (sites.length === 1) {
      result.push({ enzyme, site: sites[0] })
    }
  }
  return result
}
