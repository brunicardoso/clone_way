import { create } from 'zustand'
import type { Sequence } from '@/types'

interface RecentSequence {
  id: string
  name: string
  description: string
  length: number
  isCircular: boolean
  openedAt: string
}

interface AppState {
  theme: 'dark' | 'light'
  recentSequences: RecentSequence[]

  setTheme: (theme: 'dark' | 'light') => void
  addRecentSequence: (seq: Sequence) => void
  getStoredSequence: (id: string) => Sequence | null
  removeRecentSequence: (id: string) => void
  clearRecentSequences: () => void
}

const STORAGE_PREFIX = 'cyw:seq:'
const RECENT_KEY = 'cyw:recent'
const MAX_RECENT = 20

function loadRecent(): RecentSequence[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecent(items: RecentSequence[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(RECENT_KEY, JSON.stringify(items))
}

export const useAppStore = create<AppState>()((set, get) => ({
  theme: 'dark',
  recentSequences: loadRecent(),

  setTheme: (theme) => set({ theme }),

  addRecentSequence: (seq) => {
    // Store full sequence data locally in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PREFIX + seq.id, JSON.stringify(seq))
    }

    const entry: RecentSequence = {
      id: seq.id,
      name: seq.name,
      description: seq.description,
      length: seq.length,
      isCircular: seq.isCircular,
      openedAt: new Date().toISOString(),
    }

    const previous = get().recentSequences.filter((r) => r.id !== seq.id)
    const updated = [entry, ...previous].slice(0, MAX_RECENT)

    // Evict localStorage entries for sequences that fell off the list
    if (typeof window !== 'undefined') {
      const kept = new Set(updated.map((r) => r.id))
      for (const r of previous) {
        if (!kept.has(r.id)) {
          localStorage.removeItem(STORAGE_PREFIX + r.id)
        }
      }
    }

    saveRecent(updated)
    set({ recentSequences: updated })
  },

  getStoredSequence: (id) => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  removeRecentSequence: (id) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_PREFIX + id)
    }
    const updated = get().recentSequences.filter((r) => r.id !== id)
    saveRecent(updated)
    set({ recentSequences: updated })
  },

  clearRecentSequences: () => {
    if (typeof window !== 'undefined') {
      get().recentSequences.forEach((r) => {
        localStorage.removeItem(STORAGE_PREFIX + r.id)
      })
      localStorage.removeItem(RECENT_KEY)
    }
    set({ recentSequences: [] })
  },
}))
