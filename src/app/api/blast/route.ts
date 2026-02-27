import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

const BLAST_API = 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi'
const BLAST_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'CloneWay/1.0 (molecular-biology-editor)',
}

const ALLOWED_PROGRAMS = new Set(['blastn', 'blastp', 'blastx', 'tblastn', 'tblastx'])
const ALLOWED_DATABASES = new Set(['nt', 'nr', 'refseq_rna', 'refseq_protein', 'swissprot', 'pdb', 'est', 'gss'])

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, retryAfterMs } = checkRateLimit(`blast-post:${ip}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    )
  }

  try {
    const body = await req.json()
    const { sequence, program = 'blastn', database = 'nt' } = body

    if (!sequence || typeof sequence !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid sequence' },
        { status: 400 },
      )
    }

    if (sequence.length < 10) {
      return NextResponse.json(
        { error: 'Sequence must be at least 10 bases long' },
        { status: 400 },
      )
    }

    if (!ALLOWED_PROGRAMS.has(program)) {
      return NextResponse.json(
        { error: `Invalid program. Allowed: ${[...ALLOWED_PROGRAMS].join(', ')}` },
        { status: 400 },
      )
    }

    if (!ALLOWED_DATABASES.has(database)) {
      return NextResponse.json(
        { error: `Invalid database. Allowed: ${[...ALLOWED_DATABASES].join(', ')}` },
        { status: 400 },
      )
    }

    const params = new URLSearchParams({
      CMD: 'Put',
      PROGRAM: program,
      DATABASE: database,
      QUERY: sequence,
    })

    const res = await fetch(BLAST_API, {
      method: 'POST',
      headers: BLAST_HEADERS,
      body: params.toString(),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `NCBI returned HTTP ${res.status}` },
        { status: 502 },
      )
    }

    const text = await res.text()

    // Extract RID from response (embedded in HTML)
    const ridMatch = text.match(/RID = (\S+)/)
    if (!ridMatch) {
      return NextResponse.json(
        { error: 'Failed to submit BLAST job — could not extract RID from NCBI response' },
        { status: 502 },
      )
    }

    // Extract estimated time
    const rtoeMatch = text.match(/RTOE = (\d+)/)

    return NextResponse.json({
      rid: ridMatch[1],
      estimatedSeconds: rtoeMatch ? parseInt(rtoeMatch[1], 10) : 30,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, retryAfterMs } = checkRateLimit(`blast-get:${ip}`, 30, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    )
  }

  const rid = req.nextUrl.searchParams.get('rid')

  if (!rid) {
    return NextResponse.json({ error: 'Missing RID' }, { status: 400 })
  }

  try {
    // First check status
    const statusRes = await fetch(
      `${BLAST_API}?CMD=Get&RID=${encodeURIComponent(rid)}&FORMAT_OBJECT=SearchInfo`,
      { headers: { 'User-Agent': BLAST_HEADERS['User-Agent'] } },
    )
    const statusText = await statusRes.text()

    if (statusText.includes('Status=WAITING')) {
      return NextResponse.json({ status: 'waiting' })
    }

    if (statusText.includes('Status=FAILED') || statusText.includes('Status=UNKNOWN')) {
      return NextResponse.json({ status: 'error', error: 'BLAST job failed or expired' })
    }

    if (!statusText.includes('Status=READY')) {
      return NextResponse.json({ status: 'waiting' })
    }

    // Fetch results in JSON format
    const resultRes = await fetch(
      `${BLAST_API}?CMD=Get&RID=${encodeURIComponent(rid)}&FORMAT_TYPE=JSON2_S`,
      { headers: { 'User-Agent': BLAST_HEADERS['User-Agent'] } },
    )
    const resultText = await resultRes.text()

    // Try to parse as JSON
    try {
      const data = JSON.parse(resultText)
      return NextResponse.json({ status: 'ready', data })
    } catch {
      // NCBI sometimes returns HTML instead of JSON when results aren't ready yet
      if (resultText.includes('Status=WAITING') || resultText.includes('<!DOCTYPE')) {
        return NextResponse.json({ status: 'waiting' })
      }
      return NextResponse.json({ status: 'error', error: 'NCBI returned invalid response' })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
