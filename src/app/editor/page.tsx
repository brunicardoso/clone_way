'use client'

import { useEffect, useState, useCallback } from 'react'
import { SequenceTabBar } from '@/components/editor/SequenceTabBar'
import { SequenceToolbar } from '@/components/editor/SequenceToolbar'
import { FeaturePanel } from '@/components/editor/FeaturePanel'
import { EditorPanel } from '@/components/editor/EditorPanel'
import { LinearMap } from '@/components/editor/LinearMap'
import { CircularMap } from '@/components/editor/CircularMap'
import { SequenceView } from '@/components/editor/SequenceView'
import { AlignmentResultPanel } from '@/components/editor/AlignmentResultPanel'
import { BlastResultsPanel } from '@/components/editor/BlastResultsPanel'
import { ChromatogramPanel } from '@/components/editor/ChromatogramPanel'
import { FindBar } from '@/components/editor/FindBar'
import { GelPanel } from '@/components/editor/GelPanel'
import type { ChromatogramData } from '@/services/bio/abif'
import type { DigestResult } from '@/services/bio/digest'
import { useEditorStore } from '@/stores/useEditorStore'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useTabStore } from '@/stores/useTabStore'
import { useProjectStore } from '@/stores/useProjectStore'
import type { AlignmentResult } from '@/services/bio/alignment'

export default function EditorPage() {
  const viewMode = useEditorStore((s) => s.viewMode)
  const sequence = useSequenceStore((s) => s.sequence)
  const tabs = useTabStore((s) => s.tabs)
  const splitTabId = useTabStore((s) => s.splitTabId)
  const [alignmentResult, setAlignmentResult] = useState<{
    result: AlignmentResult
    seq1Name: string
    seq2Name: string
  } | null>(null)
  const [blastRid, setBlastRid] = useState<string | null>(null)
  const [chromatogramData, setChromatogramData] =
    useState<ChromatogramData | null>(null)
  const [findBarOpen, setFindBarOpen] = useState(false)
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null)
  const openTab = useTabStore((s) => s.openTab)

  // Auto-open a tab when a sequence is loaded but no tabs exist
  useEffect(() => {
    if (sequence && tabs.length === 0) {
      openTab(sequence)
    }
  }, [sequence, tabs.length, openTab])

  // Listen for alignment results from toolbar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setAlignmentResult(detail)
    }
    window.addEventListener('cyw:alignment-result', handler)
    return () => window.removeEventListener('cyw:alignment-result', handler)
  }, [])

  // Listen for BLAST submissions
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setBlastRid(detail.rid)
    }
    window.addEventListener('cyw:blast-submitted', handler)
    return () => window.removeEventListener('cyw:blast-submitted', handler)
  }, [])

  // Listen for chromatogram loads
  useEffect(() => {
    const handler = (e: Event) => {
      setChromatogramData((e as CustomEvent).detail)
    }
    window.addEventListener('cyw:chromatogram-loaded', handler)
    return () =>
      window.removeEventListener('cyw:chromatogram-loaded', handler)
  }, [])

  // Listen for find trigger
  useEffect(() => {
    const handleFind = () => setFindBarOpen(true)
    window.addEventListener('cyw:trigger-find', handleFind)
    return () => window.removeEventListener('cyw:trigger-find', handleFind)
  }, [])

  // Ctrl+F shortcut for find
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setFindBarOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Listen for digest results
  useEffect(() => {
    const handler = (e: Event) => {
      setDigestResult((e as CustomEvent).detail)
    }
    window.addEventListener('cyw:digest-result', handler)
    return () => window.removeEventListener('cyw:digest-result', handler)
  }, [])

  // Ctrl+A to select all bases
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const seq = useSequenceStore.getState().sequence
        if (!seq) return
        e.preventDefault()
        useEditorStore.getState().setSelectedRange({
          start: 0,
          end: seq.length - 1,
          wrapsAround: false,
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-save session state to project on unload
  useEffect(() => {
    const handler = () => {
      const project = useProjectStore.getState()
      if (!project.isOpen) return
      const { tabs, activeTabId } = useTabStore.getState()
      const viewMode = useEditorStore.getState().viewMode
      project.saveSessionState({
        openTabIds: tabs.map((t) => t.id),
        activeTabId,
        viewMode,
      })
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const splitSequence = splitTabId
    ? tabs.find((t) => t.id === splitTabId)?.sequence ?? null
    : null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SequenceTabBar />
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left toolbar sidebar */}
        <SequenceToolbar />

        {/* Main content area */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <FindBar
            open={findBarOpen}
            onClose={() => setFindBarOpen(false)}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Main panel */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {!sequence ? (
                <div className="flex flex-1 items-center justify-center text-[#9c9690]">
                  <p>No sequence loaded. Import a file or select from the library.</p>
                </div>
              ) : (
                <>
                  {viewMode === 'linear' && (
                    <>
                      <LinearMap />
                      <SequenceView />
                    </>
                  )}
                  {viewMode === 'circular' && <CircularMap />}
                  {viewMode === 'sequence' && <SequenceView />}
                </>
              )}
            </div>

            {/* Split panel */}
            {splitSequence && (
              <>
                <div className="w-px bg-[#e8e5df]" />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <EditorPanel sequence={splitSequence} />
                </div>
              </>
            )}

            {/* Right feature panel — inside the flex row so it doesn't overlap split */}
            <FeaturePanel />
          </div>

          {/* Bottom panels */}
          {alignmentResult && (
            <AlignmentResultPanel
              result={alignmentResult.result}
              seq1Name={alignmentResult.seq1Name}
              seq2Name={alignmentResult.seq2Name}
              onClose={() => setAlignmentResult(null)}
            />
          )}
          {blastRid && (
            <BlastResultsPanel
              rid={blastRid}
              onClose={() => setBlastRid(null)}
            />
          )}
          {chromatogramData && (
            <ChromatogramPanel
              data={chromatogramData}
              onClose={() => setChromatogramData(null)}
            />
          )}
          {digestResult && (
            <GelPanel
              result={digestResult}
              onClose={() => setDigestResult(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
