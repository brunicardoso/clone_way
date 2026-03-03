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
  'exon', 'intron', 'mRNA', "5'UTR", "3'UTR",
  'sig_peptide', 'mat_peptide', 'misc_RNA', 'ncRNA', 'rRNA', 'tRNA',
])

/**
 * Deduplicate redundant RefSeq features.
 *
 * RefSeq GenBank files annotate the same gene with many overlapping feature
 * types at different coordinates — all sharing the same /gene qualifier:
 *   - `gene`         — spans the entire locus
 *   - `mRNA`         — spans the transcript
 *   - `CDS`          — coding region
 *   - `exon`         — individual exon segments
 *   - `mat_peptide`  — mature peptide sub-regions of CDS
 *   - `sig_peptide`  — signal peptide sub-region of CDS
 *   - `misc_feature` — tiny functional-site annotations (3 bp active sites etc.)
 *
 * When a CDS exists for a gene name, we keep the CDS and drop all redundant
 * annotations that are sub-features or parent wrappers of that CDS. Only
 * structurally distinct features (regulatory, promoter, terminator, etc.) are
 * preserved alongside the CDS.
 */

/** Feature types that provide independent structural information worth keeping
 *  even when a CDS exists for the same gene name. */
const KEEP_ALONGSIDE_CDS = new Set<FeatureType>([
  'CDS', 'promoter', 'terminator', 'rep_origin', 'primer_bind',
  'regulatory', 'protein_bind', "5'UTR", "3'UTR",
  'misc_RNA', 'ncRNA', 'rRNA', 'tRNA', 'intron',
])

function deduplicateFeatures(features: Feature[]): Feature[] {
  // Group features by name
  const byName = new Map<string, Feature[]>()
  for (const f of features) {
    const group = byName.get(f.name)
    if (group) {
      group.push(f)
    } else {
      byName.set(f.name, [f])
    }
  }

  const removed = new Set<string>()
  for (const group of byName.values()) {
    if (group.length < 2) continue
    const types = new Set(group.map((f) => f.type))

    if (types.has('CDS')) {
      // CDS exists — drop everything that isn't structurally independent
      for (const f of group) {
        if (!KEEP_ALONGSIDE_CDS.has(f.type)) {
          removed.add(f.id)
        }
      }
    } else if (types.has('mRNA')) {
      // No CDS — keep mRNA, drop gene wrapper
      for (const f of group) {
        if (f.type === 'gene') removed.add(f.id)
      }
    }
  }

  return features.filter((f) => !removed.has(f.id))
}

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

      const dedupedFeatures = deduplicateFeatures(features)

      return {
        id: uuidv4(),
        name: record.locus.split(/\s+/)[0] || filename,
        description: record.definition,
        bases: record.sequence,
        isCircular: record.isCircular,
        length: record.sequence.length,
        features: dedupedFeatures,
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
