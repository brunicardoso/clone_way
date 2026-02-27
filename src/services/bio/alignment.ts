export interface AlignmentResult {
  alignedSeq1: string
  alignedSeq2: string
  score: number
  identity: number
  gaps: number
  matches: number
  mismatches: number
}

export interface AlignmentParams {
  match?: number
  mismatch?: number
  gapOpen?: number
  gapExtend?: number
}

const DEFAULT_PARAMS: Required<AlignmentParams> = {
  match: 2,
  mismatch: -1,
  gapOpen: -2,
  gapExtend: -0.5,
}

export function needlemanWunsch(
  seq1: string,
  seq2: string,
  params?: AlignmentParams,
): AlignmentResult {
  const p = { ...DEFAULT_PARAMS, ...params }
  const n = seq1.length
  const m = seq2.length

  // Score matrices using typed arrays for performance
  const size = (n + 1) * (m + 1)
  const H = new Float32Array(size) // match/mismatch matrix
  const E = new Float32Array(size) // gap in seq1 (insertion)
  const F = new Float32Array(size) // gap in seq2 (deletion)
  // Pointer matrix: 0=diagonal, 1=from E (gap in seq2), 2=from F (gap in seq1)
  const ptr = new Uint8Array(size)

  const idx = (i: number, j: number) => i * (m + 1) + j
  const NEG_INF = -1e9

  // Initialize
  H[idx(0, 0)] = 0
  E[idx(0, 0)] = NEG_INF
  F[idx(0, 0)] = NEG_INF

  for (let i = 1; i <= n; i++) {
    H[idx(i, 0)] = p.gapOpen + (i - 1) * p.gapExtend
    E[idx(i, 0)] = NEG_INF
    F[idx(i, 0)] = p.gapOpen + (i - 1) * p.gapExtend
    ptr[idx(i, 0)] = 2 // gap in seq2
  }

  for (let j = 1; j <= m; j++) {
    H[idx(0, j)] = p.gapOpen + (j - 1) * p.gapExtend
    E[idx(0, j)] = p.gapOpen + (j - 1) * p.gapExtend
    F[idx(0, j)] = NEG_INF
    ptr[idx(0, j)] = 1 // gap in seq1
  }

  // Fill matrices
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchScore =
        seq1[i - 1].toUpperCase() === seq2[j - 1].toUpperCase()
          ? p.match
          : p.mismatch

      // E: gap in seq2 (horizontal gap - insertion in seq1)
      E[idx(i, j)] = Math.max(
        H[idx(i, j - 1)] + p.gapOpen,
        E[idx(i, j - 1)] + p.gapExtend,
      )

      // F: gap in seq1 (vertical gap - deletion from seq1)
      F[idx(i, j)] = Math.max(
        H[idx(i - 1, j)] + p.gapOpen,
        F[idx(i - 1, j)] + p.gapExtend,
      )

      // H: best score at (i, j)
      const diag = H[idx(i - 1, j - 1)] + matchScore
      const fromE = E[idx(i, j)]
      const fromF = F[idx(i, j)]

      if (diag >= fromE && diag >= fromF) {
        H[idx(i, j)] = diag
        ptr[idx(i, j)] = 0 // diagonal
      } else if (fromE >= fromF) {
        H[idx(i, j)] = fromE
        ptr[idx(i, j)] = 1 // gap in seq1 (from E)
      } else {
        H[idx(i, j)] = fromF
        ptr[idx(i, j)] = 2 // gap in seq2 (from F)
      }
    }
  }

  // Traceback using pointer matrix
  let aligned1 = ''
  let aligned2 = ''
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    const p_val = ptr[idx(i, j)]
    if (p_val === 0 && i > 0 && j > 0) {
      aligned1 = seq1[i - 1] + aligned1
      aligned2 = seq2[j - 1] + aligned2
      i--
      j--
    } else if (p_val === 2 && i > 0) {
      aligned1 = seq1[i - 1] + aligned1
      aligned2 = '-' + aligned2
      i--
    } else if (j > 0) {
      aligned1 = '-' + aligned1
      aligned2 = seq2[j - 1] + aligned2
      j--
    } else {
      break
    }
  }

  // Compute statistics
  let matches = 0
  let mismatches = 0
  let gaps = 0

  for (let k = 0; k < aligned1.length; k++) {
    if (aligned1[k] === '-' || aligned2[k] === '-') {
      gaps++
    } else if (aligned1[k].toUpperCase() === aligned2[k].toUpperCase()) {
      matches++
    } else {
      mismatches++
    }
  }

  const identity =
    aligned1.length > 0 ? (matches / aligned1.length) * 100 : 0

  return {
    alignedSeq1: aligned1,
    alignedSeq2: aligned2,
    score: H[idx(n, m)],
    identity,
    gaps,
    matches,
    mismatches,
  }
}
