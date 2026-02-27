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
import { fetchFromAddgene } from '@/services/addgene/client'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useTabStore } from '@/stores/useTabStore'
import { useAppStore } from '@/stores/useAppStore'
import { Loader2 } from 'lucide-react'

interface AddgeneImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddgeneImportDialog({
  open,
  onOpenChange,
}: AddgeneImportDialogProps) {
  const [plasmidId, setPlasmidId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = plasmidId.trim()
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const sequence = await fetchFromAddgene(id)
      // openTab saves old tab state, adds new tab, and calls loadSequence internally
      useTabStore.getState().openTab(sequence)
      useAppStore.getState().addRecentSequence(sequence)
      setPlasmidId('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plasmid')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
          Fetch from Addgene
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Enter an Addgene plasmid ID to import its sequence.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6560]">
              Plasmid ID
            </label>
            <Input
              value={plasmidId}
              onChange={(e) => setPlasmidId(e.target.value)}
              placeholder="e.g. 74218"
              autoFocus
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!plasmidId.trim() || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
