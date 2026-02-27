'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'
import type { AlignmentResult } from '@/services/bio/alignment'

interface AlignmentResultPanelProps {
  result: AlignmentResult
  seq1Name: string
  seq2Name: string
  onClose: () => void
}

const CHARS_PER_ROW = 60

function colorBase(base: string, isMatch: boolean, isGap: boolean): string {
  if (isGap) return 'text-red-400'
  if (isMatch) return 'text-emerald-400'
  return 'text-amber-400'
}

export function AlignmentResultPanel({
  result,
  seq1Name,
  seq2Name,
  onClose,
}: AlignmentResultPanelProps) {
  const blocks = useMemo(() => {
    const rows: {
      seq1: string
      mid: string
      seq2: string
      startPos: number
    }[] = []
    const len = result.alignedSeq1.length

    for (let i = 0; i < len; i += CHARS_PER_ROW) {
      const s1 = result.alignedSeq1.slice(i, i + CHARS_PER_ROW)
      const s2 = result.alignedSeq2.slice(i, i + CHARS_PER_ROW)
      let mid = ''
      for (let j = 0; j < s1.length; j++) {
        if (s1[j] === '-' || s2[j] === '-') {
          mid += ' '
        } else if (s1[j].toUpperCase() === s2[j].toUpperCase()) {
          mid += '|'
        } else {
          mid += '.'
        }
      }
      rows.push({ seq1: s1, mid, seq2: s2, startPos: i })
    }
    return rows
  }, [result])

  return (
    <div className="flex flex-col border-t border-[#e8e5df] bg-[#faf9f5]">
      <div className="flex items-center justify-between border-b border-[#e8e5df] px-4 py-2">
        <div className="flex items-center gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">
            Alignment Result
          </h3>
          <div className="flex gap-3 text-xs text-[#9c9690]">
            <span>
              Score: <span className="text-[#1a1a1a]">{result.score.toFixed(1)}</span>
            </span>
            <span>
              Identity:{' '}
              <span className="text-[#1a1a1a]">{result.identity.toFixed(1)}%</span>
            </span>
            <span>
              Matches: <span className="text-emerald-400">{result.matches}</span>
            </span>
            <span>
              Mismatches: <span className="text-amber-400">{result.mismatches}</span>
            </span>
            <span>
              Gaps: <span className="text-red-400">{result.gaps}</span>
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="max-h-64 overflow-y-auto px-4 py-3">
        <div className="font-mono text-[11px] leading-relaxed">
          {blocks.map((block, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex">
                <span className="mr-3 inline-block w-20 text-right text-[#9c9690] truncate">
                  {seq1Name}
                </span>
                <span>
                  {block.seq1.split('').map((c, i) => {
                    const isGap = c === '-' || block.seq2[i] === '-'
                    const isMatch =
                      !isGap && c.toUpperCase() === block.seq2[i]?.toUpperCase()
                    return (
                      <span key={i} className={colorBase(c, isMatch, isGap)}>
                        {c}
                      </span>
                    )
                  })}
                </span>
              </div>
              <div className="flex">
                <span className="mr-3 inline-block w-20" />
                <span className="text-[#9c9690]">{block.mid}</span>
              </div>
              <div className="flex">
                <span className="mr-3 inline-block w-20 text-right text-[#9c9690] truncate">
                  {seq2Name}
                </span>
                <span>
                  {block.seq2.split('').map((c, i) => {
                    const isGap = c === '-' || block.seq1[i] === '-'
                    const isMatch =
                      !isGap && c.toUpperCase() === block.seq1[i]?.toUpperCase()
                    return (
                      <span key={i} className={colorBase(c, isMatch, isGap)}>
                        {c}
                      </span>
                    )
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
