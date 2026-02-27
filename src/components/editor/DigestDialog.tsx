'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useTabStore } from '@/stores/useTabStore'
import {
  COMMON_ENZYMES,
  findRestrictionSites,
} from '@/services/bio/enzymes'
import { digestSequence, fragmentToSequence } from '@/services/bio/digest'
import type { DigestResult } from '@/services/bio/digest'
import { FlaskConical, Check, ExternalLink } from 'lucide-react'

interface DigestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDigestResult: (result: DigestResult) => void
}

export function DigestDialog({
  open,
  onOpenChange,
  onDigestResult,
}: DigestDialogProps) {
  const sequence = useSequenceStore((s) => s.sequence)
  const [selectedEnzymes, setSelectedEnzymes] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<DigestResult | null>(null)
  const [search, setSearch] = useState('')

  // Enzymes that cut the current sequence
  const availableEnzymes = useMemo(() => {
    if (!sequence) return []
    const results: { name: string; recSeq: string; count: number; overhang: string }[] = []
    for (const enzyme of COMMON_ENZYMES) {
      const sites = findRestrictionSites(sequence.bases, enzyme)
      if (sites.length > 0) {
        results.push({
          name: enzyme.name,
          recSeq: enzyme.recognitionSequence,
          count: sites.length,
          overhang: enzyme.overhang,
        })
      }
    }
    return results.sort((a, b) => a.name.localeCompare(b.name))
  }, [sequence])

  const filteredEnzymes = useMemo(() => {
    if (!search) return availableEnzymes
    const q = search.toLowerCase()
    return availableEnzymes.filter(
      (e) => e.name.toLowerCase().includes(q) || e.recSeq.toLowerCase().includes(q),
    )
  }, [availableEnzymes, search])

  const toggleEnzyme = (name: string) => {
    setSelectedEnzymes((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    setResult(null)
  }

  const handleDigest = () => {
    if (!sequence || selectedEnzymes.size === 0) return
    const digestResult = digestSequence(sequence, Array.from(selectedEnzymes))
    setResult(digestResult)
  }

  const handleShowOnGel = () => {
    if (!result) return
    onDigestResult(result)
    onOpenChange(false)
  }

  const handleOpenFragment = (fragIndex: number) => {
    if (!result) return
    const frag = result.fragments[fragIndex]
    const seq = fragmentToSequence(frag, result.original.name)
    useTabStore.getState().openTab(seq)
  }

  const handleReset = () => {
    setResult(null)
    setSelectedEnzymes(new Set())
    setSearch('')
  }

  const overhangLabel = (o: string) =>
    o === 'blunt' ? 'blunt' : o === '5prime' ? "5'" : "3'"

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleReset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1a1a1a]">
          <FlaskConical className="h-5 w-5 text-emerald-500" />
          Restriction Digest
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Select enzymes to digest the sequence. Fragments inherit annotated features.
        </DialogDescription>

        {!result ? (
          /* Enzyme selection */
          <div className="mt-3 flex flex-1 flex-col overflow-hidden">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search enzymes..."
              className="mb-2 w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-1.5 text-xs text-[#1a1a1a] placeholder:text-[#9c9690] focus:outline-none focus:border-emerald-400"
            />
            <div className="flex-1 overflow-y-auto rounded-md border border-[#e8e5df] max-h-60">
              {filteredEnzymes.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-[#9c9690]">
                  {availableEnzymes.length === 0
                    ? 'No restriction sites found in this sequence'
                    : 'No enzymes match your search'}
                </div>
              ) : (
                filteredEnzymes.map((e) => (
                  <label
                    key={e.name}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#f5f3ee] ${
                      selectedEnzymes.has(e.name) ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEnzymes.has(e.name)}
                      onChange={() => toggleEnzyme(e.name)}
                      className="accent-emerald-500"
                    />
                    <span className="font-mono font-medium text-[#1a1a1a]">{e.name}</span>
                    <span className="font-mono text-[10px] text-[#9c9690]">{e.recSeq}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className={`rounded px-1 py-0.5 text-[10px] ${
                        e.overhang === 'blunt'
                          ? 'bg-gray-100 text-gray-600'
                          : e.overhang === '5prime'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-amber-50 text-amber-600'
                      }`}>
                        {overhangLabel(e.overhang)}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        e.count === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f5f3ee] text-[#6b6560]'
                      }`}>
                        {e.count}×
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            {selectedEnzymes.size > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#6b6560]">
                <span>{selectedEnzymes.size} enzyme{selectedEnzymes.size > 1 ? 's' : ''} selected</span>
                <button
                  onClick={() => { setSelectedEnzymes(new Set()); setResult(null) }}
                  className="text-red-400 hover:text-red-500"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDigest}
                disabled={selectedEnzymes.size === 0}
              >
                <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                Digest
              </Button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="mt-3 flex flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              <span>
                {result.fragments.length} fragment{result.fragments.length > 1 ? 's' : ''} generated
                {' '}using {result.enzymes.join(', ')}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border border-[#e8e5df] max-h-60">
              {result.fragments.map((frag, i) => (
                <div
                  key={frag.id}
                  className="flex items-center gap-2 border-b border-[#e8e5df] px-3 py-2 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-[#1a1a1a]">
                        {frag.size.toLocaleString()} bp
                      </span>
                      {frag.features.length > 0 && (
                        <span className="rounded bg-[#f5f3ee] px-1 py-0.5 text-[10px] text-[#6b6560]">
                          {frag.features.length} feature{frag.features.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#9c9690]">
                      {frag.leftEnzyme}
                      {frag.leftOverhang !== 'blunt' && (
                        <span className="text-blue-400"> ({overhangLabel(frag.leftOverhang)}: {frag.leftOverhangBases || '–'})</span>
                      )}
                      {' → '}
                      {frag.rightEnzyme}
                      {frag.rightOverhang !== 'blunt' && (
                        <span className="text-blue-400"> ({overhangLabel(frag.rightOverhang)}: {frag.rightOverhangBases || '–'})</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenFragment(i)}
                    title="Open fragment as new tab"
                    className="h-7 gap-1 text-[10px]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                New Digest
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={handleShowOnGel}>
                  Show on Gel
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
