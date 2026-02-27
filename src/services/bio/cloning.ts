import { v4 as uuidv4 } from 'uuid'
import type { Sequence, Feature, CloningPlan, CloningStep, CloningMethod } from '@/types'
import { COMMON_ENZYMES, TYPE_IIS_ENZYMES, findRestrictionSites } from './enzymes'
import type { Enzyme } from './enzymes'
import { digestSequence, fragmentToSequence } from './digest'
import type { DigestFragment } from './digest'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return new Date().toISOString()
}

function makeSequence(partial: Partial<Sequence> & { bases: string; name: string }): Sequence {
  const ts = now()
  return {
    id: uuidv4(),
    description: '',
    isCircular: false,
    length: partial.bases.length,
    features: [],
    restrictionSites: [],
    orfs: [],
    annotations: [],
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  }
}

/** Compute the reverse complement of a DNA string */
function reverseComplement(seq: string): string {
  const comp: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C', N: 'N' }
  let rc = ''
  for (let i = seq.length - 1; i >= 0; i--) {
    rc += comp[seq[i].toUpperCase()] ?? 'N'
  }
  return rc
}

/** Calculate Tm using the simple Wallace rule: Tm = 2(A+T) + 4(G+C) */
function simpleTm(seq: string): number {
  let at = 0
  let gc = 0
  for (const ch of seq.toUpperCase()) {
    if (ch === 'A' || ch === 'T') at++
    else if (ch === 'G' || ch === 'C') gc++
  }
  return 2 * at + 4 * gc
}

/** Shift features that fall within a region into a new coordinate space */
function inheritFeaturesRange(
  features: Feature[],
  start: number,
  end: number,
): Feature[] {
  const result: Feature[] = []
  for (const f of features) {
    if (f.end >= start && f.start <= end) {
      result.push({
        ...f,
        id: uuidv4(),
        start: Math.max(f.start, start) - start,
        end: Math.min(f.end, end) - start,
      })
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Primer Design for Site-Directed Mutagenesis
// ---------------------------------------------------------------------------

export function designMutagenesisPrimers(
  template: string,
  mutationStart: number,
  mutationEnd: number,
  newBases: string,
): { forward: string; reverse: string; forwardTm: number; reverseTm: number } {
  const upper = template.toUpperCase()
  const flankLen = 15

  // Forward primer: ~15bp upstream + mutation + ~15bp downstream
  const upStart = Math.max(0, mutationStart - flankLen)
  const downEnd = Math.min(upper.length, mutationEnd + 1 + flankLen)

  const fwd =
    upper.slice(upStart, mutationStart) +
    newBases.toUpperCase() +
    upper.slice(mutationEnd + 1, downEnd)

  const rev = reverseComplement(fwd)

  return {
    forward: fwd,
    reverse: rev,
    forwardTm: simpleTm(fwd),
    reverseTm: simpleTm(rev),
  }
}

// ---------------------------------------------------------------------------
// Ligation
// ---------------------------------------------------------------------------

/**
 * Simulate ligation of compatible digest fragments.
 * Fragments are joined in the order given. If `circular` is true, the last
 * fragment is ligated back to the first.
 */
export function ligateFragments(
  fragments: DigestFragment[],
  circular: boolean,
): Sequence {
  let bases = ''
  let allFeatures: Feature[] = []
  let offset = 0

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i]

    // For fragments after the first, remove the shared overhang bases from
    // the start. When two compatible sticky-end fragments ligate, the overhang
    // region is shared — it appears at the end of the left fragment and the
    // start of the right fragment. We keep it in the left fragment and trim
    // it from the right.
    let trimLeft = 0
    if (i > 0) {
      const prevFrag = fragments[i - 1]
      const overhangLen = prevFrag.rightOverhangBases.length
      if (overhangLen > 0) {
        trimLeft = overhangLen
      }
    }

    const fragBases = frag.bases.slice(trimLeft)
    bases += fragBases

    for (const f of frag.features) {
      const newStart = f.start - trimLeft + offset
      const newEnd = f.end - trimLeft + offset
      // Skip features that were entirely within the trimmed overhang
      if (newEnd < offset) continue
      allFeatures.push({
        ...f,
        id: uuidv4(),
        start: Math.max(newStart, offset),
        end: newEnd,
      })
    }
    offset += fragBases.length
  }

  // For circular ligation, also trim the overhang shared between the last
  // and first fragment (the closing junction)
  if (circular && fragments.length > 1) {
    const lastFrag = fragments[fragments.length - 1]
    const overhangLen = lastFrag.rightOverhangBases.length
    if (overhangLen > 0 && bases.length > overhangLen) {
      bases = bases.slice(0, bases.length - overhangLen)
      // Adjust features that extend past the new end
      allFeatures = allFeatures.filter((f) => f.start < bases.length)
      allFeatures = allFeatures.map((f) => ({
        ...f,
        end: Math.min(f.end, bases.length - 1),
      }))
    }
  }

  const name = fragments.map((f) => `${f.leftEnzyme}-${f.rightEnzyme}`).join(' + ')

  return makeSequence({
    name: `Ligation product (${bases.length} bp)`,
    description: `Ligation of ${fragments.length} fragment(s): ${name}`,
    bases,
    isCircular: circular,
    features: allFeatures,
  })
}

// ---------------------------------------------------------------------------
// Gibson Assembly
// ---------------------------------------------------------------------------

/**
 * Simulate Gibson Assembly by joining overlapping fragments.
 * Each fragment should have homology arms overlapping with its neighbors.
 */
export function assembleGibson(
  fragments: { bases: string; features: Feature[] }[],
  overlapLength: number = 30,
  isCircular: boolean = true,
): Sequence {
  if (fragments.length === 0) {
    return makeSequence({ name: 'Empty Gibson product', bases: '' })
  }

  if (fragments.length === 1) {
    return makeSequence({
      name: 'Gibson product',
      bases: fragments[0].bases,
      features: fragments[0].features,
    })
  }

  // Join fragments by removing overlapping regions
  let assembled = fragments[0].bases
  let allFeatures: Feature[] = [...fragments[0].features]

  for (let i = 1; i < fragments.length; i++) {
    const prev = assembled.slice(-overlapLength).toUpperCase()
    const curr = fragments[i].bases.slice(0, overlapLength).toUpperCase()

    // Find the best overlap between end of assembled and start of next fragment
    let bestOverlap = 0
    for (let ol = Math.min(overlapLength, assembled.length, fragments[i].bases.length); ol >= 1; ol--) {
      const endOfPrev = assembled.slice(-ol).toUpperCase()
      const startOfCurr = fragments[i].bases.slice(0, ol).toUpperCase()
      if (endOfPrev === startOfCurr) {
        bestOverlap = ol
        break
      }
    }

    const offset = assembled.length - bestOverlap
    const newBases = fragments[i].bases.slice(bestOverlap)
    assembled += newBases

    // Shift features from this fragment
    for (const f of fragments[i].features) {
      allFeatures.push({
        ...f,
        id: uuidv4(),
        start: f.start + offset,
        end: f.end + offset,
      })
    }
  }

  return makeSequence({
    name: `Gibson Assembly product (${assembled.length} bp)`,
    description: `Gibson assembly of ${fragments.length} fragments`,
    bases: assembled,
    isCircular,
    features: allFeatures,
  })
}

// ---------------------------------------------------------------------------
// Cloning Plans
// ---------------------------------------------------------------------------

export function planRestrictionLigation(
  vector: Sequence,
  insert: Sequence,
  enzyme5: string,
  enzyme3: string,
): CloningPlan {
  const steps: CloningStep[] = []

  // Step 1: Digest vector
  const vectorDigest = digestSequence(vector, [enzyme5, enzyme3])
  steps.push({
    id: uuidv4(),
    type: 'digest',
    description: `Digest vector "${vector.name}" with ${enzyme5} and ${enzyme3}`,
    inputSequences: [vector.id],
    outputSequence: vectorDigest.fragments.length > 0
      ? fragmentToSequence(vectorDigest.fragments[0], vector.name)
      : vector,
    parameters: { enzyme5, enzyme3, target: 'vector' },
  })

  // Step 2: Digest insert
  const insertDigest = digestSequence(insert, [enzyme5, enzyme3])
  steps.push({
    id: uuidv4(),
    type: 'digest',
    description: `Digest insert "${insert.name}" with ${enzyme5} and ${enzyme3}`,
    inputSequences: [insert.id],
    outputSequence: insertDigest.fragments.length > 0
      ? fragmentToSequence(insertDigest.fragments[0], insert.name)
      : insert,
    parameters: { enzyme5, enzyme3, target: 'insert' },
  })

  // Step 3: Ligate
  // Select fragments by flanking enzymes for directional cloning.
  // For the vector: we want the backbone fragment — the one bounded by enzyme3
  // on the left and enzyme5 on the right (i.e., it does NOT contain the region
  // between the two enzyme sites; it wraps around the origin for circular vectors).
  // For the insert: the fragment bounded by enzyme5 on the left and enzyme3 on the right.
  const vectorBackbone = (enzyme5 === enzyme3)
    // Single enzyme: for vector take the largest (backbone), for insert take the desired fragment
    ? vectorDigest.fragments[0]
    : vectorDigest.fragments.find(
        (f) => f.leftEnzyme === enzyme3 && f.rightEnzyme === enzyme5,
      ) ?? vectorDigest.fragments.find(
        // Fallback: largest fragment that doesn't have enzyme5 on left + enzyme3 on right
        (f) => !(f.leftEnzyme === enzyme5 && f.rightEnzyme === enzyme3),
      ) ?? vectorDigest.fragments[0]

  const insertFragment = (enzyme5 === enzyme3)
    ? (insertDigest.fragments.length > 1
        // Single enzyme: pick the fragment between the two cut sites
        // For linear insert with N cuts → N+1 fragments; the middle fragment(s) are between cuts
        ? insertDigest.fragments.find(
            (f) => f.leftEnzyme === enzyme5 && f.rightEnzyme === enzyme5 && f.leftEnzyme !== 'end' && f.rightEnzyme !== 'end',
          ) ?? insertDigest.fragments[insertDigest.fragments.length - 1]
        : insertDigest.fragments[0])
    : insertDigest.fragments.find(
        (f) => f.leftEnzyme === enzyme5 && f.rightEnzyme === enzyme3,
      ) ?? insertDigest.fragments.find(
        // Fallback: fragment that isn't the backbone
        (f) => !(f.leftEnzyme === enzyme3 && f.rightEnzyme === enzyme5),
      ) ?? insertDigest.fragments[0]

  const product = ligateFragments(
    [vectorBackbone, insertFragment],
    vector.isCircular,
  )
  product.name = `${vector.name} + ${insert.name}`

  steps.push({
    id: uuidv4(),
    type: 'ligate',
    description: `Ligate vector backbone with insert fragment`,
    inputSequences: [vectorBackbone.id, insertFragment.id],
    outputSequence: product,
    parameters: {},
  })

  // Step 4: Transform
  steps.push({
    id: uuidv4(),
    type: 'transform',
    description: 'Transform ligation product into competent cells',
    inputSequences: [product.id],
    outputSequence: product,
    parameters: {},
  })

  return {
    id: uuidv4(),
    name: `Restriction/Ligation: ${insert.name} into ${vector.name}`,
    method: 'restriction-ligation',
    steps,
    vector,
    insert,
    product,
  }
}

export function planGibsonAssembly(
  fragments: Sequence[],
  overlapLength: number = 30,
): CloningPlan {
  const steps: CloningStep[] = []

  // Step 1: PCR amplify fragments with overlap primers
  for (let i = 0; i < fragments.length; i++) {
    const prev = fragments[(i - 1 + fragments.length) % fragments.length]
    const next = fragments[(i + 1) % fragments.length]
    steps.push({
      id: uuidv4(),
      type: 'pcr',
      description: `PCR amplify "${fragments[i].name}" with ${overlapLength}bp overlap primers`,
      inputSequences: [fragments[i].id],
      outputSequence: fragments[i],
      parameters: {
        overlapLength: String(overlapLength),
        leftOverlapFrom: prev.name,
        rightOverlapFrom: next.name,
      },
    })
  }

  // Step 2: Gibson Assembly reaction
  const product = assembleGibson(
    fragments.map((f) => ({ bases: f.bases, features: f.features })),
    overlapLength,
  )
  product.name = `Gibson Assembly: ${fragments.map((f) => f.name).join(' + ')}`

  steps.push({
    id: uuidv4(),
    type: 'ligate',
    description: `Gibson Assembly reaction (${fragments.length} fragments, ${overlapLength}bp overlaps)`,
    inputSequences: fragments.map((f) => f.id),
    outputSequence: product,
    parameters: { overlapLength: String(overlapLength) },
  })

  // Step 3: Transform
  steps.push({
    id: uuidv4(),
    type: 'transform',
    description: 'Transform Gibson product into competent cells',
    inputSequences: [product.id],
    outputSequence: product,
    parameters: {},
  })

  return {
    id: uuidv4(),
    name: `Gibson Assembly: ${fragments.map((f) => f.name).join(' + ')}`,
    method: 'gibson',
    steps,
    vector: fragments[0],
    insert: fragments.length > 1 ? fragments[1] : fragments[0],
    product,
  }
}

export function planGoldenGate(
  parts: Sequence[],
  enzyme: 'BsaI' | 'BpiI',
): CloningPlan {
  const steps: CloningStep[] = []

  // Step 1: Digest each part with the Type IIS enzyme
  for (const part of parts) {
    steps.push({
      id: uuidv4(),
      type: 'digest',
      description: `Digest "${part.name}" with ${enzyme}`,
      inputSequences: [part.id],
      outputSequence: part,
      parameters: { enzyme },
    })
  }

  // Step 2: Simultaneous digestion + ligation
  // Digest each part with the Type IIS enzyme and extract the inner fragments
  const enzymeObj = TYPE_IIS_ENZYMES.find((e) => e.name === enzyme)
  let assembledBases = ''
  const allFeatures: Feature[] = []
  let offset = 0

  for (const part of parts) {
    if (enzymeObj) {
      const digest = digestSequence(part, [enzyme])
      // Find the fragment between the two cut sites (not the backbone)
      // For Golden Gate parts, the desired insert is typically not the largest fragment
      const innerFragment = digest.fragments.length > 1
        ? digest.fragments.reduce((best, f) => {
            // Prefer fragments that don't contain the recognition site
            const hasRecSite = f.bases.toUpperCase().includes(enzymeObj.recognitionSequence)
            const bestHasRecSite = best.bases.toUpperCase().includes(enzymeObj.recognitionSequence)
            if (!hasRecSite && bestHasRecSite) return f
            if (hasRecSite && !bestHasRecSite) return best
            return f.size < best.size ? f : best
          })
        : digest.fragments[0]

      if (innerFragment) {
        for (const f of innerFragment.features) {
          allFeatures.push({ ...f, id: uuidv4(), start: f.start + offset, end: f.end + offset })
        }
        assembledBases += innerFragment.bases
        offset += innerFragment.bases.length
      }
    } else {
      // Fallback if enzyme not found: use raw bases
      for (const f of part.features) {
        allFeatures.push({ ...f, id: uuidv4(), start: f.start + offset, end: f.end + offset })
      }
      assembledBases += part.bases
      offset += part.bases.length
    }
  }

  const product = makeSequence({
    name: `Golden Gate Assembly: ${parts.map((p) => p.name).join(' + ')}`,
    description: `Golden Gate assembly using ${enzyme}`,
    bases: assembledBases,
    isCircular: true,
    features: allFeatures,
  })

  steps.push({
    id: uuidv4(),
    type: 'ligate',
    description: `Golden Gate one-pot digestion + ligation with ${enzyme} + T4 ligase`,
    inputSequences: parts.map((p) => p.id),
    outputSequence: product,
    parameters: { enzyme },
  })

  // Step 3: Transform
  steps.push({
    id: uuidv4(),
    type: 'transform',
    description: 'Transform Golden Gate product into competent cells',
    inputSequences: [product.id],
    outputSequence: product,
    parameters: {},
  })

  return {
    id: uuidv4(),
    name: `Golden Gate (${enzyme}): ${parts.map((p) => p.name).join(' + ')}`,
    method: 'golden-gate',
    steps,
    vector: parts[0],
    insert: parts.length > 1 ? parts[1] : parts[0],
    product,
  }
}

export function planMutagenesis(
  template: Sequence,
  position: number,
  newBases: string,
): CloningPlan {
  const steps: CloningStep[] = []
  const mutEnd = position + newBases.length - 1

  // Step 1: Design primers
  const primers = designMutagenesisPrimers(
    template.bases,
    position,
    mutEnd,
    newBases,
  )

  steps.push({
    id: uuidv4(),
    type: 'pcr',
    description: `PCR with mutagenic primers (Fwd Tm: ${primers.forwardTm}°C, Rev Tm: ${primers.reverseTm}°C)`,
    inputSequences: [template.id],
    outputSequence: template,
    parameters: {
      forward_primer: primers.forward,
      reverse_primer: primers.reverse,
      forward_tm: String(primers.forwardTm),
      reverse_tm: String(primers.reverseTm),
    },
  })

  // Step 2: DpnI digest to remove template
  steps.push({
    id: uuidv4(),
    type: 'dpni',
    description: 'DpnI digest to remove methylated template DNA',
    inputSequences: [template.id],
    outputSequence: template,
    parameters: {},
  })

  // Step 3: Build mutant product
  const mutBases =
    template.bases.slice(0, position) +
    newBases.toUpperCase() +
    template.bases.slice(mutEnd + 1)

  // Shift features around the mutation
  const features: Feature[] = template.features.map((f) => {
    const shift = newBases.length - (mutEnd - position + 1)
    if (f.end < position) return { ...f, id: uuidv4() }
    if (f.start > mutEnd) {
      return { ...f, id: uuidv4(), start: f.start + shift, end: f.end + shift }
    }
    // Feature overlaps mutation — keep but adjust end
    return {
      ...f,
      id: uuidv4(),
      end: Math.max(f.end + shift, f.start),
    }
  })

  const product = makeSequence({
    name: `${template.name} (mutant)`,
    description: `Site-directed mutagenesis at position ${position + 1}: ${template.bases.slice(position, mutEnd + 1)} → ${newBases.toUpperCase()}`,
    bases: mutBases,
    isCircular: template.isCircular,
    features,
  })

  steps.push({
    id: uuidv4(),
    type: 'transform',
    description: 'Transform mutant plasmid into competent cells',
    inputSequences: [product.id],
    outputSequence: product,
    parameters: {},
  })

  return {
    id: uuidv4(),
    name: `Mutagenesis: ${template.bases.slice(position, mutEnd + 1)} → ${newBases.toUpperCase()} in ${template.name}`,
    method: 'site-directed-mutagenesis',
    steps,
    vector: template,
    insert: template,
    product,
  }
}
