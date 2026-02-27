export interface Keybinding {
  key: string
  mod: boolean
  shift?: boolean
  action: string
  label: string
}

export const KEYBINDINGS: Keybinding[] = [
  { key: 'k', mod: true, action: 'magic-bar', label: 'Open Magic Bar' },
  { key: 'z', mod: true, action: 'undo', label: 'Undo' },
  { key: 'z', mod: true, shift: true, action: 'redo', label: 'Redo' },
  { key: 's', mod: true, action: 'save', label: 'Save' },
  { key: 'o', mod: true, action: 'open', label: 'Open File' },
  { key: 'e', mod: true, action: 'export', label: 'Export' },
  { key: '1', mod: true, action: 'view-linear', label: 'Linear View' },
  { key: '2', mod: true, action: 'view-circular', label: 'Circular View' },
  { key: '3', mod: true, action: 'view-sequence', label: 'Sequence View' },
  { key: '=', mod: true, action: 'zoom-in', label: 'Zoom In' },
  { key: '-', mod: true, action: 'zoom-out', label: 'Zoom Out' },
  { key: 'c', mod: true, action: 'copy', label: 'Copy Selection' },
  { key: 'x', mod: true, action: 'cut', label: 'Cut Selection' },
  { key: 'v', mod: true, action: 'paste', label: 'Paste' },
  { key: 'f', mod: true, action: 'find', label: 'Find Sequence' },
]
