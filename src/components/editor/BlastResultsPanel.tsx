'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { pollBlastResults, type BlastResult, type BlastHit } from '@/services/blast/client'

interface BlastResultsPanelProps {
  rid: string
  onClose: () => void
}

export function BlastResultsPanel({ rid, onClose }: BlastResultsPanelProps) {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'error'>('waiting')
  const [result, setResult] = useState<BlastResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [expandedHit, setExpandedHit] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await pollBlastResults(rid)
      if (res.status === 'ready' && res.result) {
        setStatus('ready')
        setResult(res.result)
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (timerRef.current) clearInterval(timerRef.current)
      } else if (res.status === 'error') {
        setStatus('error')
        setError(res.error || 'BLAST search failed')
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Polling failed')
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [rid])

  useEffect(() => {
    // Start polling every 10s (NCBI recommends not polling too frequently)
    poll()
    intervalRef.current = setInterval(poll, 10000)
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)

    // Timeout after 10 minutes
    const timeout = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      setStatus((prev) => {
        if (prev === 'waiting') {
          setError('BLAST search timed out after 10 minutes. The job may still be running — try again later.')
          return 'error'
        }
        return prev
      })
    }, 600000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      clearTimeout(timeout)
    }
  }, [poll])

  const toggleHit = (accession: string) => {
    setExpandedHit((prev) => (prev === accession ? null : accession))
  }

  return (
    <div className="flex flex-col border-t border-[#e8e5df] bg-[#faf9f5]">
      <div className="flex items-center justify-between border-b border-[#e8e5df] px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">
            BLAST Results
          </h3>
          {status === 'waiting' && (
            <span className="flex items-center gap-2 text-xs text-[#9c9690]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching... ({elapsed}s)
            </span>
          )}
          {status === 'ready' && result && (
            <span className="text-xs text-[#9c9690]">
              {result.hits.length} hit{result.hits.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {status === 'error' && (
          <p className="px-4 py-4 text-sm text-red-400">
            {error || 'BLAST search failed'}
          </p>
        )}

        {status === 'waiting' && (
          <div className="px-4 py-6 text-center text-xs text-[#9c9690]">
            BLAST searches typically take 30 seconds to a few minutes.
          </div>
        )}

        {status === 'ready' && result && result.hits.length === 0 && (
          <p className="px-4 py-4 text-center text-xs text-[#9c9690]">
            No significant hits found.
          </p>
        )}

        {status === 'ready' && result && result.hits.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#e8e5df] text-left text-[#9c9690]">
                <th className="px-4 py-2 font-medium"></th>
                <th className="px-2 py-2 font-medium">Accession</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium text-right">E-value</th>
                <th className="px-2 py-2 font-medium text-right">Bit Score</th>
                <th className="px-2 py-2 font-medium text-right">Identity</th>
              </tr>
            </thead>
            <tbody>
              {result.hits.map((hit, idx) => (
                <HitRow
                  key={`${hit.accession}-${idx}`}
                  hit={hit}
                  expanded={expandedHit === `${hit.accession}-${idx}`}
                  onToggle={() => toggleHit(`${hit.accession}-${idx}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function HitRow({
  hit,
  expanded,
  onToggle,
}: {
  hit: BlastHit
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-[#e8e5df] hover:bg-[#eae7e1]"
        onClick={onToggle}
      >
        <td className="px-4 py-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-[#9c9690]" />
          ) : (
            <ChevronRight className="h-3 w-3 text-[#9c9690]" />
          )}
        </td>
        <td className="px-2 py-2 font-mono text-emerald-400">
          {hit.accession}
        </td>
        <td className="max-w-xs truncate px-2 py-2 text-[#1a1a1a]">
          {hit.title}
        </td>
        <td className="px-2 py-2 text-right text-[#6b6560]">
          {hit.eValue.toExponential(1)}
        </td>
        <td className="px-2 py-2 text-right text-[#6b6560]">
          {hit.bitScore.toFixed(1)}
        </td>
        <td className="px-2 py-2 text-right text-[#6b6560]">
          {hit.identity.toFixed(1)}%
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[#e8e5df]">
          <td colSpan={6} className="px-4 py-3">
            <div className="font-mono text-[10px] leading-relaxed">
              <div className="text-[#9c9690]">
                Query: {hit.queryStart}..{hit.queryEnd} | Subject:{' '}
                {hit.subjectStart}..{hit.subjectEnd}
              </div>
              <div className="mt-2 space-y-0.5">
                <div className="text-[#1a1a1a]">
                  Query&nbsp;&nbsp; {hit.alignedQuery}
                </div>
                <div className="text-[#9c9690]">
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {hit.midline}
                </div>
                <div className="text-[#1a1a1a]">
                  Subject {hit.alignedSubject}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
