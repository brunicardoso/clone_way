import type { Sequence, Feature } from '@/types'

/**
 * Export a sequence as GenBank format.
 * Generates a complete GenBank flat file with LOCUS, DEFINITION,
 * FEATURES table, and ORIGIN section.
 */
export function exportGenBank(sequence: Sequence): string {
  const lines: string[] = []

  // LOCUS line: padded to standard format
  const topology = sequence.isCircular ? 'circular' : 'linear'
  const locusName = sequence.name.slice(0, 16).padEnd(16)
  lines.push(
    `LOCUS       ${locusName} ${String(sequence.length).padStart(7)} bp    DNA     ${topology}`,
  )

  // DEFINITION
  lines.push(`DEFINITION  ${sequence.description || sequence.name}.`)

  // ACCESSION
  lines.push(`ACCESSION   .`)

  // VERSION
  lines.push(`VERSION     .`)

  // FEATURES header
  lines.push(`FEATURES             Location/Qualifiers`)

  // Source feature
  lines.push(`     source          1..${sequence.length}`)
  lines.push(`                     /organism="${sequence.name}"`)
  lines.push(`                     /mol_type="other DNA"`)

  // Individual features
  for (const feature of sequence.features) {
    const location = formatFeatureLocation(feature, sequence.length)
    const typeStr = feature.type.padEnd(16)
    lines.push(`     ${typeStr}${location}`)

    // Feature qualifiers
    if (feature.name) {
      lines.push(`                     /label="${feature.name}"`)
    }

    if (feature.type === 'CDS') {
      lines.push(`                     /codon_start=1`)
    }

    // Custom annotations
    for (const ann of feature.annotations) {
      const val = ann.value.includes(' ') ? `"${ann.value}"` : ann.value
      lines.push(`                     /${ann.key}=${val}`)
    }
  }

  // ORIGIN
  lines.push('ORIGIN')
  const bases = sequence.bases.toLowerCase()
  for (let i = 0; i < bases.length; i += 60) {
    const lineNum = String(i + 1).padStart(9)
    const chunks: string[] = []
    for (let j = i; j < Math.min(i + 60, bases.length); j += 10) {
      chunks.push(bases.slice(j, Math.min(j + 10, bases.length)))
    }
    lines.push(`${lineNum} ${chunks.join(' ')}`)
  }

  lines.push('//')
  return lines.join('\n')
}

/** Format a feature's location string for GenBank output. */
function formatFeatureLocation(feature: Feature, _seqLength: number): string {
  const start = feature.start + 1 // Convert 0-based to 1-based
  const end = feature.end + 1

  let location: string
  if (start <= end) {
    location = `${start}..${end}`
  } else {
    // Wraparound feature on circular sequence
    location = `join(${start}..${_seqLength},1..${end})`
  }

  if (feature.strand === -1) {
    location = `complement(${location})`
  }

  return location
}

/** Export a sequence as FASTA format. */
export function exportFASTA(sequence: Sequence): string {
  const lines: string[] = [`>${sequence.name} ${sequence.description}`]
  for (let i = 0; i < sequence.bases.length; i += 80) {
    lines.push(sequence.bases.slice(i, i + 80))
  }
  return lines.join('\n')
}
