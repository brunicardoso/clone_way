# CYW (Clone Your Way) — Comprehensive Manual Test Plan

---

## 1. Navigation & Core Layout

### 1.1 Home Redirect

- Visit `/` in the browser
- **Verify:** Automatically redirects to `/editor`

### 1.2 App Shell & Header

- Verify:** "CloneWay" logo and branding visible in top-left 
- Verify:** Magic Bar search button visible in header 
- **Verify:** When a project is open, project name displays next to folder icon - **It does not create a folder with the name I gave. It just make an existing folder as project, but the new name I gave shows on the top.**
- Header layout remains usable at different window widths
-**Verify:** - in the split mode, editing is all messed up. When I type a sequence it writes something else and the other tab also is modified.
### 1.3 Editor Page Layout

- Verify: Three-section layout: left toolbar + main content + right feature panel
- Verify: When sequences are loaded, tab bar displays above main content
- **Verify:** when hovering on the name of a tab, the full name of the sequence should be displayed
- Verify: Footer shows at bottom with sequence info and selection status
- **Verify:** display lenght of selected sequence
- Verify:When no sequence is loaded, a placeholder/empty state message appears

---

## 2. Sequence Management

### 2.1 Creating New Sequences

- **Verify:** Open **New Sequence** dialog (FilePlus icon or Cmd+N) - control + N does not work.
- Enter a sequence name (leave blank to test default "Untitled Sequence")
- Select topology: **Circular** or **Linear**
- Paste or type bases (A, T, G, C, N)
- Verify:** Invalid characters are stripped/rejected
- Click **Create**
- Verify: New sequence opens as a tab and becomes active
- Verify: Sequence name, topology, and bases are correct

### 2.2 Importing Sequences

- Open Import dialog (Upload icon or Cmd+O)
- Test each import method:
  - GenBank (.gb, .gbk): drag-drop and file picker
  - FASTA (.fa, .fasta): drag-drop and file picker
  - **FASTQ** (.fq, .fastq): drag-drop and file picker???
  - SnapGene binary (.dna): drag-drop and file picker
  - ABIF chromatogram (.ab1, **.abi**): drag-drop — should open ChromatogramPanel
  **Verify:** add just drag at the main area a file to open
- Verify: Drag-over highlight appears when dragging files over the drop zone
- Verify: Imported sequences load with correct name, bases, features, and topology
- **Verify:** GenBank features (CDS, promoter, etc.) are preserved with correct positions and strands
- Verify: Circular topology from GenBank LOCUS line is detected
- **Try importing** a corrupted/invalid file — **Verify:** Error message shown, no crash

### 2.3 Addgene Import

- Open Import dialog or use Magic Bar "Fetch from Addgene"
- Enter a valid public plasmid ID (e.g. 42230)
- **Verify:** Spinner/loading state while fetching
- **Verify:** Sequence loads with features from Addgene GenBank file. SEQUENCES DO NOT SHOW FEATURES WHEN FETCHED FROM ADDGENE. ALSO NAME OF THE SEQUENCES THAT WERE DOWNLOADED AS .GB OR .DNA DIRECTLY FROM THE ADDGENE SITE SHOW A NAME IN THE TAB DIFFERENT FROM THE FILE NAME.
- Enter an invalid ID — **Verify:** Error message, no crash
- Rapidly submit multiple requests — **Verify:** Rate limiting (10 req/min) returns appropriate error

### 2.4 Exporting Sequences

- Open Export dialog (Download icon or Cmd+E)
- Test GenBank export:
  - Verify: Downloaded .gb file contains LOCUS, FEATURES, ORIGIN sections
  - **Verify:** Wraparound features on circular sequences export correctly (join notation)
  - Re-import the exported file — **Verify:** Round-trip preserves all data
- Test FASTA export:
  - Verify: Downloaded .fa file contains header line and bases only
  - Verify: No feature data in FASTA output
- Verify: Custom filename is used when provided
- Verify: Default filename falls back to sequence name

### 2.5 Sequence Tabs

- Open 3+ sequences
- Verify: Each tab shows sequence name
- Click tabs to switch — Verify: Each tab has independent state (bases, features, view)
- Close a tab with X button:
  - If active tab closed, Verify: next tab becomes active
  - If last tab closed, Verify: empty state message shown
- Split view: With 2+ tabs, click split icon
  - Verify: Two panels appear side by side with independent sequences
  - Click split icon again — Verify: returns to single-pane view
**Add** open more than one file at once
---

## 3. View Modes

### 3.1 Linear View
-**Verify**: a linear sequence can never be circular unless you choose it to be. And Instead of linear map, it should be named as horizontal map
- Activate via toolbar icon or **Cmd+1**
- Verify: Horizontal backbone bar with ruler and bp labels
- Verify: Feature tracks rendered as color-coded arrows showing strand direction
- Verify: Feature colors match FEATURE_COLORS palette (CDS = green, promoter = orange, etc.)
- Verify: ORF tracks appear as underlines (when ORFs are toggled on)
- Verify: Restriction site ticks with enzyme name labels below backbone
- Verify: Ruler shows major and minor tick marks with bp position labels
- Zoom: Ctrl/Cmd+scroll to zoom in/out — **Verify:** smooth zoom, content rescales
- **Magnifying lens:** Hover over backbone — **Verify:** magnified per-base view appears near cursor
- Selection: Click and drag on backbone — 
**Verify:** selection range shown, footer updates with position

### 3.2 Circular View
- **Verify:** Adjust labeling, should be more rounded surrounding the map and for restriction
- **Verify** Saving png should not be a screenshot of the map because for zoomed maps, the image gets cropped.
- Activate via toolbar icon or **Cmd+2**
- **Verify:** Circular backbone ring at center
- **Verify:** Features rendered as concentric arcs (outer ring for forward strand, inner for reverse)
- **Verify:** CDS and promoter features show directional arrows
- **Verify:** Restriction site ticks around circumference
- **Verify:** ORF arcs at inner radius (when toggled on)
- **Verify:** External labels with elbow lines — no label overflow outside SVG bounds
- **Verify:** Ruler ticks with bp position labels around the circle
- **Wraparound features:** Load a circular plasmid with a feature crossing the 0-index
  - **Verify:** Feature arc renders correctly spanning the origin

### 3.3 Sequence View

- Activate via toolbar icon or **Cmd+3**
- **Verify:** Monospace font (JetBrains Mono) for all bases
- **Verify:** Line gutter shows position numbers
- **Verify:** Bases are color-highlighted by overlapping feature type
- **Verify:** ORF underlines appear (when toggled on)
- **Verify:** Restriction site bracket markers (color-coded per enzyme)
- **Verify:** Cut position markers (down arrow symbol) at enzyme cut positions
- **Zoom:** Ctrl/Cmd+scroll — **Verify:** font size changes (8px to 48px range), chars-per-row adjusts
- **Protein translation row:** Toggle translation on (ALargeSmall icon)
  - **Verify:** Amino acid letters appear below bases in all 3 forward frames

### 3.4 Edit Mode (Sequence View)

- Toggle edit mode with PenLine button in toolbar
- **Verify:** Cursor appears in sequence
- Type bases (A, T, G, C) — **Verify:** inserted at cursor position
- Press Backspace — **Verify:** base deleted before cursor
- Type invalid characters — **Verify:** rejected (no insertion)
- **Verify:** isDirty flag becomes true after edits
- Press Escape or toggle PenLine again — **Verify:** exits edit mode
- Undo (Cmd+Z) — **Verify:** edit is reversed

---

## 4. Feature Management

### 4.1 Adding Features Manually

- Select a range in any view (click and drag)
- Click Tag icon in toolbar or press Cmd+A
- **Verify:** Add Feature dialog opens with pre-filled start/end from selection
- Enter feature name
- Choose type from dropdown (CDS, gene, promoter, terminator, rep_origin, primer_bind, regulatory, protein_bind, misc_feature)
- Choose strand (forward / reverse)
- Click **Add**
- **Verify:** Feature appears in the right-side Feature Panel
- **Verify:** Feature renders in all three views with correct color and position
- **Verify:** Strand direction reflected (arrow direction in Linear/Circular views)

### 4.2 Adding Features Without Selection

- Clear any selection, then open Add Feature dialog
- Manually enter start and end positions
- **Verify:** Feature added at specified positions
- Enter invalid range (start > sequence length) — **Verify:** validation error or clamping

### 4.3 Wraparound Features (Circular Sequences)

- On a circular sequence, select a range that wraps around the origin (e.g., position 4800 to 200 on a 5000bp plasmid)
- Add a feature to that selection
- **Verify:** Feature renders correctly crossing the 0-index in Circular View
- **Verify:** Feature exports correctly in GenBank format (join notation)

### 4.4 Removing Features

- Click on a feature in the Feature Panel
- Delete the feature
- **Verify:** Feature removed from panel and all views
- Undo (Cmd+Z) — **Verify:** feature restored

### 4.5 Feature Panel (Right Sidebar)

- **Verify:** Feature list shows all features with color dot, name, and type badge
- **Verify:** Feature count displayed
- Toggle panel visibility with X button — **Verify:** panel hides/shows
- Hover over a feature row — **Verify:** save-to-library icon appears
- Click save-to-library icon — **Verify:** feature saved to Feature Library

---

## 5. Feature Library

### 5.1 Accessing the Library

- Click BookOpen icon in toolbar, or use Magic Bar "Feature Library"
- **Verify:** Library panel opens showing saved features

### 5.2 Browsing & Searching

- **Verify:** "All features" tab shows everything
- **Verify:** Type tabs filter by FeatureType (CDS, promoter, etc.)
- Type in search box — **Verify:** filters by name, type, or notes

### 5.3 Adding Features to Library

- Click "Add" button in library panel
- Enter name, type, sequence (bases), and optional notes
- Click Add — **Verify:** feature appears in library list
- **Verify:** Persists after closing and reopening the panel
- **Verify:** Persists after page refresh (localStorage)

### 5.4 Inserting Library Features into Sequence

- Click a library feature
- **Verify:** Feature's sequence inserted at cursor position or end of sequence
- **Verify:** Feature annotation automatically added

### 5.5 Deleting from Library

- Click trash icon on a library feature
- **Verify:** Feature removed from library
- **Verify:** Does not affect features already in open sequences

---

## 6. Restriction Enzymes

### 6.1 Panel Basics

- Click Scissors icon in toolbar to open Restriction Enzyme panel
- **Verify:** Search box, enzyme list, Show all / Hide all buttons visible
- **Verify:** Enzymes found in current sequence listed with name, recognition sequence, and cut count
- **Verify:** Unique cutters (count = 1) have special badge styling

### 6.2 Per-Enzyme Selection (Checkboxes)

- **Verify:** No checkboxes checked initially
- Check a single enzyme — **Verify:** only that enzyme's sites appear on maps
- Check additional enzymes — **Verify:** sites accumulate for all checked enzymes
- Uncheck an enzyme — **Verify:** its sites removed, others remain
- **Verify:** Count indicator below search bar updates correctly

### 6.3 Show All / Hide All

- Click **Show all** — **Verify:** all enzyme checkboxes checked, all sites visible
- Click **Hide all** — **Verify:** all unchecked, all sites removed
- **Verify:** Hide all button disabled when nothing is selected

### 6.4 Search Filtering

- Type enzyme name or recognition sequence in search
- **Verify:** List filters correctly
- **Verify:** Checkbox states preserved during search
- **Verify:** "Not in sequence" section shows matching enzymes with 0 sites

### 6.5 Site Navigation

- Click an enzyme name — **Verify:** navigation bar appears (green) with enzyme name and site counter
- Click down arrow — **Verify:** jumps to next site, counter increments
- Click up arrow — **Verify:** jumps to previous site
- **Verify:** Wraps around at boundaries (last → first, first → last)
- Press Enter / Shift+Enter — **Verify:** navigates forward / backward

### 6.6 Panel Persistence

- Check 3 enzymes, close panel (X or Escape)
- **Verify:** Sites remain visible on maps
- Reopen panel — **Verify:** same 3 checkboxes still checked

### 6.7 Interaction with Global Toggle

- Check some enzymes, then toggle "Show Restriction Sites" off in toolbar
- **Verify:** Sites disappear from maps
- Toggle back on — **Verify:** only checked enzymes' sites reappear
- **Verify:** Checkbox state preserved

---

## 7. Restriction Digest & Gel Visualization

### 7.1 Digest Dialog

- Click Flask icon in toolbar to open Digest dialog
- **Verify:** List of enzymes that cut the current sequence
- Select 1-2 enzymes via checkboxes
- Click **Digest**
- **Verify:** Fragment list appears with sizes and positions
- **Verify:** Fragment features inherited correctly from parent sequence

### 7.2 Gel Panel

- After digest, click **Show on Gel**
- **Verify:** Gel panel opens with animated band migration (1.8s transition)
- **Verify:** 1kb DNA ladder in first lane with standard bands
- **Verify:** Fragment bands in subsequent lanes, positioned by log(size)
- **Verify:** Band opacity reflects relative intensity
- Hover over a band — **Verify:** tooltip shows fragment size
- **Zoom:** Test zoom in/out on gel display

### 7.3 Gel Export

- Click export/download button on gel panel
- **Verify:** PNG image downloaded
- **Verify:** Image contains gel with all visible bands and ladder

### 7.4 Edge Cases

- Digest with no enzymes selected — **Verify:** error or empty result, no crash
- Digest with enzyme that doesn't cut — **Verify:** single fragment = full sequence
- Linear vs circular digest — **Verify:** circular has one fewer fragment than cuts, linear has one more

---

## 8. ORF Finder

### 8.1 Finding ORFs

- Click DNA icon in toolbar or use Magic Bar "Find ORFs"
- **Verify:** ORFs computed for all 6 reading frames (3 forward, 3 reverse)
- **Verify:** ORFs shown as underlines in Sequence View
- **Verify:** ORFs shown as arcs in Circular View
- **Verify:** ORFs shown as tracks in Linear View

### 8.2 ORF Toggle

- Toggle showOrfs off in toolbar
- **Verify:** ORF visualizations disappear from all views
- Toggle back on — **Verify:** ORFs reappear

### 8.3 Configurable Min Length

- If configurable, set minimum ORF length to a high value (e.g., 500bp)
- **Verify:** Only long ORFs shown
- Set to low value (e.g., 30bp)
- **Verify:** Many more ORFs appear

---

## 9. Find Bar (Sequence Search)

### 9.1 Opening & Closing

- Press **Ctrl+F** or **Cmd+F**
- **Verify:** Find bar appears with text input and navigation buttons
- Press **Escape** — **Verify:** Find bar closes

### 9.2 Basic Search

- Type a short sequence (e.g., "ATGC")
- **Verify:** Match count displayed (e.g., "3 of 12")
- **Verify:** First match highlighted/selected in sequence view

### 9.3 Navigation

- Click next (>) button — **Verify:** jumps to next match, counter increments
- Click previous (<) button — **Verify:** jumps to previous match
- **Verify:** Wraps around at end/beginning of sequence

### 9.4 IUPAC Ambiguity Support

- Search using ambiguity codes (e.g., "ATRYG" where R=A/G, Y=C/T)
- **Verify:** Matches found for all valid expansions

### 9.5 Circular Wraparound Search

- On a circular sequence, search for a sequence that spans the origin
- **Verify:** Match found crossing the 0-index boundary

### 9.6 No Matches

- Search for a sequence not present (e.g., "ZZZZZ")
- **Verify:** "0 of 0" or "No matches" displayed, no errors

---

## 10. Sequence Alignment

### 10.1 Alignment Dialog

- Click GitCompareArrows icon or use Magic Bar "Align Sequences"
- **Verify:** Dialog shows dropdown/list of open sequences to select from
- Select two sequences
- **Verify:** Scoring parameters visible with defaults (match=2, mismatch=-1, gap open=-2, gap extend=-0.5)
- Modify parameters if desired
- Click **Align**

### 10.2 Alignment Results

- **Verify:** Results panel opens showing aligned sequences
- **Verify:** Match/mismatch/gap indicators between aligned rows
- **Verify:** Alignment score and identity percentage displayed
- **Verify:** Match, mismatch, and gap counts shown
- **Verify:** Color-coded visualization (matches in one color, mismatches/gaps in another)
- **Verify:** Blocks of 60 characters per row with position numbers

### 10.3 Edge Cases

- Align a sequence with itself — **Verify:** 100% identity, no gaps
- Align very short sequences (< 10bp) — **Verify:** works without error
- Align with only one sequence open — **Verify:** appropriate error or disabled state

---

## 11. BLAST Search

### 11.1 Submitting a Search

- Click Radar icon or use Magic Bar "BLAST Search"
- **Verify:** Dialog shows query sequence (full or current selection)
- Choose program (blastn, blastp, etc.) and database (nt, nr, etc.)
- **Verify:** Privacy warning displayed (sequence will be sent to NCBI)
- Click **Submit**

### 11.2 Polling & Results

- **Verify:** Polling status shown with elapsed time
- **Verify:** Polls NCBI approximately every 10 seconds
- Wait for results (may take 1-5 minutes)
- **Verify:** Hit list displayed with accession, score, e-value
- Click a hit — **Verify:** expanded details shown

### 11.3 Timeout & Errors

- **Verify:** After 10 minutes with no result, timeout error shown
- Test with network disconnected — **Verify:** error message, no crash
- Rapidly submit multiple BLAST jobs — **Verify:** Rate limiting (5 POST/min) handled gracefully

---

## 12. Auto-Annotate

### 12.1 Running Auto-Annotate

- Click Sparkles icon or use Magic Bar "Auto-Annotate Features"
- **Verify:** Scans sequence against curated feature database (50+ features)
- **Verify:** Results list shows matched features with name, type, position, and confidence

### 12.2 Selecting Matches

- **Verify:** Checkboxes next to each match for selection
- Check desired matches, click **Add**
- **Verify:** Selected features added to sequence
- **Verify:** Features appear in Feature Panel and all views

### 12.3 Feature Categories

- Test with sequences known to contain:
  - **Promoters** (e.g., CMV, T7)
  - **Terminators** (e.g., SV40 pA, bGH pA)
  - **Resistance genes** (e.g., AmpR, KanR)
  - **Origins of replication** (e.g., pUC ori, f1 ori)
  - **Reporters** (e.g., GFP, mCherry)
  - **Tags** (e.g., His-tag, FLAG)
  - **Recombination sites** (e.g., loxP, attB)
- **Verify:** Each category detected correctly

### 12.4 Circular Wraparound Matching

- On a circular sequence where a known feature spans the origin
- **Verify:** Auto-annotate correctly identifies the wraparound match

---

## 13. Cloning Plan / Assembly Design

### 13.1 Restriction/Ligation Cloning

- Open Cloning Plan dialog (GitMerge icon or Magic Bar)
- Select **Restriction/Ligation** method
- Choose insert sequence and vector
- Select 5' and 3' restriction enzymes
- **Verify:** Overhang compatibility check shown (compatible/incompatible)
- **Verify:** Step-by-step plan generated with digest, gel purify, ligate steps

### 13.2 Gibson Assembly

- Select **Gibson Assembly** method
- Choose multiple fragment sequences (2+)
- Set overlap length (default 30bp)
- **Verify:** Overlap sequences designed for each junction
- **Verify:** Primer sequences shown for each fragment
- **Verify:** Step-by-step assembly plan generated

### 13.3 Golden Gate Assembly

- Select **Golden Gate Assembly** method
- Choose part sequences
- Select enzyme (BsaI or BpiI)
- **Verify:** Type IIS overhang design shown
- **Verify:** Part order and fusion site compatibility checked
- **Verify:** Assembly plan with correct enzyme and temperature cycling

### 13.4 Site-Directed Mutagenesis

- Select **Site-Directed Mutagenesis** method
- Specify mutation position and new bases
- **Verify:** Forward and reverse primer sequences generated
- **Verify:** PCR and DpnI digest steps in plan

---

## 14. Protein Translation

### 14.1 Translation Display

- Toggle translation on with ALargeSmall icon in toolbar
- **Verify:** Amino acid letters appear below bases in Sequence View
- **Verify:** All 3 forward reading frames translated
- **Verify:** Start codons (M) and stop codons (*) correctly identified

### 14.2 Toggle Behavior

- Toggle off — **Verify:** translation row disappears
- Toggle on again — **Verify:** reappears correctly

---

## 15. Chromatogram Viewer

### 15.1 Loading ABIF Files

- Import an .ab1 or .abi chromatogram file
- **Verify:** ChromatogramPanel opens

### 15.2 Trace Display

- **Verify:** Four color traces (A=green, T=red, G=black, C=blue) displayed
- **Verify:** Base calls shown above traces
- **Verify:** Quality scores reflected in trace display

### 15.3 Navigation

- Scroll through chromatogram — **Verify:** smooth scrolling
- **Verify:** Position markers correspond to base calls

---

## 16. Keyboard Shortcuts

### 16.1 Global Shortcuts

| Shortcut | Expected Action | Verify |
|---|---|---|
| Cmd+K | Open Magic Bar | Command palette overlay appears |
| Cmd+Z | Undo | Last action reversed |
| Cmd+Shift+Z | Redo | Last undo reversed |
| Cmd+S | Save / Commit | Changes saved, isDirty cleared |
| Cmd+O | Open / Import | Import dialog opens |
| Cmd+E | Export | Export dialog opens |
| Cmd+N | New Sequence | New Sequence dialog opens |
| Cmd+1 | Linear View | Switches to linear map |
| Cmd+2 | Circular View | Switches to circular map |
| Cmd+3 | Sequence View | Switches to sequence text view |
| Cmd+= | Zoom In | All views zoom in |
| Cmd+- | Zoom Out | All views zoom out |
| Cmd+F | Find | Find bar opens |
| Cmd+C | Copy | Selected bases copied to clipboard |
| Cmd+X | Cut | Selected bases cut (edit mode) |
| Cmd+V | Paste | Clipboard bases inserted (edit mode) |
| Ctrl/Cmd+A | Select All | Entire sequence selected |
| Escape | Close / Cancel | Closes active dialog, panel, or exits edit mode |

### 16.2 Context-Specific Shortcuts

- **Find bar open:** Enter = next match, Shift+Enter = previous match, Escape = close
- **Restriction panel open:** Enter = next site, Shift+Enter = previous site, Escape = close
- **Edit mode:** Arrow keys move cursor, typing inserts bases, Backspace deletes

### 16.3 Zoom via Mouse Wheel

- In Linear View: Ctrl/Cmd+scroll — **Verify:** mapZoom changes smoothly
- In Sequence View: Ctrl/Cmd+scroll — **Verify:** seqZoom (font size) changes
- **Verify:** Zoom clamped within min/max bounds (0.1 to 10)

---

## 17. Magic Bar (Command Palette)

### 17.1 Opening & Closing

- Press **Cmd+K** — **Verify:** overlay appears with search input focused
- Press **Escape** — **Verify:** overlay closes
- Click outside overlay — **Verify:** overlay closes

### 17.2 Command Search

- Type partial command name — **Verify:** list filters to matching commands
- **Verify:** All 24 commands accessible:
  1. Go to Editor
  2. Undo
  3. Redo
  4. Find ORFs
  5. Find Restriction Sites
  6. Feature Library
  7. Align Sequences
  8. Auto-Annotate Features
  9. BLAST Search
  10. Digest
  11. Cloning Plan
  12. Gibson Assembly
  13. Golden Gate Assembly
  14. Site-Directed Mutagenesis
  15. Find in Sequence
  16. New Sequence
  17. Import Sequence
  18. Fetch from Addgene
  19. Export as GenBank
  20. Export as FASTA
  21. Open Project
  22. Create Project
  23. Save to Project
  24. (any others present)

### 17.3 Command Execution

- Select each command — **Verify:** correct action triggered (dialog opens, tool activates, etc.)
- **Verify:** Keyboard navigation (arrow keys + Enter) works in command list

---

## 18. Project Management

### 18.1 Creating a Project

- Use Magic Bar "Create Project" or folder icon
- Enter project name
- **Verify:** Browser directory picker opens (File System Access API)
- Select a directory
- **Verify:** project.json created in directory
- **Verify:** sequences/ and features/ subdirectories created
- **Verify:** Project name appears in header

### 18.2 Saving to Project

- With project open, make changes to a sequence
- Press Cmd+S or click Save
- **Verify:** .gb file written to sequences/ directory
- **Verify:** Feature library synced to features/library.json
- **Verify:** session state (open tabs, active tab, view mode) saved to project.json

### 18.3 Opening a Project

- Use Magic Bar "Open Project" or folder icon
- Select an existing project directory
- **Verify:** project.json validated
- **Verify:** All .gb/.gbk files from sequences/ loaded as tabs
- **Verify:** Feature library loaded from features/library.json
- **Verify:** Session state restored (open tabs, active tab, view mode)

### 18.4 Closing a Project

- Close project via dialog
- **Verify:** Project name removed from header
- **Verify:** Sequences remain open but no longer auto-save to directory

### 18.5 Browser Compatibility

- Test in Chrome/Edge (File System Access API supported)
- Test in Firefox/Safari — **Verify:** graceful fallback or informative error message

---

## 19. Undo / Redo

### 19.1 Basic Undo/Redo

- Make 5 distinct changes (edit bases, add feature, delete range, insert bases, add another feature)
- Press Cmd+Z 5 times — **Verify:** each change reversed in order
- Press Cmd+Shift+Z 5 times — **Verify:** each change re-applied in order

### 19.2 Undo Limit

- Make 100+ changes
- **Verify:** Undo works for the last 100 steps (Zundo limit)
- **Verify:** Changes beyond 100 steps cannot be undone

### 19.3 Undo Button State

- With no history: **Verify:** Undo button disabled
- After one change: **Verify:** Undo enabled, Redo disabled
- After undo: **Verify:** Redo enabled
- After new change following undo: **Verify:** Redo history cleared

### 19.4 Operations Tracked

- **Verify:** Each of these operations is undoable:
  - Edit bases (type/delete in edit mode)
  - Add feature
  - Remove feature
  - Delete sequence range
  - Insert bases
  - Update restriction sites
  - Find ORFs

---

## 20. Copy / Cut / Paste

### 20.1 Copy

- Select a range of bases in any view
- Press Cmd+C
- **Verify:** Bases copied to clipboard (internal store)
- Open a text editor and paste — **Verify:** bases appear (system clipboard)

### 20.2 Cut (Edit Mode)

- Enable edit mode, select a range
- Press Cmd+X
- **Verify:** Selected bases removed from sequence
- **Verify:** Bases available for paste
- Undo — **Verify:** bases restored

### 20.3 Paste (Edit Mode)

- Copy bases, then enable edit mode
- Place cursor at desired position
- Press Cmd+V
- **Verify:** Bases inserted at cursor position
- **Verify:** Sequence length increases
- **Verify:** Features after insertion point shift accordingly

### 20.4 Wraparound Selection Copy

- On circular sequence, select a range wrapping around the origin
- Copy — **Verify:** correct concatenation of end + beginning bases

---

## 21. Selection Mechanics

### 21.1 Click-to-Select

- Click a position in any view — **Verify:** cursor placed, footer shows position
- Click and drag — **Verify:** range selected, start and end shown in footer

### 21.2 Wraparound Selection (Circular)

- On a circular sequence, select from near the end to near the beginning
- **Verify:** `wrapsAround` flag set to true
- **Verify:** Footer indicates wraparound selection
- **Verify:** Visual selection shown correctly in Circular View

### 21.3 Select All

- Press Ctrl/Cmd+A — **Verify:** entire sequence selected (0 to length-1)

---

## 22. Recent Sequences

- Create or import several sequences
- **Verify:** Sequences tracked in localStorage (up to 20)
- Close and reopen the app
- **Verify:** Recent sequences accessible (e.g., via import or programmatically)
- Create more than 20 sequences — **Verify:** oldest entries evicted

---

## 23. Footer / Status Bar

- With no sequence: **Verify:** footer shows minimal info
- With sequence loaded: **Verify:** footer shows sequence length (e.g., "5420 bp")
- With selection active: **Verify:** footer shows selection range (e.g., "Selected: 100-250")
- With wraparound selection: **Verify:** footer indicates wrap
- In edit mode: **Verify:** cursor position shown

---

## 24. Theme & Visual Design

### 24.1 Color Palette

- **Verify:** Background color is warm parchment (#faf9f5)
- **Verify:** Text color is near-black (#1a1a1a)
- **Verify:** Surface/card backgrounds are #f5f3ee, hover states are #eae7e1
- **Verify:** Borders are #e8e5df
- **Verify:** Muted text is #9c9690 or #6b6560
- **Verify:** Accent color is emerald-500 (#10b981) on buttons, badges, active states

### 24.2 Typography

- **Verify:** UI text uses Inter font
- **Verify:** Sequence/code text uses JetBrains Mono font
- **Verify:** Font sizes are consistent across similar elements

### 24.3 Feature Colors

- **Verify:** Each feature type has a distinct, recognizable color:
  - CDS = green (#31A354)
  - Promoter = orange (#E6994D)
  - Terminator = red
  - rep_origin = blue
  - primer_bind = purple
  - etc. (check FEATURE_COLORS constant)

---

## 25. Edge Cases & Error Handling

### 25.1 Empty / Minimal Sequences

- Create a sequence with 0 bases — **Verify:** no crash, empty state
- Create a sequence with 1 base — **Verify:** renders in all views
- Create a sequence with very long bases (100,000+ bp) — **Verify:** performance acceptable

### 25.2 Feature Edge Cases

- Add feature at position 0 — **Verify:** renders correctly
- Add feature at last base — **Verify:** renders correctly
- Add overlapping features — **Verify:** both render, no overlap issues in visualization
- Delete a region that contains a feature — **Verify:** feature removed or adjusted

### 25.3 Circular vs Linear Topology

- Switch a sequence's topology (if supported) — **Verify:** views update
- Import a linear GenBank file — **Verify:** no wraparound features allowed
- Import a circular GenBank file — **Verify:** wraparound features handled

### 25.4 Special Characters

- Enter sequence name with special characters (!@#$%^&) — **Verify:** handled gracefully
- Export with special characters in filename — **Verify:** sanitized or escaped

### 25.5 Rapid Interactions

- Rapidly switch between views (Cmd+1, 2, 3) — **Verify:** no rendering glitches
- Rapidly open/close dialogs — **Verify:** no state corruption
- Rapidly toggle features/ORFs/restriction sites — **Verify:** final state matches toggles

### 25.6 Browser Tab / Window

- Open app in two browser tabs — **Verify:** localStorage conflicts handled
- Close browser tab with unsaved changes — **Verify:** beforeunload warning if isDirty

---

## 26. API Proxy Endpoints

### 26.1 Addgene Proxy (`/api/addgene`)

- Fetch a valid plasmid — **Verify:** GenBank data returned
- Fetch an invalid plasmid ID — **Verify:** 404 or error response
- Exceed rate limit (10 req/min) — **Verify:** 429 response

### 26.2 BLAST Proxy (`/api/blast`)

- POST a query — **Verify:** RID returned
- GET poll for results — **Verify:** status or results returned
- Exceed rate limit (5 POST/min or 30 GET/min) — **Verify:** 429 response
- **Verify:** No user data beyond the query sequence is sent to NCBI

---

## 27. Privacy & Data Integrity

- **Verify:** No network requests on app load (besides static assets)
- **Verify:** No analytics or tracking scripts loaded
- **Verify:** All sequence data stored in localStorage/IndexedDB only
- **Verify:** Addgene proxy only fetches public data, never uploads user data
- **Verify:** BLAST proxy only sends the query sequence, nothing else
- Open browser DevTools Network tab and perform various operations — **Verify:** no unexpected outbound requests

---

## 28. End-to-End Workflow Tests

### 28.1 Complete Cloning Workflow

1. Import a vector plasmid from Addgene (e.g., pUC19)
2. Create a new insert sequence
3. Find restriction sites on both
4. Plan a restriction/ligation cloning
5. Simulate digest → view gel
6. Add features to the assembled construct
7. Export as GenBank
8. Re-import and verify round-trip integrity

### 28.2 Multi-Sequence Analysis

1. Import 3 different plasmids
2. Open in separate tabs
3. Use split view to compare two
4. Align two sequences
5. BLAST search one sequence
6. Auto-annotate all three
7. Export all as GenBank

### 28.3 Project Lifecycle

1. Create a new project
2. Import 2 sequences, save to project
3. Add features to both
4. Save project
5. Close browser entirely
6. Reopen browser, open project
7. **Verify:** All sequences, features, tabs, and view state restored exactly

### 28.4 Edit & Undo Stress Test

1. Open a sequence in edit mode
2. Make 50 edits (insert, delete, type)
3. Add 5 features between edits
4. Undo 30 steps
5. Make a new edit (clears redo history)
6. Redo — **Verify:** nothing to redo
7. Undo remaining — **Verify:** sequence returns to expected state
