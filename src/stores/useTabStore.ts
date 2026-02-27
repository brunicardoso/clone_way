import { create } from 'zustand'
import type { Sequence } from '@/types'
import { useSequenceStore } from './useSequenceStore'

interface Tab {
  id: string
  name: string
  sequence: Sequence
}

interface TabState {
  tabs: Tab[]
  activeTabId: string | null
  splitTabId: string | null

  openTab: (seq: Sequence) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setSplitTab: (id: string | null) => void
  syncActiveSequence: () => void
  saveActiveTabState: () => void
}

export const useTabStore = create<TabState>()((set, get) => ({
  tabs: [],
  activeTabId: null,
  splitTabId: null,

  openTab: (seq) => {
    const existing = get().tabs.find((t) => t.id === seq.id)
    if (existing) {
      // Already open, just switch to it
      get().setActiveTab(seq.id)
      return
    }

    // Save current tab state before switching
    get().saveActiveTabState()

    set((s) => ({
      tabs: [...s.tabs, { id: seq.id, name: seq.name, sequence: seq }],
      activeTabId: seq.id,
    }))

    // Load into the sequence store
    useSequenceStore.getState().loadSequence(seq)
  },

  closeTab: (id) => {
    const { tabs, activeTabId, splitTabId } = get()
    const filtered = tabs.filter((t) => t.id !== id)

    let newActiveId = activeTabId
    if (activeTabId === id) {
      const idx = tabs.findIndex((t) => t.id === id)
      const next = filtered[Math.min(idx, filtered.length - 1)]
      newActiveId = next?.id ?? null
    }

    let newSplitId = splitTabId
    if (splitTabId === id) {
      newSplitId = null
    }

    set({ tabs: filtered, activeTabId: newActiveId, splitTabId: newSplitId })

    if (newActiveId) {
      const tab = filtered.find((t) => t.id === newActiveId)
      if (tab) {
        useSequenceStore.getState().loadSequence(tab.sequence)
      }
    } else {
      useSequenceStore.getState().clear()
    }
  },

  setActiveTab: (id) => {
    // Save current tab state before switching
    get().saveActiveTabState()

    set({ activeTabId: id })

    const tab = get().tabs.find((t) => t.id === id)
    if (tab) {
      useSequenceStore.getState().loadSequence(tab.sequence)
    }
  },

  setSplitTab: (id) => set({ splitTabId: id }),

  syncActiveSequence: () => {
    // Sync current sequence store state back into the active tab
    const { activeTabId, tabs } = get()
    const current = useSequenceStore.getState().sequence
    if (!activeTabId || !current) return

    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, name: current.name, sequence: current }
          : t,
      ),
    })
  },

  saveActiveTabState: () => {
    const { activeTabId, tabs } = get()
    const current = useSequenceStore.getState().sequence
    if (!activeTabId || !current) return

    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, name: current.name, sequence: current }
          : t,
      ),
    })
  },
}))
