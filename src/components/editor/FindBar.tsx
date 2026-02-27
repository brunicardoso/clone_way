'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'

interface FindBarProps {
  open: boolean
  onClose: () => void
}

export function FindBar({ open, onClose }: FindBarProps) {
  const [query, setQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [matches, setMatches] = useState<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const sequence = useSequenceStore((s) => s.sequence)
  const setSelectedRange = useEditorStore((s) => s.setSelectedRange)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      // Small delay so the DOM renders first
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setQuery('')
      setMatches([])
      setMatchIndex(0)
    }
  }, [open])

  // Find all matches when query changes
  useEffect(() => {
    if (!sequence || query.length === 0) {
      setMatches([])
      setMatchIndex(0)
      return
    }

    const upper = sequence.bases.toUpperCase()
    const q = query.toUpperCase().replace(/[^ATGCNRYSWKMBDHV]/g, '')
    if (q.length === 0) {
      setMatches([])
      setMatchIndex(0)
      return
    }

    // Convert IUPAC codes to regex pattern
    const IUPAC: Record<string, string> = {
      A: 'A', T: 'T', C: 'C', G: 'G',
      R: '[AG]', Y: '[CT]', S: '[GC]', W: '[AT]',
      K: '[GT]', M: '[AC]', B: '[CGT]', D: '[AGT]',
      H: '[ACT]', V: '[ACG]', N: '[ACGT]',
    }
    const pattern = q.split('').map((ch) => IUPAC[ch] ?? ch).join('')
    const regex = new RegExp(pattern, 'g')

    // For circular sequences, search across the origin
    const searchStr = sequence.isCircular && q.length > 1
      ? upper + upper.slice(0, q.length - 1)
      : upper

    const found: number[] = []
    let match: RegExpExecArray | null
    while ((match = regex.exec(searchStr)) !== null) {
      if (match.index >= upper.length) break // don't duplicate matches from wrap extension
      found.push(match.index)
      regex.lastIndex = match.index + 1
    }

    setMatches(found)
    setMatchIndex(0)

    // Select first match
    if (found.length > 0) {
      setSelectedRange({
        start: found[0],
        end: found[0] + q.length - 1,
        wrapsAround: false,
      })
    }
  }, [query, sequence, setSelectedRange])

  const navigateMatch = useCallback(
    (direction: 1 | -1) => {
      if (matches.length === 0) return
      const q = query.toUpperCase().replace(/[^ATGCNRYSWKMBDHV]/g, '')
      const next =
        (matchIndex + direction + matches.length) % matches.length
      setMatchIndex(next)
      setSelectedRange({
        start: matches[next],
        end: matches[next] + q.length - 1,
        wrapsAround: false,
      })

      // Scroll the match into view
      const el = document.querySelector('.cyw-match-active')
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    },
    [matches, matchIndex, query, setSelectedRange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        navigateMatch(e.shiftKey ? -1 : 1)
      }
    },
    [onClose, navigateMatch],
  )

  if (!open) return null

  return (
    <div className="absolute top-0 right-0 z-20 flex items-center gap-2 rounded-bl-lg border-b border-l border-[#e8e5df] bg-white px-3 py-2 shadow-md">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find sequence (e.g. GAATTC)..."
        className="w-52 rounded border border-[#e8e5df] bg-[#f5f3ee] px-2 py-1 font-mono text-xs text-[#1a1a1a] placeholder:text-[#9c9690] focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <span className="min-w-[60px] text-center text-[10px] text-[#9c9690]">
        {matches.length > 0
          ? `${matchIndex + 1} / ${matches.length}`
          : query.length > 0
            ? 'No matches'
            : ''}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateMatch(-1)}
        disabled={matches.length === 0}
        title="Previous match (Shift+Enter)"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateMatch(1)}
        disabled={matches.length === 0}
        title="Next match (Enter)"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onClose} title="Close (Esc)">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
