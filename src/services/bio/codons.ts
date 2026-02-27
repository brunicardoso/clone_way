/** Standard genetic code: codon -> amino acid */
export const CODON_TABLE: Record<string, string> = {
  TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L',
  CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M',
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S',
  CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*',
  CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W',
  CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
}

/**
 * Codon usage tables: organism -> { amino acid -> preferred codon }.
 * Values represent the most-used codon for each amino acid in the organism.
 * Based on Kazusa codon usage database frequencies.
 */
export const CODON_USAGE: Record<string, Record<string, string>> = {
  'E. coli': {
    F: 'TTT', L: 'CTG', I: 'ATT', M: 'ATG', V: 'GTG',
    S: 'AGC', P: 'CCG', T: 'ACC', A: 'GCG', Y: 'TAT',
    H: 'CAT', Q: 'CAG', N: 'AAC', K: 'AAA', D: 'GAT',
    E: 'GAA', C: 'TGC', W: 'TGG', R: 'CGT', G: 'GGC',
    '*': 'TAA',
  },
  'S. cerevisiae': {
    F: 'TTC', L: 'TTG', I: 'ATC', M: 'ATG', V: 'GTT',
    S: 'TCT', P: 'CCA', T: 'ACT', A: 'GCT', Y: 'TAC',
    H: 'CAC', Q: 'CAA', N: 'AAC', K: 'AAG', D: 'GAT',
    E: 'GAA', C: 'TGT', W: 'TGG', R: 'AGA', G: 'GGT',
    '*': 'TAA',
  },
  'H. sapiens': {
    F: 'TTC', L: 'CTG', I: 'ATC', M: 'ATG', V: 'GTG',
    S: 'AGC', P: 'CCC', T: 'ACC', A: 'GCC', Y: 'TAC',
    H: 'CAC', Q: 'CAG', N: 'AAC', K: 'AAG', D: 'GAC',
    E: 'GAG', C: 'TGC', W: 'TGG', R: 'CGG', G: 'GGC',
    '*': 'TGA',
  },
  'C. elegans': {
    F: 'TTC', L: 'CTT', I: 'ATC', M: 'ATG', V: 'GTC',
    S: 'TCA', P: 'CCA', T: 'ACA', A: 'GCT', Y: 'TAC',
    H: 'CAC', Q: 'CAA', N: 'AAC', K: 'AAG', D: 'GAC',
    E: 'GAA', C: 'TGC', W: 'TGG', R: 'AGA', G: 'GGA',
    '*': 'TAA',
  },
  'D. melanogaster': {
    F: 'TTC', L: 'CTG', I: 'ATC', M: 'ATG', V: 'GTG',
    S: 'AGC', P: 'CCC', T: 'ACC', A: 'GCC', Y: 'TAC',
    H: 'CAC', Q: 'CAG', N: 'AAC', K: 'AAG', D: 'GAC',
    E: 'GAG', C: 'TGC', W: 'TGG', R: 'CGC', G: 'GGC',
    '*': 'TAA',
  },
}

/** Organism name aliases for flexible matching */
const ORGANISM_ALIASES: Record<string, string> = {
  'e. coli': 'E. coli',
  'ecoli': 'E. coli',
  'escherichia coli': 'E. coli',
  's. cerevisiae': 'S. cerevisiae',
  'yeast': 'S. cerevisiae',
  'saccharomyces cerevisiae': 'S. cerevisiae',
  'h. sapiens': 'H. sapiens',
  'human': 'H. sapiens',
  'homo sapiens': 'H. sapiens',
  'c. elegans': 'C. elegans',
  'caenorhabditis elegans': 'C. elegans',
  'worm': 'C. elegans',
  'd. melanogaster': 'D. melanogaster',
  'drosophila': 'D. melanogaster',
  'fly': 'D. melanogaster',
  'drosophila melanogaster': 'D. melanogaster',
}

function resolveOrganism(organism: string): string {
  return ORGANISM_ALIASES[organism.toLowerCase()] ?? organism
}

/**
 * Codon-optimize a coding sequence for a target organism.
 * Replaces each codon with the most-preferred synonymous codon
 * for the target organism while preserving the amino acid sequence.
 *
 * @param sequence - Nucleotide coding sequence (must be multiple of 3)
 * @param organism - Target organism name (e.g., "E. coli", "human", "yeast")
 * @returns Optimized nucleotide sequence
 */
export function optimizeCodons(sequence: string, organism: string): string {
  const resolved = resolveOrganism(organism)
  const usage = CODON_USAGE[resolved]

  if (!usage) {
    throw new Error(
      `Unknown organism "${organism}". Supported: ${Object.keys(CODON_USAGE).join(', ')}`,
    )
  }

  const upper = sequence.toUpperCase()
  let optimized = ''

  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.slice(i, i + 3)
    const aa = CODON_TABLE[codon]
    if (!aa) {
      // Unknown codon (contains N or other ambiguous bases) — keep as-is
      optimized += codon
      continue
    }
    optimized += usage[aa] ?? codon
  }

  // Append any trailing bases that don't form a complete codon
  const remainder = upper.length % 3
  if (remainder > 0) {
    optimized += upper.slice(-remainder)
  }

  return optimized
}

/**
 * Calculate the Codon Adaptation Index (CAI) approximation.
 * Returns a value between 0 and 1 indicating how well the sequence
 * matches the preferred codons for the target organism.
 */
export function calculateCAI(sequence: string, organism: string): number {
  const resolved = resolveOrganism(organism)
  const usage = CODON_USAGE[resolved]
  if (!usage) return 0

  const upper = sequence.toUpperCase()
  let matches = 0
  let total = 0

  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.slice(i, i + 3)
    const aa = CODON_TABLE[codon]
    if (!aa || aa === '*') continue
    total++
    if (usage[aa] === codon) matches++
  }

  return total > 0 ? matches / total : 0
}

/** Translate a nucleotide sequence to amino acids. */
export function translate(sequence: string): string {
  const upper = sequence.toUpperCase()
  let protein = ''
  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.slice(i, i + 3)
    protein += CODON_TABLE[codon] ?? 'X'
  }
  return protein
}

/** Get list of supported organisms. */
export function getSupportedOrganisms(): string[] {
  return Object.keys(CODON_USAGE)
}
