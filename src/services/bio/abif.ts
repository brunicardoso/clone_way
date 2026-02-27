export interface ChromatogramData {
  name: string
  baseCalls: string
  basePositions: number[]
  traceA: number[]
  traceC: number[]
  traceG: number[]
  traceT: number[]
  qualityValues: number[]
}

interface DirEntry {
  tagName: string
  tagNum: number
  elementType: number
  elementSize: number
  numElements: number
  dataSize: number
  dataOffset: number
}

export function parseABIF(buffer: ArrayBuffer, filename?: string): ChromatogramData {
  const view = new DataView(buffer)

  // Validate magic bytes "ABIF"
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  )
  if (magic !== 'ABIF') {
    throw new Error('Invalid ABIF file: missing magic header')
  }

  // Read header directory entry (at offset 6)
  const numEntries = view.getInt32(18, false) // big-endian
  const dirOffset = view.getInt32(26, false)

  // Parse directory entries
  const entries: DirEntry[] = []
  for (let i = 0; i < numEntries; i++) {
    const offset = dirOffset + i * 28
    const tagName = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    )
    const tagNum = view.getInt32(offset + 4, false)
    const elementType = view.getInt16(offset + 8, false)
    const elementSize = view.getInt16(offset + 10, false)
    const numElements = view.getInt32(offset + 12, false)
    const dataSize = view.getInt32(offset + 16, false)
    const dataOffset =
      dataSize <= 4 ? offset + 20 : view.getInt32(offset + 20, false)

    entries.push({
      tagName,
      tagNum,
      elementType,
      elementSize,
      numElements,
      dataSize,
      dataOffset,
    })
  }

  const findEntry = (tag: string, num: number): DirEntry | undefined =>
    entries.find((e) => e.tagName === tag && e.tagNum === num)

  // Determine base-to-channel mapping via FWO_ (filter wheel order) tag
  const fwoEntry = findEntry('FWO_', 1)
  let channelOrder = 'ACGT' // default if FWO_ not found
  if (fwoEntry) {
    const fwo = readString(view, fwoEntry)
    if (fwo.length >= 4) channelOrder = fwo.slice(0, 4).toUpperCase()
  }

  // Read processed traces (DATA 9-12) mapped by FWO_ order
  const processedTraces: Record<string, number[]> = {}
  for (let ch = 0; ch < 4; ch++) {
    processedTraces[channelOrder[ch]] = readInt16Array(view, findEntry('DATA', 9 + ch))
  }

  // Fallback to raw traces (DATA 1-4) if processed not available
  const rawTraces: Record<string, number[]> = {}
  for (let ch = 0; ch < 4; ch++) {
    rawTraces[channelOrder[ch]] = readInt16Array(view, findEntry('DATA', 1 + ch))
  }

  const finalA = (processedTraces['A']?.length ?? 0) > 0 ? processedTraces['A'] : (rawTraces['A'] ?? [])
  const finalC = (processedTraces['C']?.length ?? 0) > 0 ? processedTraces['C'] : (rawTraces['C'] ?? [])
  const finalG = (processedTraces['G']?.length ?? 0) > 0 ? processedTraces['G'] : (rawTraces['G'] ?? [])
  const finalT = (processedTraces['T']?.length ?? 0) > 0 ? processedTraces['T'] : (rawTraces['T'] ?? [])

  // Extract base calls (PBAS.1 or PBAS.2)
  let baseCalls = readString(view, findEntry('PBAS', 2))
  if (!baseCalls) baseCalls = readString(view, findEntry('PBAS', 1))

  // Extract base positions (PLOC.1 or PLOC.2)
  let basePositions = readInt16Array(view, findEntry('PLOC', 2))
  if (basePositions.length === 0)
    basePositions = readInt16Array(view, findEntry('PLOC', 1))

  // Extract quality values (PCON.1 or PCON.2)
  let qualityValues = readUint8Array(view, findEntry('PCON', 2))
  if (qualityValues.length === 0)
    qualityValues = readUint8Array(view, findEntry('PCON', 1))

  // Extract sample name
  let name = readString(view, findEntry('SMPL', 1))
  if (!name) name = filename?.replace(/\.(ab1|abi)$/i, '') || 'Chromatogram'

  return {
    name,
    baseCalls,
    basePositions,
    traceA: finalA,
    traceC: finalC,
    traceG: finalG,
    traceT: finalT,
    qualityValues,
  }
}

function readInt16Array(view: DataView, entry?: DirEntry): number[] {
  if (!entry) return []
  const result: number[] = []
  const byteLen = view.byteLength
  for (let i = 0; i < entry.numElements; i++) {
    const off = entry.dataOffset + i * 2
    if (off + 1 >= byteLen) break
    result.push(view.getInt16(off, false))
  }
  return result
}

function readUint8Array(view: DataView, entry?: DirEntry): number[] {
  if (!entry) return []
  const result: number[] = []
  const byteLen = view.byteLength
  for (let i = 0; i < entry.numElements; i++) {
    const off = entry.dataOffset + i
    if (off >= byteLen) break
    result.push(view.getUint8(off))
  }
  return result
}

function readString(view: DataView, entry?: DirEntry): string {
  if (!entry) return ''
  const byteLen = view.byteLength
  // elementType 18 = Pascal string (first byte is length)
  let startOffset = entry.dataOffset
  let count = entry.numElements
  if (entry.elementType === 18 && count > 0) {
    startOffset += 1
    count -= 1
  }
  let str = ''
  for (let i = 0; i < count; i++) {
    const off = startOffset + i
    if (off >= byteLen) break
    str += String.fromCharCode(view.getUint8(off))
  }
  return str
}
