import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)'

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, retryAfterMs } = checkRateLimit(
    `addgene:${ip}`,
    10,
    60_000,
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      },
    )
  }

  const id = request.nextUrl.searchParams.get('id')

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: 'Invalid Addgene plasmid ID. Must be a number.' },
      { status: 400 },
    )
  }

  try {
    // Step 1: Fetch the main plasmid page to get cookies and extract sequence IDs
    const pageUrl = `https://www.addgene.org/${id}/`
    const pageRes = await fetch(pageUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': UA },
    })

    if (!pageRes.ok) {
      if (pageRes.status === 404) {
        return NextResponse.json(
          { error: `Plasmid #${id} not found on Addgene.` },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { error: `Addgene returned status ${pageRes.status}` },
        { status: 502 },
      )
    }

    // Extract cookies to forward to CDN requests
    const setCookies = pageRes.headers.getSetCookie?.() ?? []
    const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ')

    const html = await pageRes.text()

    // Extract plasmid name from page title: "Addgene: <name>"
    const titleMatch = html.match(/<title>Addgene:\s*(.*?)<\/title>/)
    const plasmidName = titleMatch?.[1]?.trim() || `Addgene_${id}`

    // Step 2: Extract sequence object IDs from the page (snapgene-NNNN pattern)
    const seqIds = [...new Set(html.match(/snapgene-(\d+)/g))]
      .map((m) => m.replace('snapgene-', ''))

    if (seqIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'No sequence data found for this plasmid. The depositor may not have provided a full sequence.',
        },
        { status: 404 },
      )
    }

    // Step 3: For each sequence ID, call the file-collection API to get the GenBank CDN URL
    for (const seqId of seqIds) {
      try {
        const apiRes = await fetch(
          `https://www.addgene.org/api/get-sequence-file-collection/${seqId}/`,
          {
            cache: 'no-store',
            headers: { 'User-Agent': UA },
          },
        )
        if (!apiRes.ok) continue

        const data = await apiRes.json()
        const gbkUrl = data.genbankUrl
        if (!gbkUrl || data.inProgress) continue

        // Step 4: Download GenBank from CDN (requires cookies from page request)
        const gbkRes = await fetch(gbkUrl, {
          cache: 'no-store',
          headers: {
            'User-Agent': UA,
            Referer: pageUrl,
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        })

        if (!gbkRes.ok) continue
        const genbank = await gbkRes.text()
        if (!genbank.trimStart().startsWith('LOCUS')) continue

        return NextResponse.json({
          name: plasmidName,
          genbank,
          format: 'genbank',
          addgeneId: id,
        })
      } catch {
        // Try next sequence ID
      }
    }

    return NextResponse.json(
      {
        error:
          'No sequence data found for this plasmid. The depositor may not have provided a full sequence.',
      },
      { status: 404 },
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to fetch from Addgene: ${err instanceof Error ? err.message : 'Unknown error'}`,
      },
      { status: 500 },
    )
  }
}
