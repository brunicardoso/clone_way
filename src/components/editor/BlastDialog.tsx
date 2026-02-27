'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { submitBlast } from '@/services/blast/client'
import { Loader2 } from 'lucide-react'

interface BlastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted: (rid: string) => void
}

export function BlastDialog({
  open,
  onOpenChange,
  onSubmitted,
}: BlastDialogProps) {
  const sequence = useSequenceStore((s) => s.sequence)
  const selectedRange = useEditorStore((s) => s.selectedRange)
  const [program, setProgram] = useState('blastn')
  const [database, setDatabase] = useState('nt')
  const [useSelection, setUseSelection] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const querySequence = (() => {
    if (!sequence) return ''
    if (useSelection && selectedRange) {
      return sequence.bases.slice(selectedRange.start, selectedRange.end + 1)
    }
    return sequence.bases
  })()

  const handleSubmit = async () => {
    if (!querySequence) return
    setLoading(true)
    setError(null)

    try {
      const { rid } = await submitBlast(querySequence, { program, database })
      onSubmitted(rid)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit BLAST')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
          BLAST Search
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Search for similar sequences in NCBI databases.
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-xs text-amber-700">
            Your sequence will be sent to NCBI for comparison. No other user
            data is transmitted.
          </div>

          {selectedRange && (
            <label className="flex items-center gap-2 text-sm text-[#1a1a1a]">
              <input
                type="checkbox"
                checked={useSelection}
                onChange={(e) => setUseSelection(e.target.checked)}
                className="rounded border-[#e8e5df]"
              />
              Use selected range only ({selectedRange.end - selectedRange.start + 1}{' '}
              bp)
            </label>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6560]">
              Program
            </label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-1 text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="blastn">blastn (nucleotide)</option>
              <option value="blastx">blastx (translated query)</option>
              <option value="tblastn">tblastn (protein vs translated db)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6560]">
              Database
            </label>
            <select
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-1 text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="nt">nt (nucleotide collection)</option>
              <option value="nr">nr (non-redundant protein)</option>
              <option value="refseq_rna">RefSeq RNA</option>
              <option value="refseq_genomic">RefSeq Genomic</option>
            </select>
          </div>

          <div className="text-xs text-[#9c9690]">
            Query: {querySequence.length} bp
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!sequence || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Run BLAST'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
