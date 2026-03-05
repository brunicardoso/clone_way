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
    <header className="flex h-11 items-center justify-between border-b border-[#e8e5df] bg-[#faf9f5] px-3 md:h-14 md:px-4">
      <div className="flex items-center gap-3 md:gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="CloneWay" width={28} height={28} className="md:h-9 md:w-9" />
          <span className="text-sm font-bold tracking-wide text-emerald-500">CloneWay</span>
        </Link>
        {isProjectOpen && (
          <div className="hidden items-center gap-1.5 text-xs text-[#6b6560] sm:flex">
            <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
            <span>{projectName}</span>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={open} className="gap-2">
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded bg-[#e8e5df] px-1.5 py-0.5 text-[10px] text-[#9c9690] sm:inline">
          Cmd+K
        </kbd>
      </Button>
    </header>
  )
}
