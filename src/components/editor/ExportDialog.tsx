'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { exportGenBank, exportFASTA } from '@/services/file/exporter'
import { downloadFile } from '@/lib/downloadFile'
import { Download, FolderOpen } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportFormat = 'genbank' | 'fasta'

const FORMAT_INFO: Record<ExportFormat, { label: string; ext: string; mime: string }> = {
  genbank: { label: 'GenBank (.gb)', ext: '.gb', mime: 'text/plain' },
  fasta: { label: 'FASTA (.fa)', ext: '.fa', mime: 'text/plain' },
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const sequence = useSequenceStore((s) => s.sequence)
  const isProjectOpen = useProjectStore((s) => s.isOpen)
  const projectName = useProjectStore((s) => s.projectName)

  const [filename, setFilename] = useState('')
  const [format, setFormat] = useState<ExportFormat>('genbank')

  useEffect(() => {
    if (open && sequence) {
      setFilename(sequence.name)
    }
  }, [open, sequence])

  if (!sequence) return null

  const handleExport = async () => {
    const name = filename.trim() || sequence.name
    const info = FORMAT_INFO[format]
    const content = format === 'genbank' ? exportGenBank(sequence) : exportFASTA(sequence)

    // If a project is open, save to project folder by default
    if (isProjectOpen) {
      const safeName = name.replace(/[^a-zA-Z0-9_\-. ]/g, '_')
      const project = useProjectStore.getState()
      try {
        const seqDir = await project.directoryHandle!.getDirectoryHandle('sequences', { create: true })
        const fileHandle = await seqDir.getFileHandle(`${safeName}${info.ext}`, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(content)
        await writable.close()
        onOpenChange(false)
        return
      } catch (err) {
        console.error('Failed to save to project:', err)
        // Fall through to file picker
      }
    }

    // Use file picker so user can choose where to save
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${name}${info.ext}`,
        types: [
          {
            description: info.label,
            accept: { [info.mime]: [info.ext] },
          },
        ],
      })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return
      console.error('Failed to save file:', err)
      downloadFile(content, `${name}${info.ext}`, info.mime)
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1a1a1a]">
          <Download className="h-5 w-5 text-emerald-400" />
          Export Sequence
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Choose a filename and format.
          {isProjectOpen && (
            <span className="ml-1 text-emerald-600">
              Saving to project folder ({projectName}).
            </span>
          )}
        </DialogDescription>

        <div className="mt-2 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6b6560]">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full rounded-md border border-[#e8e5df] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#9c9690] focus:border-emerald-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleExport() }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6b6560]">Format</label>
            <div className="flex gap-2">
              {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO[ExportFormat]][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      format === key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#eae7e1] text-[#6b6560] hover:bg-[#e8e5df]'
                    }`}
                  >
                    {info.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="text-xs text-[#9c9690]">
            {sequence.length.toLocaleString()} bp · {sequence.isCircular ? 'circular' : 'linear'} · {sequence.features.length} feature{sequence.features.length !== 1 ? 's' : ''}
          </div>

          {isProjectOpen && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <FolderOpen className="h-3.5 w-3.5" />
              Will save to: {projectName}/sequences/
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
