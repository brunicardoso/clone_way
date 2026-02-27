# Project: CYW (Clone Your Way)

## Vision
An open-source, GUI-first molecular biology suite with powerful analysis tools accessible via a "Magic Bar" and contextual overlays.

## GUI Principles
- **No Hidden Menus:** If a task is common, it should be reachable via `Cmd+K` (The Magic Bar).
- **Visual Feedback:** All biological logic (ORFs, Restriction Sites) must be rendered on high-performance SVG/canvas views.
- **Local-first:** All user data stays in the browser (localStorage/IndexedDB). No telemetry.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + Framer Motion
- **Fonts:** Inter (UI) + JetBrains Mono (sequence/code)
- **State:** Zustand 5 + Zundo (temporal middleware for 100-step undo/redo)
- **UI Primitives:** Radix UI (Dialog, DropdownMenu, Tabs, Tooltip)
- **Command Palette:** cmdk

## Architecture

### Routes
- `/` — redirects to `/editor`
- `/editor` — main editor page (all panels, event listeners, auto-save)
- `/api/addgene` — proxy: fetches Addgene public plasmid GenBank files (rate-limited 10 req/min/IP)
- `/api/blast` — proxy: submits to NCBI BLAST / polls results (rate-limited 5 POST, 30 GET/min/IP)

### Stores (Zustand) — `src/stores/`
| Store | Purpose |
|---|---|
| `useSequenceStore` | Core sequence state with zundo undo/redo (100 steps). Operations: load, update bases, add/remove features, insert/delete, ORFs, restriction sites, commit |
| `useEditorStore` | View mode (linear/circular/sequence), selection, zoom, active tool, toggles (features/ORFs/sites/translation), edit mode, cursor |
| `useTabStore` | Multi-tab support with split-pane; syncs to/from sequence store on tab switch |
| `useProjectStore` | File System Access API: open/create/save/load project directories with session persistence |
| `useFeatureLibraryStore` | Saved feature library (localStorage + project directory) |
| `useAppStore` | Theme, recent sequences (localStorage with full sequence data) |

### Biology Services — `src/services/bio/`
All pure functions, no external calls:
| Service | What |
|---|---|
| `parser.ts` | GenBank + FASTA + FASTQ + SnapGene `.dna` (binary TLV) parsers |
| `enzymes.ts` | 20 common + 5 Type IIS restriction enzymes, IUPAC ambiguity, forward+reverse site finding |
| `digest.ts` | In-silico linear/circular digest with feature inheritance + overhang calculation |
| `orf.ts` | ORF finder (all 6 frames, configurable min length) |
| `alignment.ts` | Needleman-Wunsch global alignment with affine gap penalties (Float32Array) |
| `cloning.ts` | Restriction/ligation, Gibson, Golden Gate, site-directed mutagenesis planning |
| `codons.ts` | Codon table, usage tables (5 organisms), `optimizeCodons`, `calculateCAI`, `translate` |
| `autoAnnotate.ts` | Exact/approximate matching against known features DB, circular wraparound |
| `featureDatabase.ts` | 50+ curated features: promoters, terminators, resistance genes, origins, reporters, tags, recombination sites |
| `abif.ts` | Binary ABIF/`.ab1` chromatogram parser (traces, base calls, quality) |
| `validator.ts` | Sequence validation (IUPAC), feature range validation (circular-aware) |

### External Service Clients — `src/services/`
| Client | What |
|---|---|
| `addgene/client.ts` | Calls `/api/addgene` proxy, parses via importer |
| `blast/client.ts` | Submits/polls BLAST via `/api/blast` proxy |
| `file/importer.ts` | Format detection + import (GenBank, FASTA, FASTQ, SnapGene binary) |
| `file/exporter.ts` | Export GenBank (with wraparound features) + FASTA |

### Components — `src/components/`

**Editor** (`editor/`):
- `CircularMap.tsx` — custom SVG circular plasmid map with feature arcs, ORFs, restriction ticks, labels, selection, export
- `LinearMap.tsx` — custom SVG linear map with ruler, feature tracks, ORFs, restriction cut markers, magnifying lens, zoom, export
- `SequenceView.tsx` — monospace per-base view with feature coloring, ORF underlines, restriction site bracketing (graph-colored), cut markers, protein translation row, full edit mode, zoom
- `SequenceToolbar.tsx` — left sidebar icon toolbar (all tools + toggles)
- `FeaturePanel.tsx` — right sidebar feature list with save-to-library
- `FindBar.tsx` — Ctrl+F search with multi-match navigation
- `GelPanel.tsx` — animated SVG gel electrophoresis visualization with PNG export
- `AlignmentResultPanel.tsx` — alignment results display
- `BlastResultsPanel.tsx` — BLAST hit polling + display
- `ChromatogramPanel.tsx` / `ChromatogramViewer.tsx` — ABIF chromatogram display
- Dialogs: `AddFeatureDialog`, `AddgeneImportDialog`, `AlignmentDialog`, `AutoAnnotateDialog`, `BlastDialog`, `CloningPlanDialog`, `DigestDialog`, `ExportDialog`, `FeatureLibraryPanel`, `ImportDialog`, `NewSequenceDialog`, `ProjectDialog`, `RestrictionEnzymePanel`
- `SequenceTabBar.tsx` — tab bar with split-pane support
- `EditorPanel.tsx` — panel for split-view sequences
- `MagnifyingLens.tsx` — hovering sequence magnifier on LinearMap

**Layout** (`layout/`): `AppShell`, `Header`, `Footer`

**Magic Bar** (`magic-bar/`): `MagicBar.tsx` (cmdk overlay, 24 commands), `MagicBarProvider.tsx`, `commands.ts`

**UI Primitives** (`ui/`): Badge, Button, Card, Dialog, DropdownMenu, Input, Spinner, Tabs, Tooltip

### Hooks — `src/hooks/`
| Hook | Purpose |
|---|---|
| `useCommandDispatch` | Maps Magic Bar action strings to store mutations / events / navigation |
| `useKeyboardShortcuts` | Global keydown listener from keybindings config |
| `useMagicBar` | Open/close/toggle Cmd+K overlay |
| `useSequenceSelection` | Selection range helpers |
| `useUndoRedo` | Convenience wrapper over `useSequenceStore.temporal` |

### Lib — `src/lib/`
- `cn.ts` — clsx + tailwind-merge
- `constants.ts` — MAX_UNDO_STEPS, FEATURE_COLORS, ZOOM_CONFIG, DEFAULT_SAMPLE_SEQUENCE, `getThemedFeatureColor()`, `getThemedFeatureStyle()`
- `theme.ts` — `ThemeConfig` interface + `PAPER_THEME` constant; sub-interfaces for colors, featureColors, layout, typography, strokes, style
- `keybindings.ts` — keyboard binding declarations
- `rateLimit.ts` — in-memory sliding-window rate limiter (server-side)
- `downloadFile.ts` — browser download helper

### Types — `src/types/`
- `sequence.ts` — Sequence, Feature, FeatureType, RestrictionSite, ORF, LibraryFeature
- `editor.ts` — ViewMode, ToolType, SelectionRange, ZoomConfig
- `cloning.ts` — CloningMethod, CloningStep, CloningPlan
- `genbank.ts` — GenBankRecord, GenBankFeature, GenBankQualifier
- `file-system-access.d.ts` — File System Access API declarations

## Privacy & Data
- **Local-first:** All user files and sequence data stored locally (localStorage/IndexedDB). Never sent to external servers.
- **Addgene Proxy:** Server-side proxy fetches public plasmid GenBank files. User data never uploaded.
- **BLAST Proxy:** Server-side proxy submits query sequences to NCBI. Only the query sequence is sent.
- **No Telemetry:** No analytics, tracking, or data collection of any kind.

## Biological Guardrails
- **Sequence Integrity:** Never modify the underlying string without a visual "Commit" from the user.
- **Circular Logic:** Correctly handle "wraparound" features for plasmids (features crossing the 0/1 index).
- **Metadata:** Always preserve SnapGene/GenBank comments and source notes during import/export.

## Color Palette (Light Theme)
- Background: `#faf9f5` (warm parchment)
- Foreground: `#1a1a1a`
- Surface: `#f5f3ee`, hover: `#eae7e1`
- Border: `#e8e5df`
- Muted: `#9c9690`, muted-foreground: `#6b6560`
- Accent: emerald-500 (`#10b981`)

## Theme System
CircularMap uses `ThemeConfig` from `src/lib/theme.ts`. The default is `PAPER_THEME` — a minimalist "AI Research Publication" aesthetic with muted fills, thin charcoal backbone, hollow circle restriction markers, orthogonal grey leader lines, non-scaling strokes, and a stats block (BP + GC%). Future themes (Dark, High-Contrast) can be added by creating new `ThemeConfig` constants without rewriting SVG logic. Feature types marked as "strong" (CDS, promoter, rep_origin) get higher fill opacity (0.35) for visual weight; all others use the theme's base opacity (0.1).

## Known Incomplete / TODO
- SnapGene `.dna` export (import is implemented, export is not)
- Codon optimization UI (bio service exists in `bio/codons.ts`, no UI component yet)
