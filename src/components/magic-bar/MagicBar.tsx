'use client'

import { Command } from 'cmdk'
import { useMagicBar } from '@/hooks/useMagicBar'
import { useCommandDispatch } from '@/hooks/useCommandDispatch'
import { COMMANDS } from './commands'

export function MagicBar() {
  const { isOpen, close } = useMagicBar()
  const { dispatch } = useCommandDispatch()

  function handleSelect(action: string) {
    close()
    dispatch(action)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-[#e8e5df] bg-[#faf9f5] shadow-2xl"
        loop
      >
        <Command.Input
          placeholder="Type a command or search..."
          className="w-full border-b border-[#e8e5df] bg-transparent px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#9c9690] outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-[#9c9690]">
            No results found.
          </Command.Empty>
          {(['Navigation', 'Sequence Tools', 'File'] as const).map(
            (group) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#9c9690]"
              >
                {COMMANDS.filter((c) => c.group === group).map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => handleSelect(cmd.action)}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-[#1a1a1a] aria-selected:bg-[#eae7e1]"
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="rounded bg-[#e8e5df] px-1.5 py-0.5 text-xs text-[#9c9690]">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ),
          )}
        </Command.List>
      </Command>
    </div>
  )
}
