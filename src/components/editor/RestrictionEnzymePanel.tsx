'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { X, ChevronUp, ChevronDown, Eye, EyeOff, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import {
  COMMON_ENZYMES,
  findRestrictionSites,
} from '@/services/bio/enzymes'
import type { RestrictionSite } from '@/types'

interface RestrictionEnzymePanelProps {
  onClose: () => void
}

export function RestrictionEnzymePanel({ onClose }: RestrictionEnzymePanelProps) {
  const [search, setSearch] = useState('')
  const [selectedEnzyme, setSelectedEnzyme] = useState<string | null>(null)
  const [siteIndex, setSiteIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const sequence = useSequenceStore((s) => s.sequence)
  const setSelectedRange = useEditorStore((s) => s.setSelectedRange)
  const selectedEnzymes = useEditorStore((s) => s.selectedEnzymes)
  const toggleEnzymeSelection = useEditorStore((s) => s.toggleEnzymeSelection)
  const setSelectedEnzymes = useEditorStore((s) => s.setSelectedEnzymes)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  // Enzymes present in the current sequence
  const enzymesInSequence = useMemo(() => {
    if (!sequence) return []
    const results: { name: string; recSeq: string; count: number; sites: RestrictionSite[] }[] = []
    for (const enzyme of COMMON_ENZYMES) {
      const sites = findRestrictionSites(sequence.bases, enzyme)
      if (sites.length > 0) {
        results.push({
          name: enzyme.name,
          recSeq: enzyme.recognitionSequence,
          count: sites.length,
          sites,
        })
      }
    }
    return results.sort((a, b) => a.name.localeCompare(b.name))
  }, [sequence])

  // Filtered list based on search
  const filteredEnzymes = useMemo(() => {
    if (!search) return enzymesInSequence
    const q = search.toLowerCase()
    return enzymesInSequence.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.recSeq.toLowerCase().includes(q),
    )
  }, [enzymesInSequence, search])

  // All enzymes not in sequence, for reference
  const absentEnzymes = useMemo(() => {
    if (!search) return []
    const q = search.toLowerCase()
    const inSeqNames = new Set(enzymesInSequence.map((e) => e.name))
    return COMMON_ENZYMES.filter(
      (e) => e.name.toLowerCase().includes(q) && !inSeqNames.has(e.name),
    )
  }, [search, enzymesInSequence])

  // Sites for the currently selected enzyme
  const currentSites = useMemo(() => {
    if (!selectedEnzyme) return []
    const found = enzymesInSequence.find((e) => e.name === selectedEnzyme)
    return found?.sites ?? []
  }, [selectedEnzyme, enzymesInSequence])

  // Recompute restriction sites from selected enzymes and update the sequence store
  const recomputeSites = useCallback(
    (enzymeNames: Set<string>) => {
      if (!sequence) return
      const allSites: RestrictionSite[] = []
      for (const enzyme of COMMON_ENZYMES) {
        if (enzymeNames.has(enzyme.name)) {
          const sites = findRestrictionSites(sequence.bases, enzyme)
          allSites.push(...sites)
        }
      }
      useSequenceStore.getState().updateRestrictionSites(allSites)
    },
    [sequence],
  )

  const navigateToSite = useCallback(
    (sites: RestrictionSite[], index: number) => {
      if (sites.length === 0) return
      const site = sites[index]
      const len = site.recognitionSequence.length
      setSelectedRange({
        start: site.position,
        end: site.position + len - 1,
        wrapsAround: false,
      })
    },
    [setSelectedRange],
  )

  const selectEnzyme = useCallback(
    (name: string) => {
      setSelectedEnzyme(name)
      setSiteIndex(0)
      const found = enzymesInSequence.find((e) => e.name === name)
      if (found && found.sites.length > 0) {
        navigateToSite(found.sites, 0)
      }
    },
    [enzymesInSequence, navigateToSite],
  )

  const navigateSite = useCallback(
    (direction: 1 | -1) => {
      if (currentSites.length === 0) return
      const next = (siteIndex + direction + currentSites.length) % currentSites.length
      setSiteIndex(next)
      navigateToSite(currentSites, next)
    },
    [currentSites, siteIndex, navigateToSite],
  )

  const handleToggleEnzyme = useCallback(
    (name: string) => {
      const next = new Set(selectedEnzymes)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      setSelectedEnzymes(next)
      recomputeSites(next)
    },
    [selectedEnzymes, setSelectedEnzymes, recomputeSites],
  )

  const handleHighlightAll = useCallback(() => {
    if (!sequence) return
    const allNames = new Set(enzymesInSequence.map((e) => e.name))
    setSelectedEnzymes(allNames)
    recomputeSites(allNames)
  }, [sequence, enzymesInSequence, setSelectedEnzymes, recomputeSites])

  const handleHideAll = useCallback(() => {
    setSelectedEnzymes(new Set())
    useSequenceStore.getState().updateRestrictionSites([])
  }, [setSelectedEnzymes])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && selectedEnzyme) {
        e.preventDefault()
        navigateSite(e.shiftKey ? -1 : 1)
      }
    },
    [onClose, selectedEnzyme, navigateSite],
  )

  const checkedCount = selectedEnzymes.size

  return (
    <div className="absolute left-10 top-0 z-30 flex h-full w-72 flex-col border-r border-[#e8e5df] bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8e5df] px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">
          Restriction Enzymes
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Highlight / Hide buttons */}
      <div className="flex gap-1.5 border-b border-[#e8e5df] px-3 py-2">
        <button
          onClick={handleHighlightAll}
          disabled={!sequence}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#f5f3ee] px-2 py-1.5 text-xs font-medium text-[#1a1a1a] hover:bg-[#eae7e1] disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5 text-emerald-500" />
          Show all
        </button>
        <button
          onClick={handleHideAll}
          disabled={!sequence || checkedCount === 0}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#f5f3ee] px-2 py-1.5 text-xs font-medium text-[#1a1a1a] hover:bg-[#eae7e1] disabled:opacity-50"
        >
          <EyeOff className="h-3.5 w-3.5 text-[#9c9690]" />
          Hide all
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-[#e8e5df] px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#9c9690]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedEnzyme(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search enzyme or sequence..."
            className="w-full bg-transparent py-1.5 font-mono text-xs text-[#1a1a1a] placeholder:text-[#9c9690] focus:outline-none"
          />
        </div>
        {checkedCount > 0 && (
          <div className="mt-1.5 text-[10px] text-emerald-600">
            {checkedCount} enzyme{checkedCount !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Navigation bar when an enzyme is selected */}
      {selectedEnzyme && (
        <div className="flex items-center justify-between border-b border-[#e8e5df] bg-emerald-50 px-3 py-1.5">
          <span className="font-mono text-xs font-semibold text-emerald-700">
            {selectedEnzyme}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-emerald-600">
              {currentSites.length > 0
                ? `${siteIndex + 1} / ${currentSites.length}`
                : '0 sites'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateSite(-1)}
              disabled={currentSites.length === 0}
              className="h-6 w-6"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateSite(1)}
              disabled={currentSites.length === 0}
              className="h-6 w-6"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Enzyme list */}
      <div className="flex-1 overflow-y-auto">
        {filteredEnzymes.length > 0 && (
          <div>
            <div className="sticky top-0 bg-[#f5f3ee] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9c9690]">
              Found in sequence ({filteredEnzymes.length})
            </div>
            {filteredEnzymes.map((e) => {
              const isChecked = selectedEnzymes.has(e.name)
              return (
                <div
                  key={e.name}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[#f5f3ee] ${
                    selectedEnzyme === e.name ? 'bg-emerald-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleEnzyme(e.name)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-[#e8e5df] text-emerald-500 accent-emerald-500"
                  />
                  <button
                    onClick={() => selectEnzyme(e.name)}
                    className="flex flex-1 items-center justify-between text-left"
                  >
                    <div className="flex flex-col">
                      <span className={`font-mono font-medium ${selectedEnzyme === e.name ? 'text-emerald-700' : 'text-[#1a1a1a]'}`}>
                        {e.name}
                      </span>
                      <span className="font-mono text-[10px] text-[#9c9690]">
                        {e.recSeq}
                      </span>
                    </div>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      e.count === 1
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[#f5f3ee] text-[#6b6560]'
                    }`}>
                      {e.count}{e.count === 1 ? ' (unique)' : ''}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {absentEnzymes.length > 0 && (
          <div>
            <div className="sticky top-0 bg-[#f5f3ee] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9c9690]">
              Not in sequence
            </div>
            {absentEnzymes.map((e) => (
              <div
                key={e.name}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[#9c9690]"
              >
                <div className="flex flex-col">
                  <span className="font-mono">{e.name}</span>
                  <span className="font-mono text-[10px]">{e.recognitionSequence}</span>
                </div>
                <span className="text-[10px]">0 sites</span>
              </div>
            ))}
          </div>
        )}
        {filteredEnzymes.length === 0 && absentEnzymes.length === 0 && search && (
          <div className="px-3 py-4 text-center text-xs text-[#9c9690]">
            No enzymes match &ldquo;{search}&rdquo;
          </div>
        )}
        {filteredEnzymes.length === 0 && !search && (
          <div className="px-3 py-4 text-center text-xs text-[#9c9690]">
            No restriction sites found. Click &ldquo;Show all&rdquo; to scan the sequence first.
          </div>
        )}
      </div>
    </div>
  )
}
