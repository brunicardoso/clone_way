import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'
import type { Sequence, Feature, ORF, RestrictionSite } from '@/types'
import { MAX_UNDO_STEPS } from '@/lib/constants'

interface SequenceState {
  sequence: Sequence | null
  isDirty: boolean
  loadSequence: (seq: Sequence) => void
  updateSequenceBases: (bases: string) => void
  addFeature: (feature: Omit<Feature, 'id'>) => void
  removeFeature: (featureId: string) => void
  updateFeature: (featureId: string, updates: Partial<Pick<Feature, 'name' | 'color' | 'type'>>) => void
  deleteRange: (start: number, end: number) => void
  insertBases: (position: number, bases: string) => void
  updateOrfs: (orfs: ORF[]) => void
  updateRestrictionSites: (sites: RestrictionSite[]) => void
  toggleCircular: () => void
  commitChanges: () => void
  clear: () => void
}

export const useSequenceStore = create<SequenceState>()(
  temporal(
    immer((set) => ({
      sequence: null,
      isDirty: false,

      loadSequence: (seq) =>
        set((state) => {
          state.sequence = seq
          state.isDirty = false
        }),

      updateSequenceBases: (bases) =>
        set((state) => {
          if (state.sequence) {
            state.sequence.bases = bases
            state.sequence.length = bases.length
            state.isDirty = true
          }
        }),

      addFeature: (feature) =>
        set((state) => {
          if (state.sequence) {
            state.sequence.features.push({ ...feature, id: uuidv4() })
            state.isDirty = true
          }
        }),

      removeFeature: (featureId) =>
        set((state) => {
          if (state.sequence) {
            state.sequence.features = state.sequence.features.filter(
              (f) => f.id !== featureId,
            )
            state.isDirty = true
          }
        }),

      updateFeature: (featureId, updates) =>
        set((state) => {
          if (!state.sequence) return
          const f = state.sequence.features.find((f) => f.id === featureId)
          if (f) {
            Object.assign(f, updates)
            state.isDirty = true
          }
        }),

      deleteRange: (start, end) =>
        set((state) => {
          if (!state.sequence) return
          const seqLen = state.sequence.bases.length
          // Handle circular wraparound deletion (start > end)
          if (start > end) {
            // Remove from start..seqLen-1 and 0..end
            state.sequence.bases =
              state.sequence.bases.slice(end + 1, start)
            state.sequence.length = state.sequence.bases.length
            // For wraparound deletion, remove all features (too complex to shift reliably)
            state.sequence.features = state.sequence.features.filter(
              (f) => f.start >= end + 1 && f.end < start,
            ).map((f) => ({
              ...f,
              start: f.start - (end + 1),
              end: f.end - (end + 1),
            }))
          } else {
            const len = end - start + 1
            state.sequence.bases =
              state.sequence.bases.slice(0, start) +
              state.sequence.bases.slice(end + 1)
            state.sequence.length = state.sequence.bases.length
            // Shift features
            state.sequence.features = state.sequence.features
              .filter((f) => !(f.start >= start && f.end <= end)) // remove contained
              .map((f) => {
                if (f.start > end) {
                  return { ...f, start: f.start - len, end: f.end - len }
                }
                if (f.end > end) {
                  return { ...f, end: f.end - len }
                }
                return f
              })
          }
          // Clear computed data (invalidated by edit)
          state.sequence.restrictionSites = []
          state.sequence.orfs = []
          state.isDirty = true
        }),

      insertBases: (position, bases) =>
        set((state) => {
          if (!state.sequence) return
          const len = bases.length
          state.sequence.bases =
            state.sequence.bases.slice(0, position) +
            bases +
            state.sequence.bases.slice(position)
          state.sequence.length = state.sequence.bases.length
          // Shift features
          state.sequence.features = state.sequence.features.map((f) => {
            if (f.start >= position) {
              return { ...f, start: f.start + len, end: f.end + len }
            }
            if (f.end >= position) {
              return { ...f, end: f.end + len }
            }
            return f
          })
          // Clear computed data
          state.sequence.restrictionSites = []
          state.sequence.orfs = []
          state.isDirty = true
        }),

      updateOrfs: (orfs) =>
        set((state) => {
          if (state.sequence) {
            state.sequence.orfs = orfs
          }
        }),

      updateRestrictionSites: (sites) =>
        set((state) => {
          if (state.sequence) {
            state.sequence.restrictionSites = sites
          }
        }),

      toggleCircular: () =>
        set((state) => {
          if (state.sequence) {
            state.sequence.isCircular = !state.sequence.isCircular
            state.isDirty = true
          }
        }),

      commitChanges: () =>
        set((state) => {
          if (state.sequence) {
            state.sequence.updatedAt = new Date().toISOString()
            state.isDirty = false
          }
        }),

      clear: () =>
        set((state) => {
          state.sequence = null
          state.isDirty = false
        }),
    })),
    {
      limit: MAX_UNDO_STEPS,
      partialize: (state) => ({
        sequence: state.sequence,
      }),
    },
  ),
)
