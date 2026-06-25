# Code Review Diff Display Enhancement — Design Spec

**Date:** 2026-06-25
**Status:** Approved (pending user review of written spec)
**Scope:** Enhance AI code review result view to render diff alongside AI-flagged issues, with click-to-scroll highlighting and precise line-number linking.

---

## 1. Context

Current AI code review (`src/pages/CodeReview.tsx` + `src/components/MRReviewTabs.tsx`) renders AI issues as a flat list per project. The diff itself is fetched from MCP (`getMRDetails` → `{diff: string}`), passed verbatim to the LLM, but **never shown to the user**. The AI returns `lineRange` based on guessing from raw diff text — frequently off by 1–3 lines.

**Goal:** Render issues together with the diff in a GitHub-PR-like experience, with click-to-locate that lands on the exact line the AI flagged.

---

## 2. Decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Display layouts | **All three, switchable** via toolbar: Side-by-Side (A) / GitHub Inline (B) / Files Explorer (C) |
| D2 | Click interaction | **Auto-scroll + 1.5s highlight pulse** on target line |
| D3 | Line-number accuracy | **100% accurate** via client-side diff parsing + snippet lookup |
| D4 | Multi-file MR organization | **Option B** — collapsible per file with issue count badges |
| D5 | AI output strategy | **Code-snippet locating (B)** — AI returns `codeSnippet`, client resolves to exact line |

---

## 3. Architecture

```
MCP getMRDetails → { diff: string }
            ↓
┌────────────────────────────────────────────────────────────┐
│ utils/diffParser.ts                                         │
│   parseDiff(diff) → { files: [{                            │
│     path, hunks: [{ startLine,                             │
│       lines: [{ num, type: 'add'|'del'|'context',          │
│                  content }]                                │
│     }]                                                     │
│   }] }                                                     │
└────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────┐
│ LLM Prompt                                                 │
│   Input:  full diff string                                 │
│   Output: [{ filePath, codeSnippet, severity,              │
│             title, description }]                          │
└────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────┐
│ utils/issueResolver.ts                                     │
│   resolveIssues(issues, parsedDiff) → issues + lineNumber  │
│   • Exact match (whitespace-normalized, prefix-stripped)   │
│   • Multi-line match (joined hunk lines)                   │
│   • Fuzzy match (Levenshtein ≤ 2)                          │
│   • No match → resolved=false                              │
└────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────┐
│ MRReviewRecord persisted { diff, issues + lineNumber }     │
└────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────┐
│ DiffViewer (3 layouts) + IssueList (resolved / unresolved) │
│   Click issue → scrollIntoView + .highlight-pulse 1.5s     │
└────────────────────────────────────────────────────────────┘
```

**Separation of concerns:**
- AI = semantic understanding + natural-language description + location hint
- Client = diff parsing, authoritative line resolution, view rendering

---

## 4. Data Model

`src/types/index.ts`:

```ts
interface ReviewIssue {
  id: string;                       // uuid for click targeting
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  filePath: string;
  codeSnippet: string;              // replaces old `lineRange`
  lineNumber?: number;              // populated by issueResolver
  resolved: boolean;                // true when lineNumber is set
}

interface MRReviewRecord {
  id: string;
  projectId: string;
  mrId: string;
  mrTitle: string;
  mrUrl: string;
  diff: string;                     // NEW: raw diff text for view layer
  issues: ReviewIssue[];
  reviewedAt: string;
}
```

**Storage:**
- `MRReviewRecord.diff` persisted → avoid re-fetching from MCP on view.
- Parsing is lazy (`parseDiff` runs in `<DiffViewer>` mount).
- Issues written to DB already contain resolved `lineNumber`.

**Backward compatibility:**
- Old records (no `diff` field) → render degraded view: issue list only, with banner "无 diff 数据，点击『重新审核』升级".
- Old `lineRange` field stays in JSON blob for now; UI ignores it.
- Migration: `ALTER TABLE mr_review_records ADD COLUMN diff TEXT`. For sql.js in-memory rebuild this is fine; for persisted store we accept losing old issues (user's local data, can re-review).

---

## 5. Components

```
src/
├── components/
│   ├── DiffViewer/
│   │   ├── index.tsx                # container + layout switcher + scroll coordinator
│   │   ├── DiffLayoutSideBySide.tsx # A layout
│   │   ├── DiffLayoutInline.tsx     # B layout (GitHub-style)
│   │   ├── DiffLayoutFileExplorer.tsx # C layout
│   │   ├── FileSection.tsx          # collapsible per-file block (B/C reuse)
│   │   ├── DiffLine.tsx             # single line (num, +/-/space, content, highlight)
│   │   └── types.ts
│   └── MRReviewResult.tsx           # new parent owning currentIssueId state
├── utils/
│   ├── diffParser.ts                # NEW
│   ├── issueResolver.ts             # NEW
│   └── ...
```

**`DiffViewer/index.tsx`** — container
- Toolbar: 3 layout icons + current selection (persisted to `localStorage`)
- Props: `{ diff, issues, currentIssueId }`
- `useEffect` on `currentIssueId` change → `scrollToIssue(id)`:
  - find DOM line element via `data-file-path` + `data-line-number`
  - ensure parent `FileSection` is expanded
  - `scrollIntoView({ behavior: 'smooth', block: 'center' })`
  - add `.highlight-pulse` class, remove after 1500ms

**`FileSection.tsx`** — collapsible file block
- Props: `{ file, issuesInFile, defaultOpen, children }`
- Header: filename · `+N -M` · status badge · issue count badge (color-coded by severity)
- Default open when file has issues, closed otherwise
- Chevron rotation matches existing app convention (−90° ↔ 0°)

**`DiffLine.tsx`** — single line
- Props: `{ num, type, content, highlighted }`
- Renders: `[lineNumber] [+/−/space] [content]` with add=green / del=red / context=default
- `highlighted=true` → adds `.highlight-pulse` class (CSS keyframes, no JS animation)

**Three layout sub-components:**

| Layout | Structure |
|---|---|
| `DiffLayoutSideBySide` | `<div flex>` left = IssueList · right = stacked FileSections |
| `DiffLayoutInline` | Stacked FileSections, with `<IssueCallout>` inserted after the target line |
| `DiffLayoutFileExplorer` | Left file tree (with badges) · middle = selected FileSection · right = IssueList |

**`MRReviewResult.tsx`** — replaces inner content of existing `MRReviewTabs`
- Owns `currentIssueId` state
- Renders `<IssueList>` + `<DiffViewer>` inside selected layout

**Communication:**
```
MRReviewResult (currentIssueId)
  ├─ IssueList.onSelectIssue(id) → setCurrentIssueId
  └─ DiffViewer reacts → scrollToIssue
```

**Reused unchanged:** `ReviewProgress`, `MCPConfigPanel`, `LLMConfigPanel`, `SkillPanel`. Severity filter migrates from `MRReviewTabs` to `IssueList`. Excel export path unchanged.

---

## 6. Interactions & Edge Cases

**codeSnippet matching strategy** (`utils/issueResolver.ts`):
1. Exact match: normalize whitespace + strip `+`/`−`/space prefix → search in hunk lines
2. Multi-line: codeSnippet contains `\n` → match joined hunk lines
3. Fuzzy: normalized Levenshtein ≤ 2
4. No match → `resolved=false`; issue still rendered in unresolved group

**Issue groups in UI:**
- Resolved (`resolved=true`) → click triggers scroll + highlight
- Unresolved (`resolved=false`) → shown separately with ⊘ icon; click only highlights parent FileSection

**Severity filter:** retained `all/critical/warning/suggestion`; applies to both groups.

**Scroll & highlight:**
- `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- CSS `@keyframes pulse { 0% bg=#fef08a; 100% bg=transparent; }` over 1500ms
- If target line is inside a collapsed file → expand first, then scroll after RAF tick
- Multiple issues on same file → IssueList marks all; scroll lands on first

**Re-review:**
- Same MR re-triggered via `startBatchReview` → **replaces** issues (not merge)
- `diff` field overwritten with latest

**Empty states:**
- Empty diff → "该 MR 无文件变更"
- AI returns `[]` → green banner "✓ 未发现问题" above diff view

**Large diff handling:**
- File count > 50 → only files with issues expanded by default
- Single file > 1000 lines → that section collapsed by default
- No virtual scrolling yet — CSS overflow + lazy expansion. Add later if perf becomes a problem.

**Streaming:** not in scope. `streamEvents` stays unused. Batch flow remains the path. Streaming can be a follow-up after this ships.

**AI prompt update:** explicitly request JSON array with `codeSnippet`. Include guidance: "If the issue is general/architectural with no specific code, return empty `codeSnippet`."

---

## 7. Testing

**Unit (Vitest):**

`utils/diffParser.test.ts`
- Single-file diff parsing (hunk counts, startLine, line types)
- Multi-file diff parsing
- Rename / binary / delete-only diffs
- Empty diff, malformed diff → graceful fallback
- Line-number offset correctness with `@@ -10,5 +12,7 @@` headers

`utils/issueResolver.test.ts`
- Single-line exact match
- Multi-line (with `\n`) match
- Whitespace normalization + prefix stripping
- Fuzzy match (Levenshtein ≤ 2)
- No match → `resolved=false`
- Multiple matches → first + warn log

**Component (Vitest + RTL):**

`DiffViewer.test.tsx`
- 3 layouts: state switch renders correct sub-component
- `currentIssueId` change triggers `scrollIntoView` (mocked) + highlight class
- localStorage read/write on layout change

`FileSection.test.tsx`
- Collapse/expand toggle
- Default open when issues present, closed otherwise
- Badge counts and +/- stats render correctly

`DiffLine.test.tsx`
- add/del/context styling
- `highlighted=true` → `highlight-pulse` className present

`IssueList.test.tsx`
- Severity filter applies to both groups
- Resolved vs unresolved grouping
- Click → `onSelectIssue(id)`

**Integration:**
- Mock `getMRDetails` + mock LLM → full store flow → `DiffViewer` renders
- Old record (no `diff` field) → degraded view with "重新审核" CTA

**E2E (extend existing 23-case suite):**
- Complete review on sample MR → all 3 layouts render correctly
- Click issue → scroll + 1.5s highlight verified
- "重新审核" → issues replaced, no stale data
- Severity filter + Excel export still work (regression)

**Coverage targets:**
- `diffParser`, `issueResolver` ≥ 90% line coverage
- Components: main interaction paths, no exhaustive snapshot
- E2E ≥ 3 main paths: complete review, layout switch, re-review

---

## 8. Out of Scope

- Streaming review (`streamEvents` consumer) — separate follow-up
- Syntax highlighting in diff — plain text only for now
- AI review of full files (only diffs)
- Per-line inline commenting by user (review feedback is read-only)
- Real-time collaboration / multi-user review

---

## 9. Implementation Order (rough)

1. `utils/diffParser.ts` + tests
2. `utils/issueResolver.ts` + tests
3. Update `types/index.ts` + DAO migration
4. Update `codeReviewStore.ts` prompt + post-process
5. Build `DiffViewer` components (B layout first — most distinctive)
6. Build A and C layouts
7. `MRReviewResult` parent + IssueList refactor
8. Backward-compat degraded view
9. E2E tests + regression checks
10. Layout preference localStorage + visual polish