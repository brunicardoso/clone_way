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
  // --- Original 20 ---
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
  // --- 5' overhang additions ---
  { name: 'AflII', recognitionSequence: 'CTTAAG', cutOffset: 1, overhang: '5prime' },
  { name: 'AgeI', recognitionSequence: 'ACCGGT', cutOffset: 1, overhang: '5prime' },
  { name: 'AvrII', recognitionSequence: 'CCTAGG', cutOffset: 1, overhang: '5prime' },
  { name: 'BclI', recognitionSequence: 'TGATCA', cutOffset: 1, overhang: '5prime' },
  { name: 'BspEI', recognitionSequence: 'TCCGGA', cutOffset: 1, overhang: '5prime' },
  { name: 'BstBI', recognitionSequence: 'TTCGAA', cutOffset: 2, overhang: '5prime' },
  { name: 'EagI', recognitionSequence: 'CGGCCG', cutOffset: 1, overhang: '5prime' },
  { name: 'MfeI', recognitionSequence: 'CAATTG', cutOffset: 1, overhang: '5prime' },
  { name: 'MluI', recognitionSequence: 'ACGCGT', cutOffset: 1, overhang: '5prime' },
  { name: 'XmaI', recognitionSequence: 'CCCGGG', cutOffset: 1, overhang: '5prime' },
  { name: 'BssHII', recognitionSequence: 'GCGCGC', cutOffset: 1, overhang: '5prime' },
  { name: 'AscI', recognitionSequence: 'GGCGCGCC', cutOffset: 2, overhang: '5prime' },
  { name: 'PciI', recognitionSequence: 'ACATGT', cutOffset: 1, overhang: '5prime' },
  // --- 3' overhang additions ---
  { name: 'SphI', recognitionSequence: 'GCATGC', cutOffset: 5, overhang: '3prime' },
  { name: 'SacII', recognitionSequence: 'CCGCGG', cutOffset: 4, overhang: '3prime' },
  { name: 'NsiI', recognitionSequence: 'ATGCAT', cutOffset: 5, overhang: '3prime' },
  { name: 'BsiWI', recognitionSequence: 'CGTACG', cutOffset: 1, overhang: '3prime' },
  { name: 'BsrGI', recognitionSequence: 'TGTACA', cutOffset: 1, overhang: '3prime' },
  { name: 'AatII', recognitionSequence: 'GACGTC', cutOffset: 5, overhang: '3prime' },
  { name: 'FseI', recognitionSequence: 'GGCCGGCC', cutOffset: 6, overhang: '3prime' },
  { name: 'PacI', recognitionSequence: 'TTAATTAA', cutOffset: 5, overhang: '3prime' },
  { name: 'SbfI', recognitionSequence: 'CCTGCAGG', cutOffset: 6, overhang: '3prime' },
  // --- Blunt additions ---
  { name: 'NruI', recognitionSequence: 'TCGCGA', cutOffset: 3, overhang: 'blunt' },
  { name: 'StuI', recognitionSequence: 'AGGCCT', cutOffset: 3, overhang: 'blunt' },
  { name: 'PvuII', recognitionSequence: 'CAGCTG', cutOffset: 3, overhang: 'blunt' },
  { name: 'SspI', recognitionSequence: 'AATATT', cutOffset: 3, overhang: 'blunt' },
  { name: 'DraI', recognitionSequence: 'TTTAAA', cutOffset: 3, overhang: 'blunt' },
  { name: 'SnaBI', recognitionSequence: 'TACGTA', cutOffset: 3, overhang: 'blunt' },
  { name: 'HpaI', recognitionSequence: 'GTTAAC', cutOffset: 3, overhang: 'blunt' },
  { name: 'PmeI', recognitionSequence: 'GTTTAAAC', cutOffset: 4, overhang: 'blunt' },
  { name: 'SwaI', recognitionSequence: 'ATTTAAAT', cutOffset: 4, overhang: 'blunt' },
  // --- Degenerate recognition sequences (IUPAC) ---
  { name: 'AflIII', recognitionSequence: 'ACRYGT', cutOffset: 1, overhang: '5prime' },
  { name: 'ApoI', recognitionSequence: 'RAATTY', cutOffset: 1, overhang: '5prime' },
  { name: 'AvaI', recognitionSequence: 'CYCGRG', cutOffset: 1, overhang: '5prime' },
  { name: 'BanII', recognitionSequence: 'GRGCYC', cutOffset: 5, overhang: '3prime' },
  { name: 'HincII', recognitionSequence: 'GTYRAC', cutOffset: 3, overhang: 'blunt' },
  { name: 'AccI', recognitionSequence: 'GTMKAC', cutOffset: 2, overhang: '5prime' },
  { name: 'SfiI', recognitionSequence: 'GGCCNNNNNGGCC', cutOffset: 8, overhang: '3prime' },
  { name: 'XcmI', recognitionSequence: 'CCANNNNNNNNNTGG', cutOffset: 8, overhang: '3prime' },
  { name: 'BlpI', recognitionSequence: 'GCTNAGC', cutOffset: 2, overhang: '5prime' },
  { name: 'AfeI', recognitionSequence: 'AGCGCT', cutOffset: 3, overhang: 'blunt' },
  { name: 'BbsI', recognitionSequence: 'GAAGAC', cutOffset: 8, overhang: '5prime', typeIIS: true, reverseOffset: 12 },
  { name: 'AleI', recognitionSequence: 'CACNNNNGTG', cutOffset: 5, overhang: 'blunt' },
  { name: 'DraIII', recognitionSequence: 'CACNNNGTG', cutOffset: 6, overhang: '3prime' },
  { name: 'RsrII', recognitionSequence: 'CGGWCCG', cutOffset: 2, overhang: '5prime' },
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

/** IUPAC complement map (covers all ambiguity codes) */
const IUPAC_COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', C: 'G', G: 'C',
  R: 'Y', Y: 'R', S: 'S', W: 'W',
  K: 'M', M: 'K', B: 'V', V: 'B',
  D: 'H', H: 'D', N: 'N',
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

/** Compute the reverse complement of a DNA sequence (supports IUPAC codes). */
function reverseComplement(seq: string): string {
  let rc = ''
  for (let i = seq.length - 1; i >= 0; i--) {
    rc += IUPAC_COMPLEMENT[seq[i].toUpperCase()] ?? 'N'
  }
  return rc
}

/**
 * Find all restriction sites for a given enzyme in a sequence.
 * Searches both strands (forward match and reverse complement match).
 * Returns positions on the original (sense) strand.
 *
 * When `isCircular` is true, also detects sites that span the origin
 * (i.e. straddle the junction between the end and start of the sequence).
 */
export function findRestrictionSites(
  sequence: string,
  enzyme: Enzyme,
  isCircular?: boolean,
): RestrictionSite[] {
  const upper = sequence.toUpperCase()
  const seqLen = upper.length
  const sites: RestrictionSite[] = []
  const seen = new Set<number>()

  // For circular sequences, extend the search string to catch origin-spanning sites
  const overlapLen = isCircular ? enzyme.recognitionSequence.length - 1 : 0
  const searchSeq = isCircular ? upper + upper.slice(0, overlapLen) : upper

  const regex = recognitionToRegex(enzyme.recognitionSequence)

  // Search forward strand
  let match: RegExpExecArray | null
  while ((match = regex.exec(searchSeq)) !== null) {
    if (match.index < seqLen && !seen.has(match.index)) {
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
    // Stop searching once we're past the valid range
    if (match.index >= seqLen) break
  }

  // Check if the recognition sequence is a palindrome (most restriction enzymes are)
  const rc = reverseComplement(enzyme.recognitionSequence)
  if (rc !== enzyme.recognitionSequence.toUpperCase()) {
    // Non-palindromic: also search for reverse complement
    const rcRegex = recognitionToRegex(rc)
    const recLen = enzyme.recognitionSequence.length
    while ((match = rcRegex.exec(searchSeq)) !== null) {
      if (match.index < seqLen && !seen.has(match.index)) {
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
      if (match.index >= seqLen) break
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
  isCircular?: boolean,
): Map<string, RestrictionSite[]> {
  const result = new Map<string, RestrictionSite[]>()
  for (const enzyme of enzymes) {
    const sites = findRestrictionSites(sequence, enzyme, isCircular)
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
  isCircular?: boolean,
): { enzyme: Enzyme; site: RestrictionSite }[] {
  const result: { enzyme: Enzyme; site: RestrictionSite }[] = []
  for (const enzyme of enzymes) {
    const sites = findRestrictionSites(sequence, enzyme, isCircular)
    if (sites.length === 1) {
      result.push({ enzyme, site: sites[0] })
    }
  }
  return result
}
