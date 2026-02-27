import { KNOWN_FEATURES, type KnownFeature } from './featureDatabase'

export interface AnnotationMatch {
  feature: KnownFeature
  start: number
  end: number
  strand: 1 | -1
  identity: number
}

interface AutoAnnotateOptions {
  minIdentity?: number // default 100 (exact match only for speed)
}

const COMPLEMENT: Record<string, string> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
  N: 'N',
}

function reverseComplement(seq: string): string {
  let rc = ''
  for (let i = seq.length - 1; i >= 0; i--) {
    rc += COMPLEMENT[seq[i]] ?? 'N'
  }
  return rc
}

/**
 * Scan a sequence for known features by exact substring matching
 * on both forward and reverse complement strands.
 * For circular sequences, handles wraparound by extending the search string.
 */
export function autoAnnotate(
  sequenceBases: string,
  isCircular: boolean,
  options?: AutoAnnotateOptions,
): AnnotationMatch[] {
  const minIdentity = options?.minIdentity ?? 100
  const upper = sequenceBases.toUpperCase()
  const seqLen = upper.length
  const matches: AnnotationMatch[] = []

  // For circular sequences, extend search string to catch wraparound features
  const maxFeatureLen = Math.max(...KNOWN_FEATURES.map((f) => f.sequence.length))
  const searchSeq = isCircular
    ? upper + upper.slice(0, Math.min(maxFeatureLen, seqLen))
    : upper

  for (const feature of KNOWN_FEATURES) {
    const fwdSeq = feature.sequence.toUpperCase()
    const revSeq = reverseComplement(fwdSeq)

    // Skip very short features (< 6bp) to avoid false positives
    if (fwdSeq.length < 6) continue

    if (minIdentity >= 100) {
      // Exact matching — fast indexOf scan
      findExactMatches(searchSeq, fwdSeq, seqLen, feature, 1, matches)
      // Only search reverse complement if different from forward
      if (revSeq !== fwdSeq) {
        findExactMatches(searchSeq, revSeq, seqLen, feature, -1, matches)
      }
    } else {
      // Approximate matching for shorter features (< 200bp)
      if (fwdSeq.length <= 200) {
        findApproxMatches(searchSeq, fwdSeq, seqLen, feature, 1, minIdentity, matches)
        if (revSeq !== fwdSeq) {
          findApproxMatches(searchSeq, revSeq, seqLen, feature, -1, minIdentity, matches)
        }
      } else {
        // For long features, only do exact matching
        findExactMatches(searchSeq, fwdSeq, seqLen, feature, 1, matches)
        if (revSeq !== fwdSeq) {
          findExactMatches(searchSeq, revSeq, seqLen, feature, -1, matches)
        }
      }
    }
  }

  // Sort by position, then by length (longer matches first)
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))

  // Deduplicate overlapping matches of the same feature
  return deduplicateMatches(matches)
}

function findExactMatches(
  searchSeq: string,
  pattern: string,
  seqLen: number,
  feature: KnownFeature,
  strand: 1 | -1,
  matches: AnnotationMatch[],
) {
  let pos = 0
  while (true) {
    const idx = searchSeq.indexOf(pattern, pos)
    if (idx === -1) break

    const start = idx % seqLen
    const end = (idx + pattern.length - 1) % seqLen

    matches.push({
      feature,
      start,
      end,
      strand,
      identity: 100,
    })

    pos = idx + 1
  }
}

function findApproxMatches(
  searchSeq: string,
  pattern: string,
  seqLen: number,
  feature: KnownFeature,
  strand: 1 | -1,
  minIdentity: number,
  matches: AnnotationMatch[],
) {
  const pLen = pattern.length
  const threshold = Math.floor((minIdentity / 100) * pLen)

  for (let i = 0; i <= searchSeq.length - pLen; i++) {
    let matchCount = 0
    for (let j = 0; j < pLen; j++) {
      if (searchSeq[i + j] === pattern[j]) matchCount++
    }

    if (matchCount >= threshold) {
      const identity = (matchCount / pLen) * 100
      const start = i % seqLen
      const end = (i + pLen - 1) % seqLen

      matches.push({
        feature,
        start,
        end,
        strand,
        identity,
      })

      // Skip ahead to avoid overlapping matches of the same feature
      i += Math.floor(pLen * 0.5)
    }
  }
}

function deduplicateMatches(matches: AnnotationMatch[]): AnnotationMatch[] {
  const result: AnnotationMatch[] = []

  for (const match of matches) {
    const isDuplicate = result.some(
      (existing) =>
        existing.feature.name === match.feature.name &&
        existing.strand === match.strand &&
        Math.abs(existing.start - match.start) < 10,
    )
    if (!isDuplicate) {
      result.push(match)
    }
  }

  return result
}
