'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FEATURE_COLORS } from '@/lib/constants'
import { useFeatureLibraryStore } from '@/stores/useFeatureLibraryStore'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { Trash2, Plus, Download } from 'lucide-react'
import type { FeatureType } from '@/types'

const FEATURE_TYPES: FeatureType[] = [
  'CDS',
  'gene',
  'promoter',
  'terminator',
  'rep_origin',
  'primer_bind',
  'regulatory',
  'protein_bind',
  'misc_feature',
]

interface FeatureLibraryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeatureLibraryPanel({
  open,
  onOpenChange,
}: FeatureLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<FeatureType>('CDS')
  const [newSequence, setNewSequence] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const features = useFeatureLibraryStore((s) => s.features)
  const addFeature = useFeatureLibraryStore((s) => s.addFeature)
  const removeFeature = useFeatureLibraryStore((s) => s.removeFeature)
  const searchFeatures = useFeatureLibraryStore((s) => s.searchFeatures)
  const sequence = useSequenceStore((s) => s.sequence)
  const selectedRange = useEditorStore((s) => s.selectedRange)

  const displayedFeatures = searchQuery
    ? searchFeatures(searchQuery)
    : features

  const handleInsert = (libraryFeature: { sequence: string; name: string; type: FeatureType; color?: string }) => {
    const seq = useSequenceStore.getState().sequence
    if (!seq) return
    const sel = useEditorStore.getState().selectedRange
    const pos = sel ? sel.start : seq.length
    useSequenceStore.getState().insertBases(pos, libraryFeature.sequence)
    useSequenceStore.getState().addFeature({
      name: libraryFeature.name,
      type: libraryFeature.type,
      start: pos,
      end: pos + libraryFeature.sequence.length - 1,
      strand: 1,
      color: libraryFeature.color,
      annotations: [],
    })
  }

  const handleSaveFromSequence = (feature: {
    name: string
    type: FeatureType
    start: number
    end: number
    color?: string
  }) => {
    if (!sequence) return
    const bases = sequence.bases.slice(feature.start, feature.end + 1)
    addFeature({
      name: feature.name,
      type: feature.type,
      sequence: bases,
      color: feature.color,
      notes: `Extracted from ${sequence.name}`,
    })
  }

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newSequence.trim()) return
    addFeature({
      name: newName.trim(),
      type: newType,
      sequence: newSequence.trim().toUpperCase(),
      notes: newNotes.trim(),
    })
    setNewName('')
    setNewType('CDS')
    setNewSequence('')
    setNewNotes('')
    setShowAddForm(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
          Feature Library
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Save and reuse features across your sequences.
        </DialogDescription>

        <Tabs defaultValue="library" className="mt-2">
          <TabsList>
            <TabsTrigger value="library">My Library</TabsTrigger>
            <TabsTrigger value="sequence">From Sequence</TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search features..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>

              {showAddForm && (
                <form
                  onSubmit={handleAddNew}
                  className="space-y-2 rounded-md border border-[#e8e5df] p-3"
                >
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Feature name"
                    autoFocus
                  />
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as FeatureType)}
                    className="flex h-9 w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-1 text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {FEATURE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={newSequence}
                    onChange={(e) => setNewSequence(e.target.value)}
                    placeholder="Sequence (e.g. ATGCGATCG...)"
                    className="flex w-full rounded-md border border-[#e8e5df] bg-[#f5f3ee] px-3 py-2 font-mono text-sm text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    rows={3}
                  />
                  <Input
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Notes (optional)"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newName.trim() || !newSequence.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </form>
              )}

              <div className="max-h-60 overflow-y-auto">
                {displayedFeatures.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#9c9690]">
                    {searchQuery
                      ? 'No matching features'
                      : 'No features saved yet'}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {displayedFeatures.map((f) => (
                      <li
                        key={f.id}
                        className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[#eae7e1]"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              f.color ?? FEATURE_COLORS[f.type] ?? '#666',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[#1a1a1a]">{f.name}</div>
                          <div className="text-[#9c9690]">
                            {f.sequence.length} bp
                          </div>
                        </div>
                        <Badge variant="outline">{f.type}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleInsert(f)}
                          title="Insert at cursor"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => removeFeature(f.id)}
                          title="Delete from library"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sequence">
            <div className="max-h-72 overflow-y-auto">
              {!sequence || sequence.features.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#9c9690]">
                  No features on current sequence
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
                            f.color ?? FEATURE_COLORS[f.type] ?? '#666',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[#1a1a1a]">{f.name}</div>
                        <div className="text-[#9c9690]">
                          {f.start + 1}..{f.end + 1}
                        </div>
                      </div>
                      <Badge variant="outline">{f.type}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleSaveFromSequence(f)}
                      >
                        Save to Library
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
