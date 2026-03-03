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
import { fetchFromNCBI } from '@/services/ncbi/client'
import { importFile, importSnapGeneFile } from '@/services/file/importer'
import { parseABIF } from '@/services/bio/abif'
import { useTabStore } from '@/stores/useTabStore'
import { useAppStore } from '@/stores/useAppStore'
import { Loader2, Upload } from 'lucide-react'

type ImportTab = 'file' | 'addgene' | 'ncbi'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: ImportTab
}

export function ImportDialog({ open, onOpenChange, initialTab = 'file' }: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>(initialTab)
  const [plasmidId, setPlasmidId] = useState('')
  const [accessionId, setAccessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setActiveTab(initialTab)
    setPlasmidId('')
    setAccessionId('')
    setError(null)
    setLoading(false)
    setDragOver(false)
  }, [initialTab])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetState()
      onOpenChange(open)
    },
    [onOpenChange, resetState],
  )

  const handleFileImport = useCallback(
    (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
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
              resolve()
            } catch (err) {
              reject(err)
            }
          }
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
          reader.readAsArrayBuffer(file)
        } else if (isSnapGene) {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const seq = importSnapGeneFile(file.name, reader.result as ArrayBuffer)
              useTabStore.getState().openTab(seq)
              resolve()
            } catch (err) {
              reject(err)
            }
          }
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
          reader.readAsArrayBuffer(file)
        } else {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const content = reader.result as string
              const seq = importFile(file.name, content)
              useTabStore.getState().openTab(seq)
              resolve()
            } catch (err) {
              reject(err)
            }
          }
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
          reader.readAsText(file)
        }
      })
    },
    [],
  )

  const handleMultipleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setError(null)
      const errors: string[] = []
      let imported = 0

      for (const file of files) {
        try {
          await handleFileImport(file)
          imported++
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      if (errors.length > 0) {
        setError(`Failed to import ${errors.length} file(s):\n${errors.join('\n')}`)
      }
      if (imported > 0) {
        handleOpenChange(false)
      }
    },
    [handleFileImport, handleOpenChange],
  )

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) handleMultipleFiles(files)
      e.target.value = ''
    },
    [handleMultipleFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) handleMultipleFiles(files)
    },
    [handleMultipleFiles],
  )

  const handleNCBISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = accessionId.trim()
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const sequence = await fetchFromNCBI(id)
      useTabStore.getState().openTab(sequence)
      useAppStore.getState().addRecentSequence(sequence)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch from NCBI')
    } finally {
      setLoading(false)
    }
  }

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
          Import from a local file, Addgene, or NCBI.
        </DialogDescription>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 border-b border-[#e8e5df]">
          {([['file', 'File'], ['addgene', 'Addgene'], ['ncbi', 'NCBI']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setError(null) }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-emerald-500 text-emerald-600'
                  : 'text-[#9c9690] hover:text-[#6b6560]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-5">
          {/* File tab */}
          {activeTab === 'file' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
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
                    Drop files here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-[#9c9690]">
                    GenBank (.gb, .gbk), FASTA (.fa, .fasta), FASTQ (.fq, .fastq), SnapGene (.dna), AB1 (.ab1)
                  </p>
                  <p className="mt-0.5 text-xs text-[#9c9690]">
                    Multiple files supported
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Addgene tab */}
          {activeTab === 'addgene' && (
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
          )}

          {/* NCBI tab */}
          {activeTab === 'ncbi' && (
            <form onSubmit={handleNCBISubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                  Accession Number
                </label>
                <Input
                  value={accessionId}
                  onChange={(e) => setAccessionId(e.target.value)}
                  placeholder="e.g. U49845, NM_001301717, MN908947"
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={!accessionId.trim() || loading}>
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
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
