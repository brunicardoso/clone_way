export interface Command {
  id: string
  label: string
  group: 'Navigation' | 'Sequence Tools' | 'File'
  shortcut?: string
  action: string
}

export const COMMANDS: Command[] = [
  // Navigation
  { id: 'nav-editor', label: 'Go to Editor', group: 'Navigation', action: 'navigate:/editor' },

  // Sequence Tools
  { id: 'tool-undo', label: 'Undo', group: 'Sequence Tools', shortcut: 'Mod+Z', action: 'undo' },
  { id: 'tool-redo', label: 'Redo', group: 'Sequence Tools', shortcut: 'Mod+Shift+Z', action: 'redo' },
  { id: 'tool-find-orfs', label: 'Find ORFs', group: 'Sequence Tools', action: 'find-orfs' },
  { id: 'tool-find-sites', label: 'Find Restriction Sites', group: 'Sequence Tools', action: 'find-restriction-sites' },
  { id: 'tool-feature-library', label: 'Feature Library', group: 'Sequence Tools', action: 'feature-library' },
  { id: 'tool-align', label: 'Align Sequences', group: 'Sequence Tools', action: 'align' },
  { id: 'tool-auto-annotate', label: 'Auto-Annotate Features', group: 'Sequence Tools', action: 'auto-annotate' },
  { id: 'tool-blast', label: 'BLAST Search', group: 'Sequence Tools', action: 'blast' },
  { id: 'tool-digest', label: 'Restriction Digest', group: 'Sequence Tools', action: 'digest' },
  { id: 'tool-cloning', label: 'Cloning Plan', group: 'Sequence Tools', action: 'cloning' },
  { id: 'tool-gibson', label: 'Gibson Assembly', group: 'Sequence Tools', action: 'cloning' },
  { id: 'tool-golden-gate', label: 'Golden Gate Assembly', group: 'Sequence Tools', action: 'cloning' },
  { id: 'tool-mutagenesis', label: 'Site-Directed Mutagenesis', group: 'Sequence Tools', action: 'cloning' },
  { id: 'tool-find', label: 'Find Sequence', group: 'Sequence Tools', shortcut: 'Mod+F', action: 'find' },

  // File
  { id: 'file-new', label: 'New Sequence', group: 'File', shortcut: 'Mod+N', action: 'new-sequence' },
  { id: 'file-import', label: 'Import File', group: 'File', shortcut: 'Mod+O', action: 'import' },
  { id: 'file-addgene', label: 'Fetch from Addgene', group: 'File', action: 'addgene-import' },
  { id: 'file-export-gb', label: 'Export as GenBank', group: 'File', action: 'export:genbank' },
  { id: 'file-export-fasta', label: 'Export as FASTA', group: 'File', action: 'export:fasta' },
  { id: 'file-project-open', label: 'Open Project', group: 'File', action: 'project-open' },
  { id: 'file-project-create', label: 'Create Project', group: 'File', action: 'project-create' },
  { id: 'file-project-save', label: 'Save to Project', group: 'File', shortcut: 'Mod+S', action: 'project-save' },
]
