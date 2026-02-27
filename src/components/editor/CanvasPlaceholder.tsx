'use client'

import { Dna } from 'lucide-react'

export function CanvasPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-950/50 m-4">
      <div className="flex flex-col items-center gap-3 text-zinc-600">
        <Dna className="h-12 w-12" />
        <p className="text-sm font-medium">Sequence Canvas</p>
        <p className="text-xs">OpenVectorEditor integration goes here</p>
      </div>
    </div>
  )
}
