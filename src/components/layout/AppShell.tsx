'use client'

import { type ReactNode } from 'react'
import { Header } from './Header'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-[#faf9f5] text-[#1a1a1a]">
      <Header />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
