import type { GenBankRecord, GenBankFeature, GenBankQualifier, Feature, FeatureType } from '@/types'
import type { Sequence } from '@/types'
import { FEATURE_COLORS } from '@/lib/constants'

/**
 * Parse a GenBank-formatted string into a GenBankRecord.
 * Handles LOCUS, DEFINITION, ACCESSION, VERSION, KEYWORDS,
 * SOURCE, ORGANISM, COMMENT, FEATURES, and ORIGIN sections.
 */
export function parseGenBank(content: string): GenBankRecord {
  const lines = content.split('\n')
  const record: GenBankRecord = {
    locus: '',
    definition: '',
    accession: '',
    version: '',
    keywords: '',
    source: '',
    organism: '',
    references: [],
    comments: [],
    features: [],
    sequence: '',
    isCircular: false,
  }

  let section = ''
  let featureLines: string[] = []
  let currentRef = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // LOCUS line
    if (line.startsWith('LOCUS')) {
      record.locus = line.slice(12).trim()
      record.isCircular = /circular/i.test(line)
      section = 'locus'
      continue
    }

    if (line.startsWith('DEFINITION')) {
      record.definition = line.slice(12).trim()
      section = 'definition'
      continue
    }

    if (line.startsWith('ACCESSION')) {
      record.accession = line.slice(12).trim()
      section = 'accession'
      continue
    }

    if (line.startsWith('VERSION')) {
      record.version = line.slice(12).trim()
      section = 'version'
      continue
    }

    if (line.startsWith('KEYWORDS')) {
      record.keywords = line.slice(12).trim()
      section = 'keywords'
      continue
    }

    if (line.startsWith('SOURCE')) {
      record.source = line.slice(12).trim()
      section = 'source'
      continue
    }

    if (line.startsWith('  ORGANISM')) {
      record.organism = line.slice(12).trim()
      section = 'organism'
      continue
    }

    if (line.startsWith('REFERENCE')) {
      if (currentRef) record.references.push(currentRef)
      currentRef = line.slice(12).trim()
      section = 'reference'
      continue
    }

    if (line.startsWith('COMMENT')) {
      record.comments.push(line.slice(12).trim())
      section = 'comment'
      continue
    }

    if (line.startsWith('FEATURES')) {
      if (currentRef) {
        record.references.push(currentRef)
        currentRef = ''
      }
      section = 'features'
      continue
    }

    if (line.startsWith('ORIGIN')) {
      section = 'origin'
      continue
    }

    if (line.startsWith('//')) {
      break
    }

    // Continuation lines
    if (section === 'definition' && line.startsWith('            ')) {
      record.definition += ' ' + line.trim()
    } else if (section === 'comment' && line.startsWith('            ')) {
      const last = record.comments.length - 1
      if (last >= 0) {
        record.comments[last] += '\n' + line.trim()
      }
    } else if (section === 'reference' && line.startsWith('  ')) {
      currentRef += '\n' + line.trim()
    } else if (section === 'features') {
      featureLines.push(line)
    } else if (section === 'origin') {
      // Extract sequence bases — lines are like: "        1 atcgatcg..."
      const bases = line.replace(/[^a-zA-Z]/g, '')
      record.sequence += bases.toUpperCase()
    }
  }

  // Parse the collected feature lines
  record.features = parseFeatureLines(featureLines)

  return record
}

/** Parse the FEATURES table lines into structured GenBankFeature objects. */
function parseFeatureLines(lines: string[]): GenBankFeature[] {
  const features: GenBankFeature[] = []
  let current: GenBankFeature | null = null
  let currentQualValue = ''
  let currentQualKey = ''

  for (const line of lines) {
    // New feature: type starts at column 5, location at column 21
    if (line.length > 5 && line[5] !== ' ' && line[5] !== undefined) {
      if (current) {
        finishQualifier(current, currentQualKey, currentQualValue)
        features.push(current)
      }

      const type = line.slice(5, 21).trim()
      const location = line.slice(21).trim()

      current = {
        type,
        location,
        qualifiers: [],
        complement: /complement/i.test(location),
        join: /join/i.test(location),
      }
      currentQualKey = ''
      currentQualValue = ''
    } else if (line.startsWith('                     /') && current) {
      // New qualifier
      finishQualifier(current, currentQualKey, currentQualValue)

      const qualStr = line.slice(21).trim().slice(1) // Remove leading /
      const eqIdx = qualStr.indexOf('=')
      if (eqIdx === -1) {
        currentQualKey = qualStr
        currentQualValue = ''
      } else {
        currentQualKey = qualStr.slice(0, eqIdx)
        currentQualValue = qualStr.slice(eqIdx + 1).replace(/^"/, '').replace(/"$/, '')
      }
    } else if (line.startsWith('                     ') && current && currentQualKey) {
      // Continuation of qualifier value
      const cont = line.trim().replace(/"$/, '')
      currentQualValue += currentQualValue ? ' ' + cont : cont
    }
  }

  // Push the last feature
  if (current) {
    finishQualifier(current, currentQualKey, currentQualValue)
    features.push(current)
  }

  return features
}

function finishQualifier(
  feature: GenBankFeature,
  key: string,
  value: string,
): void {
  if (key) {
    feature.qualifiers.push({ key, value })
  }
}

/**
 * Parse a GenBank feature location string into numeric start/end positions.
 * Handles: simple (100..200), complement(100..200), join(100..200,300..400)
 * Returns 0-based positions.
 */
export function parseLocation(location: string): {
  start: number
  end: number
  complement: boolean
  join: boolean
  segments: { start: number; end: number }[]
} {
  const complement = /complement/i.test(location)
  const join = /join/i.test(location)

  // Strip complement() and join() wrappers
  let inner = location
    .replace(/complement\(/gi, '')
    .replace(/join\(/gi, '')
    .replace(/\)/g, '')
    .trim()

  const segments: { start: number; end: number }[] = []
  const parts = inner.split(',')

  for (const part of parts) {
    const rangeMatch = part.match(/<?(\d+)\.\.>?(\d+)/)
    const singleMatch = part.match(/^<?(\d+)>?$/)

    if (rangeMatch) {
      // GenBank uses 1-based positions, convert to 0-based
      segments.push({
        start: parseInt(rangeMatch[1], 10) - 1,
        end: parseInt(rangeMatch[2], 10) - 1,
      })
    } else if (singleMatch) {
      const pos = parseInt(singleMatch[1], 10) - 1
      segments.push({ start: pos, end: pos })
    }
  }

  const start = segments.length > 0 ? segments[0].start : 0
  const end = segments.length > 0 ? segments[segments.length - 1].end : 0

  return { start, end, complement, join, segments }
}

/** Parse a FASTA-formatted string (first record only). */
export function parseFASTA(content: string): { name: string; bases: string } {
  const lines = content.split('\n')
  const name = lines[0]?.startsWith('>') ? lines[0].slice(1).trim() : 'Unnamed'
  const baseLines: string[] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('>')) break // stop at next record
    baseLines.push(lines[i])
  }
  const bases = baseLines.join('').replace(/\s/g, '')
  return { name, bases }
}

/**
 * Parse a SnapGene .dna binary file.
 *
 * The format is a sequence of TLV packets:
 *   - 1 byte tag
 *   - 4 byte big-endian length
 *   - N bytes data
 *
 * Packet tags:
 *   0x09 = Cookie (magic "SnapGene" header)
 *   0x00 = DNA sequence (flag byte + ASCII bases)
 *   0x06 = Notes (XML metadata)
 *   0x0A = Features (XML feature table)
 *   0x05 = Primers (XML, ignored here)
 */
export function parseSnapGene(buffer: ArrayBuffer): Partial<Sequence> {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let offset = 0

  // Validate cookie packet
  if (bytes.length < 14 || bytes[0] !== 0x09) {
    throw new Error('Not a valid SnapGene file: missing cookie packet')
  }

  const result: Partial<Sequence> = {
    bases: '',
    isCircular: false,
    features: [],
    annotations: [],
  }

  while (offset < bytes.length) {
    if (offset + 5 > bytes.length) break
    const tag = bytes[offset]
    const length = view.getUint32(offset + 1, false) // big-endian
    offset += 5

    if (offset + length > bytes.length) break
    const data = bytes.slice(offset, offset + length)
    offset += length

    switch (tag) {
      case 0x09: {
        // Cookie packet — validate "SnapGene" magic string
        const magic = String.fromCharCode(...data.slice(0, 8))
        if (magic !== 'SnapGene') {
          throw new Error('Not a valid SnapGene file: bad magic string')
        }
        break
      }
      case 0x00: {
        // DNA sequence packet: first byte is flags, rest is ASCII sequence
        const flags = data[0]
        result.isCircular = (flags & 0x01) !== 0
        result.bases = new TextDecoder('latin1').decode(data.slice(1)).toUpperCase()
        break
      }
      case 0x06: {
        // Notes packet (XML) — extract description
        const xml = new TextDecoder().decode(data)
        const descMatch = xml.match(/<Description>([\s\S]*?)<\/Description>/)
        if (descMatch) {
          result.description = descMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        }
        const typeMatch = xml.match(/<Type>(.*?)<\/Type>/)
        if (typeMatch && !result.annotations) {
          result.annotations = []
        }
        if (typeMatch) {
          result.annotations!.push({ key: 'molecule_type', value: typeMatch[1] })
        }
        break
      }
      case 0x0A: {
        // Features packet (XML)
        const xml = new TextDecoder().decode(data)
        result.features = parseSnapGeneFeatures(xml)
        break
      }
      // 0x05 = Primers, skip
    }
  }

  result.length = result.bases?.length ?? 0
  return result
}

/** Parse the Features XML from a SnapGene packet into Feature objects. */
function parseSnapGeneFeatures(xml: string): Feature[] {
  const features: Feature[] = []

  const KNOWN_TYPES = new Set<string>([
    'CDS', 'promoter', 'terminator', 'gene', 'rep_origin',
    'misc_feature', 'primer_bind', 'regulatory', 'protein_bind',
  ])

  // Match each <Feature ...>...</Feature> block
  const featureRegex = /<Feature\s([^>]*)>([\s\S]*?)<\/Feature>/g
  let match: RegExpExecArray | null

  while ((match = featureRegex.exec(xml)) !== null) {
    const attrs = match[1]
    const body = match[2]

    const nameMatch = attrs.match(/name="([^"]*)"/)
    const typeMatch = attrs.match(/type="([^"]*)"/)
    const dirMatch = attrs.match(/directionality="(\d)"/)

    const name = nameMatch ? nameMatch[1] : 'Unknown'
    const rawType = typeMatch ? typeMatch[1] : 'misc_feature'
    const dir = dirMatch ? parseInt(dirMatch[1], 10) : 1
    const strand: 1 | -1 = dir === 2 ? -1 : 1

    // Parse segment ranges (1-based inclusive, convert to 0-based)
    const segments: { start: number; end: number }[] = []
    const segRegex = /range="(\d+)-(\d+)"/g
    let segMatch: RegExpExecArray | null
    while ((segMatch = segRegex.exec(body)) !== null) {
      segments.push({
        start: parseInt(segMatch[1], 10) - 1,
        end: parseInt(segMatch[2], 10) - 1,
      })
    }

    const start = segments.length > 0 ? segments[0].start : 0
    const end = segments.length > 0 ? segments[segments.length - 1].end : 0

    // Parse qualifiers
    const annotations: { key: string; value: string }[] = []
    const qualRegex = /<Q name="([^"]*)">\s*<V\s+(?:text="([^"]*)"|predef="([^"]*)"|int="([^"]*)")\s*\/>\s*<\/Q>/g
    let qualMatch: RegExpExecArray | null
    while ((qualMatch = qualRegex.exec(body)) !== null) {
      const value = qualMatch[2] ?? qualMatch[3] ?? qualMatch[4] ?? ''
      annotations.push({ key: qualMatch[1], value })
    }

    const type: FeatureType = KNOWN_TYPES.has(rawType) ? rawType as FeatureType : 'misc_feature'

    features.push({
      id: crypto.randomUUID(),
      name,
      type,
      start,
      end,
      strand,
      color: FEATURE_COLORS[type],
      annotations,
    })
  }

  return features
}
