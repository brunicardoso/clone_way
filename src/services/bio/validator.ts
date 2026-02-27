const VALID_BASES = /^[ATCGatcgNnRrYySsWwKkMmBbDdHhVv]*$/

/** Validate that a string contains only valid nucleotide characters. */
export function validateSequence(bases: string): {
  valid: boolean
  error?: string
} {
  if (!bases.length) {
    return { valid: false, error: 'Sequence is empty' }
  }
  if (!VALID_BASES.test(bases)) {
    return { valid: false, error: 'Sequence contains invalid characters' }
  }
  return { valid: true }
}

/** Validate a feature range, handling circular wraparound. */
export function validateFeatureRange(
  start: number,
  end: number,
  sequenceLength: number,
  isCircular: boolean,
): { valid: boolean; error?: string } {
  if (start < 0 || end < 0) {
    return { valid: false, error: 'Positions must be non-negative' }
  }
  if (start >= sequenceLength || end >= sequenceLength) {
    return { valid: false, error: 'Positions exceed sequence length' }
  }
  if (!isCircular && start > end) {
    return {
      valid: false,
      error: 'Start must be <= end for linear sequences',
    }
  }
  return { valid: true }
}
