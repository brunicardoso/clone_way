'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { fetchFromAddgene } from '@/services/addgene/client'
import { importFile, importSnapGeneFile } from '@/services/file/importer'
import { parseABIF } from '@/services/bio/abif'
import { useTabStore } from '@/stores/useTabStore'
import { useAppStore } from '@/stores/useAppStore'
import { Loader2, Upload } from 'lucide-react'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [plasmidId, setPlasmidId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setPlasmidId('')
    setError(null)
    setLoading(false)
    setDragOver(false)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetState()
      onOpenChange(open)
    },
    [onOpenChange, resetState],
  )

  const handleFileImport = useCallback(
    (file: File) => {
      const isAbi = /\.(ab1|abi)$/i.test(file.name)
      const isSnapGene = /\.dna$/i.test(file.name)

      if (isAbi) {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const data = parseABIF(reader.result as ArrayBuffer, file.name)
            window.dispatchEvent(
              new CustomEvent('cyw:chromatogram-loaded', { detail: data }),
            )
            handleOpenChange(false)
          } catch (err) {
            setError(
              `Failed to parse chromatogram: ${err instanceof Error ? err.message : 'Unknown error'}`,
            )
          }
        }
        reader.readAsArrayBuffer(file)
      } else if (isSnapGene) {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const seq = importSnapGeneFile(file.name, reader.result as ArrayBuffer)
            useTabStore.getState().openTab(seq)
            handleOpenChange(false)
          } catch (err) {
            setError(
              `Failed to import SnapGene file: ${err instanceof Error ? err.message : 'Unknown error'}`,
            )
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const content = reader.result as string
            const seq = importFile(file.name, content)
            useTabStore.getState().openTab(seq)
            handleOpenChange(false)
          } catch (err) {
            setError(
              `Failed to import file: ${err instanceof Error ? err.message : 'Unknown error'}`,
            )
          }
        }
        reader.readAsText(file)
      }
    },
    [handleOpenChange],
  )

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileImport(file)
      e.target.value = ''
    },
    [handleFileImport],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileImport(file)
    },
    [handleFileImport],
  )

  const handleAddgeneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = plasmidId.trim()
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const sequence = await fetchFromAddgene(id)
      useTabStore.getState().openTab(sequence)
      useAppStore.getState().addRecentSequence(sequence)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plasmid')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
          Import Sequence
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Import from a local file or fetch from Addgene.
        </DialogDescription>

        <div className="mt-3 space-y-5">
          {/* File drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".gb,.gbk,.genbank,.fa,.fasta,.fna,.ab1,.abi,.fq,.fastq,.dna"
            className="hidden"
            onChange={handleFileSelected}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragOver
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-[#e8e5df] hover:border-[#9c9690] hover:bg-[#f5f3ee]'
            }`}
          >
            <Upload className={`h-8 w-8 ${dragOver ? 'text-emerald-500' : 'text-[#9c9690]'}`} />
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">
                Drop a file here or click to browse
              </p>
              <p className="mt-1 text-xs text-[#9c9690]">
                GenBank (.gb, .gbk), FASTA (.fa, .fasta), FASTQ (.fq, .fastq), SnapGene (.dna), AB1 (.ab1)
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e8e5df]" />
            <span className="text-xs text-[#9c9690]">or fetch from Addgene</span>
            <div className="h-px flex-1 bg-[#e8e5df]" />
          </div>

          {/* Addgene section */}
          <form onSubmit={handleAddgeneSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                Plasmid ID
              </label>
              <Input
                value={plasmidId}
                onChange={(e) => setPlasmidId(e.target.value)}
                placeholder="e.g. 74218"
                disabled={loading}
              />
            </div>
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
          </form>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
