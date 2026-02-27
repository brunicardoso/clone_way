'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTabStore } from '@/stores/useTabStore'
import { useFeatureLibraryStore } from '@/stores/useFeatureLibraryStore'
import { FolderOpen, FolderPlus, FolderX, Loader2 } from 'lucide-react'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDialog({ open, onOpenChange }: ProjectDialogProps) {
  const projectName = useProjectStore((s) => s.projectName)
  const isOpen = useProjectStore((s) => s.isOpen)
  const isBusy = useProjectStore((s) => s.isBusy)
  const openProject = useProjectStore((s) => s.openProject)
  const createProject = useProjectStore((s) => s.createProject)
  const closeProject = useProjectStore((s) => s.closeProject)
  const loadSequences = useProjectStore((s) => s.loadSequences)
  const openTab = useTabStore((s) => s.openTab)

  const [newName, setNewName] = useState('')
  const [mode, setMode] = useState<'menu' | 'create'>('menu')
  const [loading, setLoading] = useState(false)

  const handleOpenExisting = useCallback(async () => {
    setLoading(true)
    try {
      await openProject()
      // Load sequences from project into tabs
      const seqs = await useProjectStore.getState().loadSequences()
      for (const seq of seqs) {
        openTab(seq)
      }
      // Load feature library from project
      await useFeatureLibraryStore.getState().loadFromProject()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [openProject, openTab, onOpenChange])

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    setLoading(true)
    try {
      await createProject(newName.trim())
      setNewName('')
      setMode('menu')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [createProject, newName, onOpenChange])

  const handleClose = useCallback(() => {
    closeProject()
    onOpenChange(false)
  }, [closeProject, onOpenChange])

  const handleDialogChange = (val: boolean) => {
    if (!val) {
      setMode('menu')
      setNewName('')
    }
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1a1a1a]">
          <FolderOpen className="h-5 w-5 text-emerald-400" />
          Project Directory
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Save sequences and features to a folder on your computer.
        </DialogDescription>

        {isOpen ? (
          <div className="mt-2 space-y-4">
            <div className="rounded-md border border-[#e8e5df] bg-[#f5f3ee] p-3">
              <div className="text-xs text-[#9c9690]">Current project</div>
              <div className="mt-1 text-sm font-medium text-[#1a1a1a]">
                {projectName}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="justify-start gap-2"
                onClick={async () => {
                  setLoading(true)
                  try {
                    const seqs = await loadSequences()
                    for (const seq of seqs) {
                      openTab(seq)
                    }
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                Reload Sequences
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-2 text-red-400 hover:text-red-300"
                onClick={handleClose}
              >
                <FolderX className="h-4 w-4" />
                Close Project
              </Button>
            </div>
          </div>
        ) : mode === 'menu' ? (
          <div className="mt-2 flex flex-col gap-2">
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={handleOpenExisting}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              Open Existing Project
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => setMode('create')}
            >
              <FolderPlus className="h-4 w-4" />
              Create New Project
            </Button>

            <p className="mt-2 text-xs text-[#9c9690]">
              Projects use the File System Access API. Works in Chrome and Edge.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-[#6b6560]">
                Project Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Cloning Project"
                className="w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#9c9690] focus:border-emerald-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                autoFocus
              />
            </div>
            <p className="text-xs text-[#9c9690]">
              You will be asked to select a folder. CYW will create{' '}
              <code className="text-[#6b6560]">project.json</code>,{' '}
              <code className="text-[#6b6560]">sequences/</code>, and{' '}
              <code className="text-[#6b6560]">features/</code> inside it.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode('menu')}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
