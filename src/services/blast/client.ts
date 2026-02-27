export interface BlastHit {
  accession: string
  title: string
  eValue: number
  bitScore: number
  identity: number
  queryStart: number
  queryEnd: number
  subjectStart: number
  subjectEnd: number
  alignedQuery: string
  alignedSubject: string
  midline: string
}

export interface BlastResult {
  rid: string
  hits: BlastHit[]
  database: string
  program: string
}

export async function submitBlast(
  sequence: string,
  options?: { program?: string; database?: string },
): Promise<{ rid: string; estimatedSeconds: number }> {
  const res = await fetch('/api/blast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sequence,
      program: options?.program || 'blastn',
      database: options?.database || 'nt',
    }),
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Failed to submit BLAST job')
  }

  return { rid: data.rid, estimatedSeconds: data.estimatedSeconds }
}

export async function pollBlastResults(
  rid: string,
): Promise<{
  status: 'waiting' | 'ready' | 'error'
  result?: BlastResult
  error?: string
}> {
  const res = await fetch(`/api/blast?rid=${encodeURIComponent(rid)}`)
  const data = await res.json()

  if (data.status === 'waiting') {
    return { status: 'waiting' }
  }

  if (data.status === 'error') {
    return { status: 'error', error: data.error }
  }

  if (data.status === 'ready') {
    if (data.data) {
      const hits = parseBlastResults(data.data)
      return {
        status: 'ready',
        result: {
          rid,
          hits,
          database: 'nt',
          program: 'blastn',
        },
      }
    }
    // Server returned 'ready' but no parseable data
    return {
      status: 'ready',
      result: { rid, hits: [], database: 'nt', program: 'blastn' },
    }
  }

  if (data.status === 'error') {
    return { status: 'error', error: data.error || 'BLAST search failed' }
  }

  return { status: 'waiting' }
}

function parseBlastResults(data: unknown): BlastHit[] {
  const hits: BlastHit[] = []

  try {
    // Navigate the NCBI JSON2_S response structure
    // Shape: { BlastOutput2: [{ report: { results: { search: { hits: [...] } } } }] }
    const root = data as Record<string, unknown>
    const blastOutput2 = root?.BlastOutput2

    // BlastOutput2 is an array; take the first element
    const entry = Array.isArray(blastOutput2)
      ? (blastOutput2[0] as Record<string, unknown>)
      : (blastOutput2 as Record<string, unknown>)

    const report = entry?.report as Record<string, unknown> | undefined
    const results = report?.results as Record<string, unknown> | undefined
    const search = results?.search as Record<string, unknown> | undefined
    const searchHits = search?.hits as unknown[] | undefined

    if (!Array.isArray(searchHits)) return hits

    for (const hit of searchHits) {
      const h = hit as Record<string, unknown>
      const desc = (h.description as Record<string, unknown>[])?.[0] ?? {}
      const hsps = h.hsps as Record<string, unknown>[] | undefined
      if (!hsps || hsps.length === 0) continue
      const hsp = hsps[0]

      hits.push({
        accession: (desc.accession as string) ?? '',
        title: (desc.title as string) ?? 'Unknown',
        eValue: (hsp.evalue as number) ?? 0,
        bitScore: (hsp.bit_score as number) ?? 0,
        identity:
          hsp.identity && hsp.align_len
            ? ((hsp.identity as number) / (hsp.align_len as number)) * 100
            : 0,
        queryStart: (hsp.query_from as number) ?? 0,
        queryEnd: (hsp.query_to as number) ?? 0,
        subjectStart: (hsp.hit_from as number) ?? 0,
        subjectEnd: (hsp.hit_to as number) ?? 0,
        alignedQuery: (hsp.qseq as string) ?? '',
        alignedSubject: (hsp.hseq as string) ?? '',
        midline: (hsp.midline as string) ?? '',
      })
    }
  } catch {
    // Return empty hits if parsing fails
  }

  return hits
}
