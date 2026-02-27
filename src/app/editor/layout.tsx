import { type ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      <Footer />
    </div>
  )
}
