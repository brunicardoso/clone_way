'use client'

import { useEffect, useCallback, useState } from 'react'
import {
  AlignHorizontalSpaceAround,
  Circle,
  AlignLeft,
  Upload,
  Download,
  Scissors,
  Dna,
  Tag,
  Save,
  BookOpen,
  GitCompareArrows,
  Sparkles,
  FolderOpen,
  PenLine,
  FilePlus,
  Radar,
  SearchCode,
  FlaskConical,
  ALargeSmall,
  GitMerge,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCommandDispatch } from '@/hooks/useCommandDispatch'
import { useEditorStore } from '@/stores/useEditorStore'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { findORFs } from '@/services/bio/orf'
import { findAllRestrictionSites } from '@/services/bio/enzymes'
import { useTabStore } from '@/stores/useTabStore'
import { useAppStore } from '@/stores/useAppStore'
import { AddFeatureDialog } from './AddFeatureDialog'
import { ImportDialog } from './ImportDialog'
import { FeatureLibraryPanel } from './FeatureLibraryPanel'
import { AlignmentDialog } from './AlignmentDialog'
import { BlastDialog } from './BlastDialog'
import { AutoAnnotateDialog } from './AutoAnnotateDialog'
import { ProjectDialog } from './ProjectDialog'
import { NewSequenceDialog } from './NewSequenceDialog'
import { ExportDialog } from './ExportDialog'
import { RestrictionEnzymePanel } from './RestrictionEnzymePanel'
import { DigestDialog } from './DigestDialog'
import { CloningPlanDialog } from './CloningPlanDialog'
import { useProjectStore } from '@/stores/useProjectStore'
import type { DigestResult } from '@/services/bio/digest'
import type { AlignmentResult } from '@/services/bio/alignment'
import type { ViewMode } from '@/types'

function Separator() {
  return <div className="mx-auto my-1 h-px w-6 bg-[#e8e5df]" />
}

export function SequenceToolbar() {
  const { dispatch } = useCommandDispatch()
  const viewMode = useEditorStore((s) => s.viewMode)
  const setViewMode = useEditorStore((s) => s.setViewMode)
  // Zoom is now handled inline in LinearMap and SequenceView
  const selectedRange = useEditorStore((s) => s.selectedRange)
  const sequence = useSequenceStore((s) => s.sequence)
  const isDirty = useSequenceStore((s) => s.isDirty)
  const editMode = useEditorStore((s) => s.editMode)
  const setEditMode = useEditorStore((s) => s.setEditMode)

  const [addFeatureOpen, setAddFeatureOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importInitialTab, setImportInitialTab] = useState<'file' | 'addgene' | 'ncbi'>('file')
  const [featureLibraryOpen, setFeatureLibraryOpen] = useState(false)
  const [alignmentOpen, setAlignmentOpen] = useState(false)
  const [blastOpen, setBlastOpen] = useState(false)
  const [autoAnnotateOpen, setAutoAnnotateOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [newSequenceOpen, setNewSequenceOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [restrictionPanelOpen, setRestrictionPanelOpen] = useState(false)
  const [digestOpen, setDigestOpen] = useState(false)
  const [cloningOpen, setCloningOpen] = useState(false)
  const isProjectOpen = useProjectStore((s) => s.isOpen)
  const showTranslation = useEditorStore((s) => s.showTranslation)
  const toggleTranslation = useEditorStore((s) => s.toggleTranslation)

  const handleFindOrfs = useCallback(() => {
    const seq = useSequenceStore.getState().sequence
    if (!seq) return
    const orfs = findORFs(seq.bases, 100)
    useSequenceStore.getState().updateOrfs(orfs)
  }, [])

  const handleAnnotate = useCallback(() => {
    if (!selectedRange) {
      alert('Select a range on the sequence first, then click Annotate.')
      return
    }
    setAddFeatureOpen(true)
  }, [selectedRange])

  // Listen for programmatic import triggers (from Magic Bar / keyboard shortcuts)
  useEffect(() => {
    const handler = () => { setImportInitialTab('file'); setImportOpen(true) }
    window.addEventListener('cyw:trigger-import', handler)
    return () => window.removeEventListener('cyw:trigger-import', handler)
  }, [])

  useEffect(() => {
    const handler = () => { setImportInitialTab('addgene'); setImportOpen(true) }
    window.addEventListener('cyw:trigger-addgene', handler)
    return () => window.removeEventListener('cyw:trigger-addgene', handler)
  }, [])

  useEffect(() => {
    const handler = () => { setImportInitialTab('ncbi'); setImportOpen(true) }
    window.addEventListener('cyw:trigger-ncbi', handler)
    return () => window.removeEventListener('cyw:trigger-ncbi', handler)
  }, [])

  useEffect(() => {
    const handler = () => setFeatureLibraryOpen(true)
    window.addEventListener('cyw:trigger-feature-library', handler)
    return () =>
      window.removeEventListener('cyw:trigger-feature-library', handler)
  }, [])

  useEffect(() => {
    const handler = () => setAlignmentOpen(true)
    window.addEventListener('cyw:trigger-align', handler)
    return () => window.removeEventListener('cyw:trigger-align', handler)
  }, [])

  useEffect(() => {
    const handler = () => setBlastOpen(true)
    window.addEventListener('cyw:trigger-blast', handler)
    return () => window.removeEventListener('cyw:trigger-blast', handler)
  }, [])

  useEffect(() => {
    const handler = () => setAutoAnnotateOpen(true)
    window.addEventListener('cyw:trigger-auto-annotate', handler)
    return () =>
      window.removeEventListener('cyw:trigger-auto-annotate', handler)
  }, [])

  useEffect(() => {
    const handler = () => setProjectOpen(true)
    window.addEventListener('cyw:trigger-project-open', handler)
    return () =>
      window.removeEventListener('cyw:trigger-project-open', handler)
  }, [])

  useEffect(() => {
    const handler = () => setProjectOpen(true)
    window.addEventListener('cyw:trigger-project-create', handler)
    return () =>
      window.removeEventListener('cyw:trigger-project-create', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      if (!useSequenceStore.getState().sequence) return
      useSequenceStore.getState().commitChanges()
      useTabStore.getState().syncActiveSequence()
      const seq = useSequenceStore.getState().sequence!
      useAppStore.getState().addRecentSequence(seq)
      const project = useProjectStore.getState()
      if (project.isOpen) {
        project.saveSequence(seq)
      } else {
        setExportOpen(true)
      }
    }
    window.addEventListener('cyw:trigger-project-save', handler)
    return () =>
      window.removeEventListener('cyw:trigger-project-save', handler)
  }, [])

  useEffect(() => {
    const handler = () => setNewSequenceOpen(true)
    window.addEventListener('cyw:trigger-new-sequence', handler)
    return () =>
      window.removeEventListener('cyw:trigger-new-sequence', handler)
  }, [])

  useEffect(() => {
    const handler = () => setExportOpen(true)
    window.addEventListener('cyw:trigger-export', handler)
    return () => window.removeEventListener('cyw:trigger-export', handler)
  }, [])

  const handleDigestResult = useCallback((result: DigestResult) => {
    window.dispatchEvent(
      new CustomEvent('cyw:digest-result', { detail: result }),
    )
  }, [])

  // Listen for programmatic digest trigger
  useEffect(() => {
    const handler = () => setDigestOpen(true)
    window.addEventListener('cyw:trigger-digest', handler)
    return () => window.removeEventListener('cyw:trigger-digest', handler)
  }, [])

  // Listen for programmatic cloning trigger
  useEffect(() => {
    const handler = () => setCloningOpen(true)
    window.addEventListener('cyw:trigger-cloning', handler)
    return () => window.removeEventListener('cyw:trigger-cloning', handler)
  }, [])

  const handleBlastSubmitted = useCallback((rid: string) => {
    window.dispatchEvent(
      new CustomEvent('cyw:blast-submitted', { detail: { rid } }),
    )
  }, [])

  const handleAlignmentResult = useCallback(
    (result: AlignmentResult, seq1Name: string, seq2Name: string) => {
      window.dispatchEvent(
        new CustomEvent('cyw:alignment-result', {
          detail: { result, seq1Name, seq2Name },
        }),
      )
    },
    [],
  )

  const viewModes: {
    mode: ViewMode
    icon: typeof AlignHorizontalSpaceAround
    label: string
  }[] = [
    { mode: 'linear', icon: AlignHorizontalSpaceAround, label: 'Linear' },
    { mode: 'circular', icon: Circle, label: 'Circular' },
    { mode: 'sequence', icon: AlignLeft, label: 'Sequence' },
  ]

  const hasSequence = !!sequence

  return (
    <>
      <div className="hidden w-10 shrink-0 flex-col items-center gap-0.5 border-r border-[#e8e5df] bg-[#f5f3ee] py-2 md:flex">
        {/* File operations */}
        <Button variant="ghost" size="icon" title="New Sequence" onClick={() => setNewSequenceOpen(true)} className="h-8 w-8">
          <FilePlus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Import (File / Addgene)" onClick={() => setImportOpen(true)} className="h-8 w-8">
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Export" disabled={!hasSequence} onClick={() => setExportOpen(true)} className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={`Save (Cmd+S)${isProjectOpen ? ' — saves to project' : ''}`}
          disabled={!hasSequence || !isDirty}
          className="h-8 w-8"
          onClick={() => {
            if (!useSequenceStore.getState().sequence) return
            useSequenceStore.getState().commitChanges()
            useTabStore.getState().syncActiveSequence()
            const seq = useSequenceStore.getState().sequence!
            useAppStore.getState().addRecentSequence(seq)
            if (useProjectStore.getState().isOpen) {
              useProjectStore.getState().saveSequence(seq)
            } else {
              setExportOpen(true)
            }
          }}
        >
          <Save className={`h-4 w-4 ${isDirty ? 'text-amber-400' : ''}`} />
        </Button>
        <Button
          variant={isProjectOpen ? 'default' : 'ghost'}
          size="icon"
          title="Project Directory"
          onClick={() => setProjectOpen(true)}
          className="h-8 w-8"
        >
          <FolderOpen className="h-4 w-4" />
        </Button>

        <Separator />

        <Button
          variant={editMode ? 'default' : 'ghost'}
          size="icon"
          disabled={!hasSequence}
          title={editMode ? 'Exit Edit Mode (Esc)' : 'Edit Mode — type bases directly'}
          className={`h-8 w-8 ${editMode ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
          onClick={() => {
            if (editMode) {
              setEditMode(false)
            } else {
              const confirmed = window.confirm(
                'Enable edit mode?\n\nYou will be able to type and delete bases directly in the sequence view.\n\nUse Ctrl+Z / Cmd+Z to undo any changes.',
              )
              if (confirmed) setEditMode(true)
            }
          }}
        >
          <PenLine className="h-4 w-4" />
        </Button>

        <Separator />

        {/* View modes */}
        {viewModes.map(({ mode, icon: Icon, label }) => {
          const isCircularDisabled = mode === 'circular' && sequence && !sequence.isCircular
          return (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'ghost'}
              size="icon"
              onClick={() => !isCircularDisabled && setViewMode(mode)}
              title={isCircularDisabled ? 'Circular view requires a circular sequence' : label}
              disabled={!!isCircularDisabled}
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}

        <Separator />

        {/* Analysis tools */}
        <Button
          variant={restrictionPanelOpen ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setRestrictionPanelOpen(!restrictionPanelOpen)}
          disabled={!hasSequence}
          title="Restriction Enzymes"
          className="h-8 w-8"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDigestOpen(true)} disabled={!hasSequence} title="Restriction Digest" className="h-8 w-8">
          <FlaskConical className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setCloningOpen(true)} disabled={!hasSequence} title="Cloning Plan" className="h-8 w-8">
          <GitMerge className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleFindOrfs} disabled={!hasSequence} title="Find ORFs" className="h-8 w-8">
          <Dna className="h-4 w-4" />
        </Button>
        <Button
          variant={showTranslation ? 'default' : 'ghost'}
          size="icon"
          onClick={toggleTranslation}
          disabled={!hasSequence}
          title="Show Protein Translation"
          className="h-8 w-8"
        >
          <ALargeSmall className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleAnnotate} disabled={!hasSequence} title="Annotate Selection" className="h-8 w-8">
          <Tag className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setFeatureLibraryOpen(true)} title="Feature Library" className="h-8 w-8">
          <BookOpen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setAutoAnnotateOpen(true)} disabled={!hasSequence} title="Auto-Annotate Features" className="h-8 w-8">
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setAlignmentOpen(true)} title="Align Sequences" className="h-8 w-8">
          <GitCompareArrows className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setBlastOpen(true)} disabled={!hasSequence} title="BLAST Search" className="h-8 w-8">
          <Radar className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.dispatchEvent(new CustomEvent('cyw:trigger-find'))}
          disabled={!hasSequence}
          title="Find Sequence (Ctrl+F)"
          className="h-8 w-8"
        >
          <SearchCode className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#e8e5df] bg-[#f5f3ee]/95 px-2 py-1.5 backdrop-blur-sm md:hidden" style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}>
        <Button variant="ghost" size="icon" title="Import" onClick={() => { setImportInitialTab('file'); setImportOpen(true) }} className="h-11 w-11">
          <Upload className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Export" disabled={!hasSequence} onClick={() => setExportOpen(true)} className="h-11 w-11">
          <Download className="h-5 w-5" />
        </Button>
        {(() => {
          const currentMode = viewModes.find(v => v.mode === viewMode) ?? viewModes[0]
          const CurrentIcon = currentMode.icon
          const nextIdx = (viewModes.findIndex(v => v.mode === viewMode) + 1) % viewModes.length
          const nextMode = viewModes[nextIdx]
          return (
            <Button
              variant="default"
              size="icon"
              onClick={() => {
                const isCircularDisabled = nextMode.mode === 'circular' && sequence && !sequence.isCircular
                if (isCircularDisabled) {
                  const skipIdx = (nextIdx + 1) % viewModes.length
                  setViewMode(viewModes[skipIdx].mode)
                } else {
                  setViewMode(nextMode.mode)
                }
              }}
              title={`View: ${currentMode.label}`}
              className="h-11 w-11"
            >
              <CurrentIcon className="h-5 w-5" />
            </Button>
          )
        })()}
        <Button variant="ghost" size="icon" title="Find ORFs" onClick={handleFindOrfs} disabled={!hasSequence} className="h-11 w-11">
          <Dna className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="All Commands" onClick={() => window.dispatchEvent(new CustomEvent('cyw:trigger-magic-bar'))} className="h-11 w-11">
          <SearchCode className="h-5 w-5" />
        </Button>
      </div>

      {/* Restriction Enzyme floating panel */}
      {restrictionPanelOpen && (
        <RestrictionEnzymePanel onClose={() => setRestrictionPanelOpen(false)} />
      )}

      {/* Dialogs */}
      <AddFeatureDialog open={addFeatureOpen} onOpenChange={setAddFeatureOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} initialTab={importInitialTab} />
      <FeatureLibraryPanel open={featureLibraryOpen} onOpenChange={setFeatureLibraryOpen} />
      <AlignmentDialog open={alignmentOpen} onOpenChange={setAlignmentOpen} onResult={handleAlignmentResult} />
      <BlastDialog open={blastOpen} onOpenChange={setBlastOpen} onSubmitted={handleBlastSubmitted} />
      <AutoAnnotateDialog open={autoAnnotateOpen} onOpenChange={setAutoAnnotateOpen} />
      <ProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
      <NewSequenceDialog open={newSequenceOpen} onOpenChange={setNewSequenceOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <DigestDialog open={digestOpen} onOpenChange={setDigestOpen} onDigestResult={handleDigestResult} />
      <CloningPlanDialog open={cloningOpen} onOpenChange={setCloningOpen} />
    </>
  )
}
