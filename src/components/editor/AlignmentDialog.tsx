'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTabStore } from '@/stores/useTabStore'
import {
  needlemanWunsch,
  type AlignmentResult,
  type AlignmentParams,
} from '@/services/bio/alignment'
import { Loader2 } from 'lucide-react'

interface AlignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (result: AlignmentResult, seq1Name: string, seq2Name: string) => void
}

export function AlignmentDialog({
  open,
  onOpenChange,
  onResult,
}: AlignmentDialogProps) {
  const tabs = useTabStore((s) => s.tabs)
  const [seq1Id, setSeq1Id] = useState('')
  const [seq2Id, setSeq2Id] = useState('')
  const [matchScore, setMatchScore] = useState('2')
  const [mismatchScore, setMismatchScore] = useState('-1')
  const [gapOpen, setGapOpen] = useState('-2')
  const [gapExtend, setGapExtend] = useState('-0.5')
  const [running, setRunning] = useState(false)

  const handleAlign = () => {
    const tab1 = tabs.find((t) => t.id === seq1Id)
    const tab2 = tabs.find((t) => t.id === seq2Id)
    if (!tab1?.sequence || !tab2?.sequence) return

    setRunning(true)

    // Use setTimeout to avoid blocking UI for large sequences
    setTimeout(() => {
      const params: AlignmentParams = {
        match: parseFloat(matchScore) || 2,
        mismatch: parseFloat(mismatchScore) || -1,
        gapOpen: parseFloat(gapOpen) || -2,
        gapExtend: parseFloat(gapExtend) || -0.5,
      }

      const result = needlemanWunsch(
        tab1.sequence.bases,
        tab2.sequence.bases,
        params,
      )

      setRunning(false)
      onResult(result, tab1.sequence.name, tab2.sequence.name)
      onOpenChange(false)
    }, 10)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
          Align Sequences
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Select two sequences to perform pairwise alignment (Needleman-Wunsch).
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6560]">
              Sequence 1
            </label>
            <select
              value={seq1Id}
              onChange={(e) => setSeq1Id(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-1 text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="">Select a sequence...</option>
              {tabs
                .filter((t) => t.id !== seq2Id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sequence.name} ({t.sequence.length} bp)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6560]">
              Sequence 2
            </label>
            <select
              value={seq2Id}
              onChange={(e) => setSeq2Id(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-1 text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="">Select a sequence...</option>
              {tabs
                .filter((t) => t.id !== seq1Id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sequence.name} ({t.sequence.length} bp)
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                Match
              </label>
              <Input
                value={matchScore}
                onChange={(e) => setMatchScore(e.target.value)}
                type="number"
                step="0.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                Mismatch
              </label>
              <Input
                value={mismatchScore}
                onChange={(e) => setMismatchScore(e.target.value)}
                type="number"
                step="0.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                Gap Open
              </label>
              <Input
                value={gapOpen}
                onChange={(e) => setGapOpen(e.target.value)}
                type="number"
                step="0.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                Gap Extend
              </label>
              <Input
                value={gapExtend}
                onChange={(e) => setGapExtend(e.target.value)}
                type="number"
                step="0.1"
              />
            </div>
          </div>

          {tabs.length < 2 && (
            <p className="text-xs text-amber-400">
              Open at least 2 sequences in tabs to align them.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={running}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAlign}
              disabled={
                !seq1Id || !seq2Id || seq1Id === seq2Id || running
              }
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aligning...
                </>
              ) : (
                'Align'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
