'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import type { FeatureType } from '@/types'

const FEATURE_TYPES: FeatureType[] = [
  'CDS',
  'gene',
  'promoter',
  'terminator',
  'rep_origin',
  'primer_bind',
  'regulatory',
  'protein_bind',
  'misc_feature',
]

interface AddFeatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddFeatureDialog({ open, onOpenChange }: AddFeatureDialogProps) {
  const selectedRange = useEditorStore((s) => s.selectedRange)
  const addFeature = useSequenceStore((s) => s.addFeature)
  const [name, setName] = useState('')
  const [type, setType] = useState<FeatureType>('CDS')
  const [strand, setStrand] = useState<1 | -1>(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRange || !name.trim()) return

    addFeature({
      name: name.trim(),
      type,
      start: selectedRange.start,
      end: selectedRange.end,
      strand,
      annotations: [],
    })

    // Ensure feature panel is visible after adding a feature
    if (!useEditorStore.getState().featurePanelOpen) {
      useEditorStore.getState().toggleFeaturePanel()
    }

    setName('')
    setType('CDS')
    setStrand(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-zinc-100">
          Add Feature
        </DialogTitle>
        <DialogDescription className="text-sm text-zinc-400">
          Annotate the selected range{' '}
          {selectedRange && (
            <span className="text-zinc-300">
              ({selectedRange.start + 1}..{selectedRange.end + 1})
            </span>
          )}
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. lacZ, ampR, T7 promoter"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FeatureType)}
              className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {FEATURE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Strand
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={strand === 1 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStrand(1)}
              >
                Forward (+)
              </Button>
              <Button
                type="button"
                variant={strand === -1 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStrand(-1)}
              >
                Reverse (-)
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !selectedRange}>
              Add Feature
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
