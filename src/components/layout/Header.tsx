'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMagicBar } from '@/hooks/useMagicBar'
import { useProjectStore } from '@/stores/useProjectStore'

export function Header() {
  const { open } = useMagicBar()
  const projectName = useProjectStore((s) => s.projectName)
  const isProjectOpen = useProjectStore((s) => s.isOpen)

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e8e5df] bg-[#faf9f5] px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="CloneWay" width={36} height={36} />
          <span className="text-sm font-bold tracking-wide text-emerald-500">CloneWay</span>
        </Link>
        {isProjectOpen && (
          <div className="flex items-center gap-1.5 text-xs text-[#6b6560]">
            <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
            <span>{projectName}</span>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={open} className="gap-2">
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="rounded bg-[#e8e5df] px-1.5 py-0.5 text-[10px] text-[#9c9690]">
          Cmd+K
        </kbd>
      </Button>
    </header>
  )
}
