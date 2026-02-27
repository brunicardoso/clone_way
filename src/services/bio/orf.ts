import type { ORF } from '@/types'

const START_CODON = 'ATG'
const STOP_CODONS = new Set(['TAA', 'TAG', 'TGA'])

/** Compute the reverse complement of a DNA sequence. */
function reverseComplement(seq: string): string {
  const complement: Record<string, string> = {
    A: 'T',
    T: 'A',
    C: 'G',
    G: 'C',
    N: 'N',
  }
  let rc = ''
  for (let i = seq.length - 1; i >= 0; i--) {
    rc += complement[seq[i]] ?? 'N'
  }
  return rc
}

/** Scan a single strand for ORFs in all 3 reading frames. */
function scanStrand(
  seq: string,
  strand: 1 | -1,
  seqLength: number,
  minLength: number,
): ORF[] {
  const orfs: ORF[] = []
  let orfId = 0

  for (let frame = 0; frame < 3; frame++) {
    const starts: number[] = []

    for (let i = frame; i + 2 < seq.length; i += 3) {
      const codon = seq.slice(i, i + 3)

      if (codon === START_CODON) {
        starts.push(i)
      }

      if (STOP_CODONS.has(codon) && starts.length > 0) {
        // End position is inclusive of the stop codon
        const end = i + 3
        for (const start of starts) {
          const length = end - start
          if (length >= minLength) {
            // Convert positions back to original strand coordinates
            let orfStart: number
            let orfEnd: number
            if (strand === 1) {
              orfStart = start
              orfEnd = end - 1
            } else {
              orfStart = seqLength - end
              orfEnd = seqLength - start - 1
            }

            orfs.push({
              id: `orf-${strand === 1 ? 'f' : 'r'}${frame}-${orfId++}`,
              start: orfStart,
              end: orfEnd,
              strand,
              frame: frame as 0 | 1 | 2,
            })
          }
        }
        starts.length = 0
      }
    }
  }

  return orfs
}

/**
 * Find all open reading frames in a sequence.
 * Scans all 6 reading frames (3 forward, 3 reverse complement).
 * @param sequence - The DNA sequence (uppercase or lowercase)
 * @param minLength - Minimum ORF length in nucleotides (default: 100)
 */
export function findORFs(sequence: string, minLength: number = 100): ORF[] {
  const upper = sequence.toUpperCase()
  const rc = reverseComplement(upper)

  const forwardOrfs = scanStrand(upper, 1, upper.length, minLength)
  const reverseOrfs = scanStrand(rc, -1, upper.length, minLength)

  return [...forwardOrfs, ...reverseOrfs].sort((a, b) => a.start - b.start)
}
