'use client'

import { X, SplitSquareHorizontal } from 'lucide-react'
import { useTabStore } from '@/stores/useTabStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { Button } from '@/components/ui/Button'

export function SequenceTabBar() {
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const splitTabId = useTabStore((s) => s.splitTabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const setSplitTab = useTabStore((s) => s.setSplitTab)

  if (tabs.length === 0) return null

  return (
    <div className="flex items-center border-b border-[#e8e5df] bg-[#f5f3ee]">
      <div className="flex flex-1 items-center overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            title={tab.name}
            className={`group flex shrink-0 items-center gap-1 border-r border-[#e8e5df] px-3 py-1.5 text-xs ${
              tab.id === activeTabId
                ? 'bg-[#faf9f5] text-[#1a1a1a]'
                : 'text-[#9c9690] hover:bg-[#faf9f5]/60 hover:text-[#6b6560]'
            }`}
          >
            <button
              onClick={() => setActiveTab(tab.id)}
              className="max-w-[120px] truncate"
              title={tab.name}
            >
              {tab.name}
            </button>
            {splitTabId === tab.id && (
              <span className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-700">
                split
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className="ml-1 rounded p-0.5 opacity-0 hover:bg-[#eae7e1] group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {tabs.length >= 2 && (
        <Button
          variant={splitTabId ? 'default' : 'ghost'}
          size="icon"
          className="mx-1 h-6 w-6"
          title={splitTabId ? 'Close split view' : 'Split view'}
          onClick={() => {
            if (splitTabId) {
              setSplitTab(null)
            } else {
              // Split with the first non-active tab
              const other = tabs.find((t) => t.id !== activeTabId)
              if (other) setSplitTab(other.id)
            }
          }}
        >
          <SplitSquareHorizontal className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
