'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FEATURE_COLORS } from '@/lib/constants'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { autoAnnotate, type AnnotationMatch } from '@/services/bio/autoAnnotate'
import { Loader2, Sparkles } from 'lucide-react'

interface AutoAnnotateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AutoAnnotateDialog({
  open,
  onOpenChange,
}: AutoAnnotateDialogProps) {
  const sequence = useSequenceStore((s) => s.sequence)
  const addFeature = useSequenceStore((s) => s.addFeature)
  const [matches, setMatches] = useState<AnnotationMatch[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)

  const runScan = useCallback(() => {
    if (!sequence) return
    setScanning(true)
    setScanned(false)

    setTimeout(() => {
      const results = autoAnnotate(sequence.bases, sequence.isCircular)
      setMatches(results)
      setSelected(new Set(results.map((_, i) => i)))
      setScanning(false)
      setScanned(true)
    }, 10)
  }, [sequence])

  useEffect(() => {
    if (open && sequence && !scanned) {
      runScan()
    }
  }, [open, sequence, scanned, runScan])

  useEffect(() => {
    if (!open) {
      setMatches([])
      setSelected(new Set())
      setScanned(false)
    }
  }, [open])

  const toggleSelection = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === matches.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(matches.map((_, i) => i)))
    }
  }

  const handleApply = () => {
    for (const idx of selected) {
      const match = matches[idx]
      addFeature({
        name: match.feature.name,
        type: match.feature.type,
        start: match.start,
        end: match.end,
        strand: match.strand,
        color: FEATURE_COLORS[match.feature.type],
        annotations: [
          { key: 'note', value: match.feature.description },
          { key: 'identity', value: `${match.identity.toFixed(1)}%` },
        ],
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1a1a1a]">
          <Sparkles className="h-5 w-5 text-amber-400" />
          Auto-Annotate Features
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Scan your sequence against a built-in database of common molecular
          biology features.
        </DialogDescription>

        {scanning && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#6b6560]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning sequence...
          </div>
        )}

        {scanned && matches.length === 0 && (
          <p className="py-6 text-center text-sm text-[#9c9690]">
            No known features found in this sequence.
          </p>
        )}

        {scanned && matches.length > 0 && (
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9c9690]">
                {matches.length} feature{matches.length !== 1 ? 's' : ''} found
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selected.size === matches.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-[#e8e5df]">
              {matches.map((match, idx) => (
                <label
                  key={idx}
                  className="flex cursor-pointer items-center gap-3 border-b border-[#e8e5df] px-3 py-2 text-xs last:border-b-0 hover:bg-[#eae7e1]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggleSelection(idx)}
                    className="rounded border-[#e8e5df]"
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        FEATURE_COLORS[match.feature.type] ?? '#666',
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[#1a1a1a]">
                      {match.feature.name}
                    </div>
                    <div className="text-[#9c9690]">
                      {match.start + 1}..{match.end + 1}{' '}
                      ({match.strand === 1 ? '+' : '-'})
                      {match.identity < 100 && (
                        <span className="ml-1 text-amber-400">
                          {match.identity.toFixed(0)}% identity
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{match.feature.type}</Badge>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={selected.size === 0}
              >
                Apply {selected.size} Feature{selected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
