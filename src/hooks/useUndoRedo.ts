'use client'

import { useSequenceStore } from '@/stores/useSequenceStore'
import { useStoreWithEqualityFn } from 'zustand/traditional'

export function useUndoRedo() {
  const temporalStore = useSequenceStore.temporal
  const { undo, redo, pastStates, futureStates } = useStoreWithEqualityFn(
    temporalStore,
    (state) => ({
      undo: state.undo,
      redo: state.redo,
      pastStates: state.pastStates,
      futureStates: state.futureStates,
    }),
  )

  return {
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  }
}
