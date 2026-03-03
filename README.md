# CloneWay (CYW) - Molecular Biology Suite

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18851838.svg)](https://doi.org/10.5281/zenodo.18851838)

An open-source, GUI-first molecular biology suite for sequence design, analysis, and cloning planning. All data stays in your browser — no accounts, no telemetry, no uploads.

**[Try CloneWay Online](https://clone-way.vercel.app/editor)**

## Features

### Sequence Visualization
- **Circular Map** — SVG plasmid map with feature arcs (wraparound-aware), ORF arcs, restriction site tick marks, de-overlapped labels, selection arc, hover position tooltip, SVG/PNG export
- **Linear Map** — SVG linear map with adaptive ruler, forward/reverse feature tracks, ORF blocks, staggered restriction cut markers (blunt/5'/3' differentiated), magnifying lens on hover, Ctrl+scroll zoom, SVG/PNG export
- **Sequence View** — Monospace per-base view with feature coloring, ORF underlines, restriction site bracketing with graph-coloring (8 colors), cut markers, enzyme name labels, protein translation row (for CDS/ORF regions), full keyboard edit mode, Ctrl+scroll zoom

### File I/O
- **Import:** GenBank (.gb, .gbk), FASTA (.fa, .fasta), FASTQ (.fq, .fastq), SnapGene (.dna), AB1 chromatograms (.ab1)
- **Export:** GenBank (with full wraparound feature support), FASTA
- **Drag & drop** file import
- **Addgene integration** — fetch any public plasmid by ID

### Sequence Editing
- **Edit Mode** — type A/T/G/C/N directly into the sequence, backspace/delete to remove, arrow keys to navigate, paste support
- **Undo/Redo** — 100-step history via temporal middleware (Ctrl+Z / Ctrl+Shift+Z)
- **Find** — Ctrl+F sequence search with multi-match navigation and IUPAC base filtering

### Analysis Tools
- **Restriction Site Analysis** — 20 common enzymes + 5 Type IIS enzymes (BsaI, BpiI, BbsI, SapI, BsmBI), IUPAC ambiguity support, unique cutter detection
- **In-Silico Digest** — linear and circular digests with feature coordinate inheritance and overhang calculation
- **Gel Visualization** — animated SVG electrophoresis with 1kb ladder, log-scale migration, hover details, PNG export
- **ORF Finding** — all 6 reading frames with configurable minimum length
- **Sequence Alignment** — Needleman-Wunsch global alignment with affine gap penalties
- **BLAST** — submit sequences to NCBI BLAST and poll results, via server-side proxy
- **Auto-Annotation** — exact and approximate matching against a curated database of 50+ known features (promoters, terminators, resistance genes, origins, reporters, tags, recombination sites)
- **Chromatogram Viewer** — full ABIF (.ab1) chromatogram display with base calls, quality scores, and trace visualization

### Cloning Planning
- **Restriction/Ligation** — plan restriction enzyme digests and ligations
- **Gibson Assembly** — design overlapping fragments for Gibson assembly
- **Golden Gate Assembly** — plan Type IIS enzyme-based assemblies
- **Site-Directed Mutagenesis** — design mutagenesis primers with Wallace-rule Tm calculation

### Codon Tools
- Standard codon table with codon usage tables for 5 organisms (E. coli, S. cerevisiae, H. sapiens, C. elegans, D. melanogaster)
- Codon optimization, CAI calculation, protein translation

### Project Management
- **File System Access API** — open, create, save, and load project directories (Chrome/Edge)
- **Multi-tab** editor with split-pane support
- **Feature Library** — save, browse, and search reusable features (persisted to localStorage and project directory)
- **Recent Sequences** — quick access to recently opened sequences

### Command Palette (Magic Bar)
- `Cmd+K` to open — 24 commands across Navigation, Sequence Tools, and File groups
- Keyboard shortcuts for all common actions

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + Framer Motion
- **State:** Zustand 5 + Zundo (temporal undo/redo)
- **UI:** Radix UI primitives + cmdk command palette
- **Fonts:** Inter (UI) + JetBrains Mono (sequence)

## Privacy

- All sequence data is stored locally in your browser (localStorage / IndexedDB)
- The Addgene proxy (`/api/addgene`) fetches public plasmid files — your data is never uploaded
- The BLAST proxy (`/api/blast`) submits only the query sequence to NCBI
- No analytics, no tracking, no telemetry

## License

This project is licensed under the MIT License - see the [license.md](license.md) file for details.
