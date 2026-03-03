import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, retryAfterMs } = checkRateLimit(`ncbi:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    )
  }

  const id = request.nextUrl.searchParams.get('id')

  if (!id || !/^[A-Za-z]{1,6}_?\d+(\.\d+)?$/.test(id)) {
    return NextResponse.json(
      { error: 'Invalid accession number. Expected format: e.g. NM_001301717, MN908947, U49845' },
      { status: 400 },
    )
  }

  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=${encodeURIComponent(id)}&rettype=gb&retmode=text`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'CYW-CloneYourWay/1.0 (molecular biology tool; contact: open-source)',
      },
    })

    if (!res.ok) {
      if (res.status === 400 || res.status === 404) {
        return NextResponse.json(
          { error: `Accession "${id}" not found in NCBI nucleotide database.` },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { error: `NCBI returned status ${res.status}` },
        { status: 502 },
      )
    }

    const genbank = await res.text()

    // NCBI returns error messages as plain text when accession is not found
    if (!genbank.startsWith('LOCUS')) {
      return NextResponse.json(
        { error: `Accession "${id}" not found in NCBI nucleotide database.` },
        { status: 404 },
      )
    }

    // Extract name from LOCUS line
    const locusMatch = genbank.match(/^LOCUS\s+(\S+)/)
    const name = locusMatch?.[1] || id

    return NextResponse.json({
      name,
      genbank,
      format: 'genbank',
      accessionId: id,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to fetch from NCBI: ${err instanceof Error ? err.message : 'Unknown error'}`,
      },
      { status: 500 },
    )
  }
}
