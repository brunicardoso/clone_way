'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, ZoomIn, ZoomOut, Upload } from 'lucide-react'
import { ChromatogramViewer } from './ChromatogramViewer'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useTabStore } from '@/stores/useTabStore'
import { v4 as uuid } from 'uuid'
import type { ChromatogramData } from '@/services/bio/abif'
import type { Sequence } from '@/types'

interface ChromatogramPanelProps {
  data: ChromatogramData
  onClose: () => void
}

export function ChromatogramPanel({ data, onClose }: ChromatogramPanelProps) {
  const [pixelsPerPoint, setPixelsPerPoint] = useState(2)

  const handleZoomIn = () =>
    setPixelsPerPoint((p) => Math.min(10, p + 0.5))
  const handleZoomOut = () =>
    setPixelsPerPoint((p) => Math.max(0.5, p - 0.5))

  const handleLoadBaseCalls = () => {
    const now = new Date().toISOString()
    const seq: Sequence = {
      id: uuid(),
      name: data.name,
      description: `Base calls from ${data.name}`,
      bases: data.baseCalls.toUpperCase(),
      isCircular: false,
      length: data.baseCalls.length,
      features: [],
      restrictionSites: [],
      orfs: [],
      annotations: [],
      createdAt: now,
      updatedAt: now,
    }
    useSequenceStore.getState().loadSequence(seq)
    useTabStore.getState().openTab(seq)
  }

  return (
    <div className="flex flex-col border-t border-[#e8e5df] bg-[#faf9f5]">
      <div className="flex items-center justify-between border-b border-[#e8e5df] px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">
            Chromatogram
          </h3>
          <span className="text-xs text-[#9c9690]">
            {data.name} &middot; {data.baseCalls.length} bases
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadBaseCalls}
            title="Open chromatogram base calls as an editable sequence"
            className="ml-2 gap-1"
          >
            <Upload className="h-3 w-3" />
            Open as Sequence
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ChromatogramViewer data={data} pixelsPerPoint={pixelsPerPoint} />
    </div>
  )
}
