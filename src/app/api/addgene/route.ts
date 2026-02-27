import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, retryAfterMs } = checkRateLimit(`addgene:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
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
    const pageUrl = `https://www.addgene.org/${id}/sequences/`
    const pageRes = await fetch(pageUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
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

    // Extract cookies from page response to forward to CDN requests
    const setCookies = pageRes.headers.getSetCookie?.() ?? []
    const cookieHeader = setCookies
      .map((c) => c.split(';')[0])
      .join('; ')

    const html = await pageRes.text()

    // Extract the plasmid name from the page HTML
    const titleMatch = html.match(
      /<h1[^>]*class="material-name"[^>]*>\s*(.*?)\s*<\/h1>/,
    )
    const plasmidName =
      titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || `Addgene_${id}`

    // Strategy 1: Try to download GenBank files from the CDN (try all matches)
    const gbkMatches = html.matchAll(
      /https:\/\/media\.addgene\.org\/snapgene-media\/[^"'\s]+\.gbk/g,
    )

    for (const gbkMatch of gbkMatches) {
      try {
        const gbkRes = await fetch(gbkMatch[0], {
          cache: 'no-store',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)',
            Referer: pageUrl,
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        })

        if (gbkRes.ok) {
          const genbank = await gbkRes.text()
          if (genbank.startsWith('LOCUS')) {
            return NextResponse.json({
              name: plasmidName,
              genbank,
              format: 'genbank',
              addgeneId: id,
            })
          }
        }
      } catch {
        // CDN download failed, try next URL
      }
    }

    // Strategy 2: Extract FASTA sequence from the page HTML
    const fastaMatch = html.match(
      /id="sequence-(\d+)-text"[^>]*>([\s\S]*?)<\/textarea>/,
    )

    if (fastaMatch) {
      const rawFasta = fastaMatch[2]
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .trim()

      if (rawFasta) {
        return NextResponse.json({
          name: plasmidName,
          genbank: rawFasta, // kept as 'genbank' for backward compat with client
          fasta: rawFasta,
          format: 'fasta',
          addgeneId: id,
        })
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
