'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSequenceStore } from '@/stores/useSequenceStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { findORFs } from '@/services/bio/orf'
import { findAllRestrictionSites } from '@/services/bio/enzymes'
import { useAppStore } from '@/stores/useAppStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTabStore } from '@/stores/useTabStore'

export function useCommandDispatch() {
  const router = useRouter()

  const dispatch = useCallback(
    (action: string) => {
      // Navigation actions
      if (action.startsWith('navigate:')) {
        const path = action.replace('navigate:', '')
        router.push(path)
        return
      }

      // Export actions — open the export dialog
      if (action.startsWith('export:') || action === 'export') {
        window.dispatchEvent(new CustomEvent('cyw:trigger-export'))
        return
      }

      switch (action) {
        case 'undo':
          useSequenceStore.temporal.getState().undo()
          break

        case 'redo':
          useSequenceStore.temporal.getState().redo()
          break

        case 'copy': {
          const seq = useSequenceStore.getState().sequence
          const sel = useEditorStore.getState().selectedRange
          if (!seq || !sel) return
          const bases = sel.wrapsAround
            ? seq.bases.slice(sel.start) + seq.bases.slice(0, sel.end + 1)
            : seq.bases.slice(sel.start, sel.end + 1)
          useEditorStore.getState().setClipboard(bases)
          navigator.clipboard?.writeText(bases)
          break
        }

        case 'cut': {
          const seq = useSequenceStore.getState().sequence
          const sel = useEditorStore.getState().selectedRange
          if (!seq || !sel) return
          const cutBases = sel.wrapsAround
            ? seq.bases.slice(sel.start) + seq.bases.slice(0, sel.end + 1)
            : seq.bases.slice(sel.start, sel.end + 1)
          useEditorStore.getState().setClipboard(cutBases)
          navigator.clipboard?.writeText(cutBases)
          useSequenceStore.getState().deleteRange(sel.start, sel.end)
          useEditorStore.getState().setSelectedRange(null)
          break
        }

        case 'paste': {
          // If in edit mode, let SequenceView's paste handler deal with it
          if (useEditorStore.getState().editMode) break

          const doPaste = (bases: string) => {
            const clean = bases.replace(/[^ATGCNatgcn]/g, '').toUpperCase()
            if (!clean) return
            const seq = useSequenceStore.getState().sequence
            if (!seq) return
            const sel = useEditorStore.getState().selectedRange
            if (sel) {
              useSequenceStore.getState().deleteRange(sel.start, sel.end)
              const insertPos = sel.wrapsAround ? 0 : sel.start
              useSequenceStore.getState().insertBases(insertPos, clean)
            } else {
              useSequenceStore.getState().insertBases(seq.length, clean)
            }
            useEditorStore.getState().setSelectedRange(null)
          }

          // Try internal clipboard first, then fall back to system clipboard
          const internal = useEditorStore.getState().clipboard
          if (internal) {
            doPaste(internal)
          } else {
            navigator.clipboard?.readText().then((text) => {
              if (text) doPaste(text)
            }).catch(() => {
              // Clipboard permission denied — ignore silently
            })
          }
          break
        }

        case 'find-orfs': {
          const seq = useSequenceStore.getState().sequence
          if (!seq) return
          const orfs = findORFs(seq.bases, 100)
          useSequenceStore.getState().updateOrfs(orfs)
          break
        }

        case 'find-restriction-sites': {
          const seq = useSequenceStore.getState().sequence
          if (!seq) return
          const siteMap = findAllRestrictionSites(seq.bases)
          const allSites: import('@/types').RestrictionSite[] = []
          siteMap.forEach((sites) => allSites.push(...sites))
          useSequenceStore.getState().updateRestrictionSites(allSites)
          break
        }

        case 'new-sequence':
          window.dispatchEvent(new CustomEvent('cyw:trigger-new-sequence'))
          break

        case 'import':
        case 'open':
          window.dispatchEvent(new CustomEvent('cyw:trigger-import'))
          break

        case 'addgene-import':
          window.dispatchEvent(new CustomEvent('cyw:trigger-addgene'))
          break

        case 'ncbi-import':
          window.dispatchEvent(new CustomEvent('cyw:trigger-ncbi'))
          break

        case 'feature-library':
          window.dispatchEvent(new CustomEvent('cyw:trigger-feature-library'))
          break

        case 'align':
          window.dispatchEvent(new CustomEvent('cyw:trigger-align'))
          break

        case 'auto-annotate':
          window.dispatchEvent(new CustomEvent('cyw:trigger-auto-annotate'))
          break

        case 'blast':
          window.dispatchEvent(new CustomEvent('cyw:trigger-blast'))
          break

        case 'digest':
          window.dispatchEvent(new CustomEvent('cyw:trigger-digest'))
          break

        case 'cloning':
          window.dispatchEvent(new CustomEvent('cyw:trigger-cloning'))
          break

        case 'find':
          window.dispatchEvent(new CustomEvent('cyw:trigger-find'))
          break

        case 'save': {
          useSequenceStore.getState().commitChanges()
          useTabStore.getState().syncActiveSequence()
          const seq = useSequenceStore.getState().sequence
          if (seq) {
            useAppStore.getState().addRecentSequence(seq)
          }
          if (useProjectStore.getState().isOpen) {
            if (seq) useProjectStore.getState().saveSequence(seq)
          } else {
            window.dispatchEvent(new CustomEvent('cyw:trigger-export'))
          }
          break
        }

        case 'view-linear':
          useEditorStore.getState().setViewMode('linear')
          break

        case 'view-circular':
          useEditorStore.getState().setViewMode('circular')
          break

        case 'view-sequence':
          useEditorStore.getState().setViewMode('sequence')
          break

        case 'zoom-in':
          useEditorStore.getState().zoomIn()
          break

        case 'zoom-out':
          useEditorStore.getState().zoomOut()
          break

        case 'project-open':
          window.dispatchEvent(new CustomEvent('cyw:trigger-project-open'))
          break

        case 'project-create':
          window.dispatchEvent(new CustomEvent('cyw:trigger-project-create'))
          break

        case 'project-save':
          window.dispatchEvent(new CustomEvent('cyw:trigger-project-save'))
          break

        case 'magic-bar':
          // Handled by MagicBarProvider toggle - dispatched separately
          break
      }
    },
    [router],
  )

  return { dispatch }
}
