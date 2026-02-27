'use client'

import { useState } from 'react'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { useFeatureLibraryStore } from '@/stores/useFeatureLibraryStore'
import { Badge } from '@/components/ui/Badge'
import { COLOR_PALETTES } from '@/lib/theme'
import { X, BookOpen, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FeatureLibraryPanel } from './FeatureLibraryPanel'

export function FeaturePanel() {
  const sequence = useSequenceStore((s) => s.sequence)
  const featurePanelOpen = useEditorStore((s) => s.featurePanelOpen)
  const toggleFeaturePanel = useEditorStore((s) => s.toggleFeaturePanel)
  const colorPalette = useEditorStore((s) => s.colorPalette)
  const addFeatureToLibrary = useFeatureLibraryStore((s) => s.addFeature)
  const [libraryOpen, setLibraryOpen] = useState(false)

  if (!featurePanelOpen) return null
  if (!sequence || sequence.features.length === 0) return null

  const handleSaveToLibrary = (f: {
    name: string
    type: import('@/types').FeatureType
    start: number
    end: number
    color?: string
  }) => {
    if (!sequence) return
    // Handle wraparound features on circular sequences
    const bases = f.start <= f.end
      ? sequence.bases.slice(f.start, f.end + 1)
      : sequence.bases.slice(f.start) + sequence.bases.slice(0, f.end + 1)
    addFeatureToLibrary({
      name: f.name,
      type: f.type,
      sequence: bases,
      color: f.color,
      notes: `Extracted from ${sequence.name}`,
    })
  }

  return (
    <aside className="flex w-64 flex-col border-l border-[#e8e5df] bg-[#f5f3ee]">
      <div className="flex items-center justify-between border-b border-[#e8e5df] px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9c9690]">
          Features
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLibraryOpen(true)}
            title="Feature Library"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFeaturePanel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!sequence || sequence.features.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[#9c9690]">
            No features to display
          </p>
        ) : (
          <ul className="space-y-1">
            {sequence.features.map((f) => (
              <li
                key={f.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[#eae7e1]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      f.color ?? COLOR_PALETTES[colorPalette][f.type] ?? '#666',
                  }}
                />
                <span className="flex-1 truncate text-[#1a1a1a]">
                  {f.name}
                </span>
                <Badge variant="outline">{f.type}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={() => handleSaveToLibrary(f)}
                  title="Save to Library"
                >
                  <Save className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <FeatureLibraryPanel open={libraryOpen} onOpenChange={setLibraryOpen} />
    </aside>
  )
}
