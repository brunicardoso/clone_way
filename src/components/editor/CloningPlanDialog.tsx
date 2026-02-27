'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useTabStore } from '@/stores/useTabStore'
import {
  COMMON_ENZYMES,
  findRestrictionSites,
} from '@/services/bio/enzymes'
import {
  planRestrictionLigation,
  planGibsonAssembly,
  planGoldenGate,
  planMutagenesis,
  designMutagenesisPrimers,
} from '@/services/bio/cloning'
import type { CloningPlan, CloningMethod } from '@/types'
import {
  GitMerge,
  Scissors,
  Combine,
  FlaskConical,
  Dna,
  Check,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'

interface CloningPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const METHOD_TABS: { method: CloningMethod; label: string; icon: typeof Scissors }[] = [
  { method: 'restriction-ligation', label: 'Restriction/Ligation', icon: Scissors },
  { method: 'gibson', label: 'Gibson Assembly', icon: Combine },
  { method: 'golden-gate', label: 'Golden Gate', icon: FlaskConical },
  { method: 'site-directed-mutagenesis', label: 'Mutagenesis', icon: Dna },
]

const STEP_ICONS: Record<string, string> = {
  digest: '✂️',
  pcr: '🔬',
  ligate: '🔗',
  transform: '🧫',
  mutate: '🧬',
  dpni: '🧹',
}

export function CloningPlanDialog({ open, onOpenChange }: CloningPlanDialogProps) {
  const sequence = useSequenceStore((s) => s.sequence)
  const tabs = useTabStore((s) => s.tabs)

  const [method, setMethod] = useState<CloningMethod>('restriction-ligation')
  const [result, setResult] = useState<CloningPlan | null>(null)

  // Restriction/Ligation state
  const [selectedInsertId, setSelectedInsertId] = useState<string>('')
  const [enzyme5, setEnzyme5] = useState('')
  const [enzyme3, setEnzyme3] = useState('')

  // Gibson state
  const [selectedFragmentIds, setSelectedFragmentIds] = useState<string[]>([])
  const [overlapLength, setOverlapLength] = useState(30)

  // Golden Gate state
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([])
  const [goldenGateEnzyme, setGoldenGateEnzyme] = useState<'BsaI' | 'BpiI'>('BsaI')

  // Mutagenesis state
  const [mutPosition, setMutPosition] = useState('')
  const [mutNewBases, setMutNewBases] = useState('')

  // Available sequences from tabs (other than current)
  const otherSequences = useMemo(() => {
    if (!sequence) return []
    return tabs.filter((t) => t.id !== sequence.id).map((t) => t.sequence)
  }, [tabs, sequence])

  // Enzymes that cut both vector and insert (for restriction/ligation)
  const commonEnzymes = useMemo(() => {
    if (!sequence || !selectedInsertId) return []
    const insertTab = tabs.find((t) => t.id === selectedInsertId)
    if (!insertTab) return []

    const results: { name: string; recSeq: string; vectorCuts: number; insertCuts: number }[] = []
    for (const enzyme of COMMON_ENZYMES) {
      const vSites = findRestrictionSites(sequence.bases, enzyme)
      const iSites = findRestrictionSites(insertTab.sequence.bases, enzyme)
      if (vSites.length > 0 && iSites.length > 0) {
        results.push({
          name: enzyme.name,
          recSeq: enzyme.recognitionSequence,
          vectorCuts: vSites.length,
          insertCuts: iSites.length,
        })
      }
    }
    return results.sort((a, b) => a.name.localeCompare(b.name))
  }, [sequence, selectedInsertId, tabs])

  const handleReset = () => {
    setResult(null)
    setSelectedInsertId('')
    setEnzyme5('')
    setEnzyme3('')
    setSelectedFragmentIds([])
    setSelectedPartIds([])
    setMutPosition('')
    setMutNewBases('')
  }

  const handleExecute = () => {
    if (!sequence) return

    try {
      let plan: CloningPlan

      switch (method) {
        case 'restriction-ligation': {
          const insertTab = tabs.find((t) => t.id === selectedInsertId)
          if (!insertTab || !enzyme5 || !enzyme3) return
          plan = planRestrictionLigation(sequence, insertTab.sequence, enzyme5, enzyme3)
          break
        }
        case 'gibson': {
          const fragments = selectedFragmentIds
            .map((id) => tabs.find((t) => t.id === id))
            .filter((t): t is NonNullable<typeof t> => !!t)
            .map((t) => t.sequence)
          if (fragments.length < 2) return
          plan = planGibsonAssembly(fragments, overlapLength)
          break
        }
        case 'golden-gate': {
          const parts = [sequence, ...selectedPartIds
            .map((id) => tabs.find((t) => t.id === id))
            .filter((t): t is NonNullable<typeof t> => !!t)
            .map((t) => t.sequence)]
          plan = planGoldenGate(parts, goldenGateEnzyme)
          break
        }
        case 'site-directed-mutagenesis': {
          const pos = parseInt(mutPosition, 10) - 1 // 1-based to 0-based
          if (isNaN(pos) || pos < 0 || !mutNewBases.trim()) return
          plan = planMutagenesis(sequence, pos, mutNewBases.trim().toUpperCase())
          break
        }
        default:
          return
      }

      setResult(plan)
    } catch (err) {
      alert(`Cloning plan error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleOpenProduct = () => {
    if (!result) return
    useTabStore.getState().openTab(result.product)
    onOpenChange(false)
  }

  const canExecute = (): boolean => {
    if (!sequence) return false
    switch (method) {
      case 'restriction-ligation':
        return !!selectedInsertId && !!enzyme5 && !!enzyme3
      case 'gibson':
        return selectedFragmentIds.length >= 2
      case 'golden-gate':
        return selectedPartIds.length >= 1
      case 'site-directed-mutagenesis': {
        const pos = parseInt(mutPosition, 10)
        return !isNaN(pos) && pos > 0 && !!mutNewBases.trim()
      }
    }
  }

  // Primer preview for mutagenesis
  const primerPreview = useMemo(() => {
    if (method !== 'site-directed-mutagenesis' || !sequence || !mutPosition || !mutNewBases.trim()) return null
    const pos = parseInt(mutPosition, 10) - 1
    if (isNaN(pos) || pos < 0 || pos >= sequence.length) return null
    const newB = mutNewBases.trim().toUpperCase()
    const end = pos + newB.length - 1
    if (end >= sequence.length) return null
    try {
      return designMutagenesisPrimers(sequence.bases, pos, end, newB)
    } catch {
      return null
    }
  }, [method, sequence, mutPosition, mutNewBases])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleReset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1a1a1a]">
          <GitMerge className="h-5 w-5 text-indigo-500" />
          Cloning Plan
        </DialogTitle>
        <DialogDescription className="text-sm text-[#6b6560]">
          Design a cloning strategy for your construct.
        </DialogDescription>

        {!result ? (
          <div className="mt-3 flex flex-1 flex-col overflow-hidden">
            {/* Method tabs */}
            <div className="mb-3 flex gap-1 rounded-md border border-[#e8e5df] bg-[#f5f3ee] p-1">
              {METHOD_TABS.map(({ method: m, label, icon: Icon }) => (
                <button
                  key={m}
                  onClick={() => { setMethod(m); setResult(null) }}
                  className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${
                    method === m
                      ? 'bg-white text-[#1a1a1a] shadow-sm'
                      : 'text-[#6b6560] hover:text-[#1a1a1a]'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Method-specific inputs */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {method === 'restriction-ligation' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Vector (current sequence)
                    </label>
                    <div className="rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a]">
                      {sequence?.name ?? 'No sequence loaded'} ({sequence?.length.toLocaleString()} bp)
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">Insert (from tabs)</label>
                    <select
                      value={selectedInsertId}
                      onChange={(e) => { setSelectedInsertId(e.target.value); setEnzyme5(''); setEnzyme3('') }}
                      className="w-full rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">Select insert...</option>
                      {otherSequences.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.length.toLocaleString()} bp)</option>
                      ))}
                    </select>
                  </div>
                  {selectedInsertId && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#6b6560]">5&apos; Enzyme</label>
                        <select
                          value={enzyme5}
                          onChange={(e) => setEnzyme5(e.target.value)}
                          className="w-full rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:border-indigo-400"
                        >
                          <option value="">Select enzyme...</option>
                          {commonEnzymes.map((e) => (
                            <option key={e.name} value={e.name}>
                              {e.name} ({e.recSeq}) — V:{e.vectorCuts}× I:{e.insertCuts}×
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#6b6560]">3&apos; Enzyme</label>
                        <select
                          value={enzyme3}
                          onChange={(e) => setEnzyme3(e.target.value)}
                          className="w-full rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:border-indigo-400"
                        >
                          <option value="">Select enzyme...</option>
                          {commonEnzymes.map((e) => (
                            <option key={e.name} value={e.name}>
                              {e.name} ({e.recSeq}) — V:{e.vectorCuts}× I:{e.insertCuts}×
                            </option>
                          ))}
                        </select>
                      </div>
                      {commonEnzymes.length === 0 && (
                        <div className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          No common restriction sites found between vector and insert.
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {method === 'gibson' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Select 2+ fragments from open tabs
                    </label>
                    <div className="rounded border border-[#e8e5df] max-h-40 overflow-y-auto">
                      {tabs.map((t) => (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#f5f3ee] ${
                            selectedFragmentIds.includes(t.id) ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFragmentIds.includes(t.id)}
                            onChange={() => {
                              setSelectedFragmentIds((prev) =>
                                prev.includes(t.id)
                                  ? prev.filter((id) => id !== t.id)
                                  : [...prev, t.id],
                              )
                            }}
                            className="accent-indigo-500"
                          />
                          <span className="font-mono">{t.name}</span>
                          <span className="ml-auto text-[10px] text-[#9c9690]">{t.sequence.length.toLocaleString()} bp</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Overlap length (bp)
                    </label>
                    <input
                      type="number"
                      value={overlapLength}
                      onChange={(e) => setOverlapLength(Math.max(15, Math.min(60, parseInt(e.target.value) || 30)))}
                      min={15}
                      max={60}
                      className="w-24 rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </>
              )}

              {method === 'golden-gate' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Destination vector (current sequence)
                    </label>
                    <div className="rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a]">
                      {sequence?.name ?? 'No sequence loaded'}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Type IIS Enzyme
                    </label>
                    <div className="flex gap-2">
                      {(['BsaI', 'BpiI'] as const).map((e) => (
                        <button
                          key={e}
                          onClick={() => setGoldenGateEnzyme(e)}
                          className={`rounded border px-3 py-1.5 text-xs font-mono transition-colors ${
                            goldenGateEnzyme === e
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                              : 'border-[#e8e5df] text-[#6b6560] hover:border-indigo-300'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Additional parts from tabs
                    </label>
                    <div className="rounded border border-[#e8e5df] max-h-40 overflow-y-auto">
                      {otherSequences.map((t) => (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#f5f3ee] ${
                            selectedPartIds.includes(t.id) ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPartIds.includes(t.id)}
                            onChange={() => {
                              setSelectedPartIds((prev) =>
                                prev.includes(t.id)
                                  ? prev.filter((id) => id !== t.id)
                                  : [...prev, t.id],
                              )
                            }}
                            className="accent-indigo-500"
                          />
                          <span className="font-mono">{t.name}</span>
                          <span className="ml-auto text-[10px] text-[#9c9690]">{t.length.toLocaleString()} bp</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {method === 'site-directed-mutagenesis' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Template (current sequence)
                    </label>
                    <div className="rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a]">
                      {sequence?.name ?? 'No sequence loaded'} ({sequence?.length.toLocaleString()} bp)
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      Mutation position (1-based)
                    </label>
                    <input
                      type="number"
                      value={mutPosition}
                      onChange={(e) => setMutPosition(e.target.value)}
                      min={1}
                      max={sequence?.length ?? 1}
                      placeholder="e.g., 150"
                      className="w-full rounded border border-[#e8e5df] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] placeholder:text-[#9c9690] focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6560]">
                      New bases (replacement)
                    </label>
                    <input
                      type="text"
                      value={mutNewBases}
                      onChange={(e) => setMutNewBases(e.target.value.replace(/[^ATGCatgcNn]/g, ''))}
                      placeholder="e.g., GCT"
                      className="w-full rounded border border-[#e8e5df] bg-white px-3 py-1.5 font-mono text-xs text-[#1a1a1a] placeholder:text-[#9c9690] focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  {mutPosition && mutNewBases && sequence && (
                    <div className="rounded bg-[#f5f3ee] p-3 text-xs">
                      <div className="mb-1 font-medium text-[#6b6560]">Mutation preview:</div>
                      <div className="font-mono text-[10px]">
                        <span className="text-[#9c9690]">Original: </span>
                        <span className="text-red-500">
                          {sequence.bases.slice(
                            Math.max(0, parseInt(mutPosition) - 1),
                            parseInt(mutPosition) - 1 + (mutNewBases.length || 1),
                          ).toUpperCase()}
                        </span>
                        <span className="mx-2">→</span>
                        <span className="text-emerald-600">{mutNewBases.toUpperCase()}</span>
                      </div>
                    </div>
                  )}
                  {primerPreview && (
                    <div className="rounded border border-[#e8e5df] bg-white p-3 text-xs">
                      <div className="mb-1.5 font-medium text-[#6b6560]">Primer design:</div>
                      <div className="space-y-1 font-mono text-[10px]">
                        <div>
                          <span className="text-[#9c9690]">Fwd: </span>
                          <span className="text-[#1a1a1a]">{primerPreview.forward}</span>
                          <span className="ml-2 text-[#9c9690]">Tm: {primerPreview.forwardTm}°C</span>
                        </div>
                        <div>
                          <span className="text-[#9c9690]">Rev: </span>
                          <span className="text-[#1a1a1a]">{primerPreview.reverse}</span>
                          <span className="ml-2 text-[#9c9690]">Tm: {primerPreview.reverseTm}°C</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExecute} disabled={!canExecute()}>
                <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                Plan Cloning
              </Button>
            </div>
          </div>
        ) : (
          /* Results phase */
          <div className="mt-3 flex flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              <Check className="h-3.5 w-3.5" />
              <span>{result.name}</span>
            </div>

            {/* Step-by-step plan */}
            <div className="flex-1 overflow-y-auto rounded-md border border-[#e8e5df] max-h-60">
              {result.steps.map((step, i) => (
                <div
                  key={step.id}
                  className="flex items-start gap-2 border-b border-[#e8e5df] px-3 py-2 last:border-b-0"
                >
                  <span className="mt-0.5 text-sm">{STEP_ICONS[step.type] ?? '📋'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#1a1a1a]">
                      <span className="text-[#9c9690]">Step {i + 1}:</span>
                      <span className="capitalize">{step.type}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-[#6b6560]">{step.description}</div>
                    {Object.keys(step.parameters).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(step.parameters).map(([k, v]) => (
                          <span key={k} className="rounded bg-[#f5f3ee] px-1.5 py-0.5 font-mono text-[9px] text-[#6b6560]">
                            {k}: {v.length > 30 ? v.slice(0, 30) + '...' : v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Product summary */}
            <div className="mt-2 rounded bg-emerald-50 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-emerald-700">
                <ChevronRight className="h-3 w-3" />
                Product: {result.product.name}
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-600">
                {result.product.length.toLocaleString()} bp
                {result.product.isCircular ? ' (circular)' : ' (linear)'}
                {result.product.features.length > 0 && ` · ${result.product.features.length} features`}
              </div>
            </div>

            <div className="mt-3 flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                New Plan
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={handleOpenProduct}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open Product
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
