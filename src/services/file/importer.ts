import { parseGenBank, parseFASTA, parseLocation, parseSnapGene } from '@/services/bio/parser'
import type { Sequence, Feature, FeatureType } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { FEATURE_COLORS } from '@/lib/constants'

type FileFormat = 'genbank' | 'fasta' | 'fastq' | 'snapgene' | 'unknown'

function detectFormat(filename: string, content: string): FileFormat {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'gb' || ext === 'gbk' || ext === 'genbank') return 'genbank'
  if (ext === 'fa' || ext === 'fasta' || ext === 'fna') return 'fasta'
  if (ext === 'fq' || ext === 'fastq') return 'fastq'
  if (ext === 'dna') return 'snapgene'
  if (content.startsWith('LOCUS')) return 'genbank'
  if (content.startsWith('>')) return 'fasta'
  if (content.startsWith('@')) return 'fastq'
  return 'unknown'
}

/** Import a SnapGene .dna binary file and convert it to a Sequence. */
export function importSnapGeneFile(filename: string, buffer: ArrayBuffer): Sequence {
  const now = new Date().toISOString()
  const parsed = parseSnapGene(buffer)

  return {
    id: uuidv4(),
    name: parsed.name || filename.replace(/\.dna$/i, ''),
    description: parsed.description || '',
    bases: parsed.bases || '',
    isCircular: parsed.isCircular ?? false,
    length: parsed.length ?? parsed.bases?.length ?? 0,
    features: parsed.features ?? [],
    restrictionSites: [],
    orfs: [],
    annotations: parsed.annotations ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

const KNOWN_FEATURE_TYPES = new Set<string>([
  'CDS', 'promoter', 'terminator', 'gene', 'rep_origin',
  'misc_feature', 'primer_bind', 'regulatory', 'protein_bind',
])

/** Import a file and convert it to a Sequence. */
export function importFile(
  filename: string,
  content: string,
): Sequence {
  const format = detectFormat(filename, content)
  const now = new Date().toISOString()

  switch (format) {
    case 'genbank': {
      const record = parseGenBank(content)

      // Convert GenBank features to our Feature type
      const features: Feature[] = record.features
        .filter((f) => f.type !== 'source')
        .map((f) => {
          const loc = parseLocation(f.location)
          const type: FeatureType = KNOWN_FEATURE_TYPES.has(f.type)
            ? (f.type as FeatureType)
            : 'misc_feature'

          const nameQualifier =
            f.qualifiers.find((q) => q.key === 'label') ??
            f.qualifiers.find((q) => q.key === 'gene') ??
            f.qualifiers.find((q) => q.key === 'product') ??
            f.qualifiers.find((q) => q.key === 'note')

          return {
            id: uuidv4(),
            name: nameQualifier?.value || f.type,
            type,
            start: loc.start,
            end: loc.end,
            strand: loc.complement ? (-1 as const) : (1 as const),
            color: FEATURE_COLORS[type],
            annotations: f.qualifiers
              .filter((q) => q.key !== 'label')
              .map((q) => ({ key: q.key, value: q.value })),
          }
        })

      return {
        id: uuidv4(),
        name: record.locus.split(/\s+/)[0] || filename,
        description: record.definition,
        bases: record.sequence,
        isCircular: record.isCircular,
        length: record.sequence.length,
        features,
        restrictionSites: [],
        orfs: [],
        annotations: record.comments.map((c, i) => ({
          key: `comment_${i}`,
          value: c,
        })),
        createdAt: now,
        updatedAt: now,
      }
    }
    case 'fasta': {
      const { name, bases } = parseFASTA(content)
      return {
        id: uuidv4(),
        name,
        description: '',
        bases,
        isCircular: false,
        length: bases.length,
        features: [],
        restrictionSites: [],
        orfs: [],
        annotations: [],
        createdAt: now,
        updatedAt: now,
      }
    }
    case 'fastq': {
      const parsed = parseFASTQ(content)
      return {
        id: uuidv4(),
        name: parsed.name,
        description: '',
        bases: parsed.bases,
        isCircular: false,
        length: parsed.bases.length,
        features: [],
        restrictionSites: [],
        orfs: [],
        annotations: [
          { key: 'quality_scores', value: parsed.quality },
        ],
        createdAt: now,
        updatedAt: now,
      }
    }
    default:
      throw new Error(`Unsupported file format: ${format}`)
  }
}

/** Parse a FASTQ-formatted string (first record). */
function parseFASTQ(content: string): { name: string; bases: string; quality: string } {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 4 || !lines[0].startsWith('@')) {
    throw new Error('Invalid FASTQ format')
  }
  const name = lines[0].slice(1).split(/\s+/)[0] || 'Untitled'
  const bases = lines[1].toUpperCase()
  // lines[2] is the '+' separator
  const quality = lines[3]
  return { name, bases, quality }
}
