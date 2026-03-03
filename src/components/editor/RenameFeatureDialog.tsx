'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import type { Feature } from '@/types'

interface RenameFeatureDialogProps {
  feature: Feature | null
  onClose: () => void
}

export function RenameFeatureDialog({ feature, onClose }: RenameFeatureDialogProps) {
  const [name, setName] = useState('')
  const updateFeature = useSequenceStore((s) => s.updateFeature)

  useEffect(() => {
    if (feature) setName(feature.name)
  }, [feature])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feature || !name.trim()) return
    updateFeature(feature.id, { name: name.trim() })
    onClose()
  }

  return (
    <Dialog open={!!feature} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="text-sm font-semibold text-[#1a1a1a]">Rename Feature</DialogTitle>
        <DialogDescription className="text-xs text-[#9c9690]">
          Enter a new name for &quot;{feature?.name}&quot;
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[#e8e5df] bg-white px-3 py-1.5 text-sm text-[#1a1a1a] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="Feature name"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Rename
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
