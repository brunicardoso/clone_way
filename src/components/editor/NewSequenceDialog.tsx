'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useTabStore } from '@/stores/useTabStore'
import { v4 as uuidv4 } from 'uuid'
import { FilePlus } from 'lucide-react'
import type { Sequence } from '@/types'

interface NewSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewSequenceDialog({ open, onOpenChange }: NewSequenceDialogProps) {
  const openTab = useTabStore((s) => s.openTab)
  const [name, setName] = useState('')
  const [isCircular, setIsCircular] = useState(true)
  const [bases, setBases] = useState('')

  const handleCreate = () => {
    const seqName = name.trim() || 'Untitled Sequence'
    const cleanBases = bases.replace(/[^ATGCNatgcn]/g, '').toUpperCase()
    const now = new Date().toISOString()

    const seq: Sequence = {
      id: uuidv4(),
      name: seqName,
      description: '',
      bases: cleanBases,
      isCircular,
      length: cleanBases.length,
      features: [],
      restrictionSites: [],
      orfs: [],
      annotations: [],
      createdAt: now,
      updatedAt: now,
    }

    openTab(seq)
    onOpenChange(false)
    setName('')
    setBases('')
    setIsCircular(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1a1a1a]">
          <FilePlus className="h-5 w-5 text-emerald-400" />
          New Sequence
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Create a blank sequence or paste bases to get started.
        </DialogDescription>

        <div className="mt-2 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6b6560]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled Sequence"
              className="w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#9c9690] focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6b6560]">Topology</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCircular(true)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isCircular
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#eae7e1] text-[#6b6560] hover:bg-[#eae7e1]'
                }`}
              >
                Circular (Plasmid)
              </button>
              <button
                type="button"
                onClick={() => setIsCircular(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  !isCircular
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#eae7e1] text-[#6b6560] hover:bg-[#eae7e1]'
                }`}
              >
                Linear
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6b6560]">
              Sequence (optional — paste DNA bases)
            </label>
            <textarea
              value={bases}
              onChange={(e) => setBases(e.target.value)}
              placeholder="ATGCATGC..."
              rows={4}
              className="w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-2 font-mono text-sm text-[#1a1a1a] placeholder:text-[#9c9690] focus:border-emerald-500 focus:outline-none"
            />
            {bases.length > 0 && (
              <p className="mt-1 text-xs text-[#9c9690]">
                {bases.replace(/[^ATGCNatgcn]/g, '').length} valid bases
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
