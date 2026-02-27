import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { LibraryFeature, FeatureType } from '@/types'
import { useProjectStore } from './useProjectStore'

const STORAGE_KEY = 'cyw:feature-library'

function loadFromStorage(): LibraryFeature[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(features: LibraryFeature[]) {
  // Always save to localStorage as fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features))
  }
  // Also save to project directory if one is open
  const project = useProjectStore.getState()
  if (project.isOpen) {
    project.saveFeatureLibrary(features)
  }
}

interface FeatureLibraryState {
  features: LibraryFeature[]
  addFeature: (feat: {
    name: string
    type: FeatureType
    sequence: string
    color?: string
    notes: string
  }) => void
  removeFeature: (id: string) => void
  searchFeatures: (query: string) => LibraryFeature[]
  loadFromProject: () => Promise<void>
}

export const useFeatureLibraryStore = create<FeatureLibraryState>()(
  (set, get) => ({
    features: loadFromStorage(),

    addFeature: (feat) => {
      const newFeature: LibraryFeature = {
        ...feat,
        id: uuid(),
        createdAt: new Date().toISOString(),
      }
      set((s) => {
        const updated = [...s.features, newFeature]
        persist(updated)
        return { features: updated }
      })
    },

    removeFeature: (id) => {
      set((s) => {
        const updated = s.features.filter((f) => f.id !== id)
        persist(updated)
        return { features: updated }
      })
    },

    searchFeatures: (query) => {
      const q = query.toLowerCase()
      return get().features.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q) ||
          f.notes.toLowerCase().includes(q),
      )
    },

    loadFromProject: async () => {
      const project = useProjectStore.getState()
      if (!project.isOpen) return
      const features = await project.loadFeatureLibrary()
      if (features.length > 0) {
        set({ features })
        // Also sync to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(features))
        }
      }
    },
  }),
)
