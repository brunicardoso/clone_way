import { create } from 'zustand'
import type { Sequence, LibraryFeature } from '@/types'
import { exportGenBank } from '@/services/file/exporter'
import { importFile } from '@/services/file/importer'

interface ProjectMeta {
  name: string
  createdAt: string
  version: string
}

interface SessionState {
  openTabIds: string[]
  activeTabId: string | null
  viewMode: string
}

interface ProjectState {
  directoryHandle: FileSystemDirectoryHandle | null
  projectName: string | null
  isOpen: boolean
  isBusy: boolean

  openProject: () => Promise<void>
  createProject: (name: string) => Promise<void>
  closeProject: () => void
  saveSequence: (seq: Sequence) => Promise<void>
  deleteSequence: (name: string) => Promise<void>
  loadSequences: () => Promise<Sequence[]>
  saveFeatureLibrary: (features: LibraryFeature[]) => Promise<void>
  loadFeatureLibrary: () => Promise<LibraryFeature[]>
  saveSessionState: (state: SessionState) => Promise<void>
}

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

async function getOrCreateDir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true })
}

async function writeTextFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

async function readTextFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<string | null> {
  try {
    const fileHandle = await dir.getFileHandle(filename)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

async function deleteFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  try {
    await dir.removeEntry(filename)
  } catch {
    // File may not exist
  }
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  directoryHandle: null,
  projectName: null,
  isOpen: false,
  isBusy: false,

  openProject: async () => {
    if (!isSupported()) {
      alert('Your browser does not support the File System Access API. Please use Chrome or Edge.')
      return
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })

      // Validate: must contain project.json
      const metaContent = await readTextFile(handle, 'project.json')
      if (!metaContent) {
        alert('This folder does not appear to be a CYW project. No project.json found.')
        return
      }

      const meta: ProjectMeta = JSON.parse(metaContent)

      set({
        directoryHandle: handle,
        projectName: meta.name,
        isOpen: true,
      })
    } catch (err) {
      // User cancelled the picker or permission denied
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to open project:', err)
      }
    }
  },

  createProject: async (name: string) => {
    if (!isSupported()) {
      alert('Your browser does not support the File System Access API. Please use Chrome or Edge.')
      return
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })

      // Create project structure
      await getOrCreateDir(handle, 'sequences')
      await getOrCreateDir(handle, 'features')

      const meta: ProjectMeta = {
        name,
        createdAt: new Date().toISOString(),
        version: '1.0',
      }

      await writeTextFile(handle, 'project.json', JSON.stringify(meta, null, 2))

      set({
        directoryHandle: handle,
        projectName: name,
        isOpen: true,
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to create project:', err)
      }
    }
  },

  closeProject: () => {
    set({
      directoryHandle: null,
      projectName: null,
      isOpen: false,
    })
  },

  saveSequence: async (seq: Sequence) => {
    const { directoryHandle } = get()
    if (!directoryHandle) return

    try {
      set({ isBusy: true })
      const seqDir = await getOrCreateDir(directoryHandle, 'sequences')
      const safeName = seq.name.replace(/[^a-zA-Z0-9_\-. ]/g, '_')
      const content = exportGenBank(seq)
      await writeTextFile(seqDir, `${safeName}.gb`, content)
    } catch (err) {
      console.error('Failed to save sequence:', err)
    } finally {
      set({ isBusy: false })
    }
  },

  deleteSequence: async (name: string) => {
    const { directoryHandle } = get()
    if (!directoryHandle) return

    try {
      const seqDir = await getOrCreateDir(directoryHandle, 'sequences')
      const safeName = name.replace(/[^a-zA-Z0-9_\-. ]/g, '_')
      await deleteFile(seqDir, `${safeName}.gb`)
      await deleteFile(seqDir, `${safeName}.gbk`)
    } catch (err) {
      console.error('Failed to delete sequence:', err)
    }
  },

  loadSequences: async () => {
    const { directoryHandle } = get()
    if (!directoryHandle) return []

    try {
      set({ isBusy: true })
      const seqDir = await getOrCreateDir(directoryHandle, 'sequences')
      const sequences: Sequence[] = []

      for await (const entry of seqDir.values()) {
        if (entry.kind === 'file' && /\.(gb|gbk|genbank)$/i.test(entry.name)) {
          try {
            const file = await entry.getFile()
            const content = await file.text()
            const seq = importFile(entry.name, content)
            sequences.push(seq)
          } catch (err) {
            console.error(`Failed to load ${entry.name}:`, err)
          }
        }
      }

      return sequences
    } catch (err) {
      console.error('Failed to load sequences:', err)
      return []
    } finally {
      set({ isBusy: false })
    }
  },

  saveFeatureLibrary: async (features: LibraryFeature[]) => {
    const { directoryHandle } = get()
    if (!directoryHandle) return

    try {
      const featDir = await getOrCreateDir(directoryHandle, 'features')
      await writeTextFile(featDir, 'library.json', JSON.stringify(features, null, 2))
    } catch (err) {
      console.error('Failed to save feature library:', err)
    }
  },

  loadFeatureLibrary: async () => {
    const { directoryHandle } = get()
    if (!directoryHandle) return []

    try {
      const featDir = await getOrCreateDir(directoryHandle, 'features')
      const content = await readTextFile(featDir, 'library.json')
      if (!content) return []
      return JSON.parse(content) as LibraryFeature[]
    } catch {
      return []
    }
  },

  saveSessionState: async (state: SessionState) => {
    const { directoryHandle } = get()
    if (!directoryHandle) return

    try {
      await writeTextFile(directoryHandle, 'session.json', JSON.stringify(state, null, 2))
    } catch (err) {
      console.error('Failed to save session:', err)
    }
  },

}))
