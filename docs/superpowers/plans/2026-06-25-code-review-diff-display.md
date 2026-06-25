# Code Review Diff Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render AI code review issues alongside the diff in a GitHub-PR-like experience with click-to-scroll highlighting and 100% accurate line linking.

**Architecture:** Client-side diff parser builds a structured file/hunk index. AI returns `codeSnippet` (not line numbers). Client resolves snippet to exact line via lookup. View layer offers 3 switchable layouts (Side-by-Side / GitHub Inline / Files Explorer) over the same parsed diff.

**Tech Stack:** React 18 + TypeScript, Zustand, Vitest (new) + @testing-library/react (new) for unit/component tests, Playwright (Python) for E2E.

**Spec:** `docs/superpowers/specs/2026-06-25-code-review-diff-display-design.md`

---

## File Structure

**New files:**
- `src/utils/diffParser.ts` — pure function, parses unified diff
- `src/utils/issueResolver.ts` — pure function, resolves snippet to line number
- `src/utils/diffParser.test.ts` — Vitest
- `src/utils/issueResolver.test.ts` — Vitest
- `src/components/DiffViewer/index.tsx` — container + layout switcher + scroll coordinator
- `src/components/DiffViewer/DiffLayoutSideBySide.tsx` — A layout
- `src/components/DiffViewer/DiffLayoutInline.tsx` — B layout (GitHub-style)
- `src/components/DiffViewer/DiffLayoutFileExplorer.tsx` — C layout
- `src/components/DiffViewer/FileSection.tsx` — collapsible per-file block
- `src/components/DiffViewer/DiffLine.tsx` — single line rendering
- `src/components/DiffViewer/IssueCallout.tsx` — inline issue badge (B layout)
- `src/components/DiffViewer/types.ts` — internal types
- `src/components/DiffViewer/__tests__/DiffViewer.test.tsx`
- `src/components/DiffViewer/__tests__/FileSection.test.tsx`
- `src/components/DiffViewer/__tests__/DiffLine.test.tsx`
- `src/components/DiffViewer/__tests__/IssueList.test.tsx`
- `src/components/MRReviewResult.tsx` — parent owning `currentIssueId` state
- `tests/test_code_review_diff_display.py` — E2E (extends existing Python+Playwright pattern)

**Modified files:**
- `package.json` — add Vitest deps + test script
- `vitest.config.ts` — new test config
- `src/types/index.ts` — new ReviewIssue shape, MRReviewRecord adds `diff` and `projectName`
- `src/db/index.ts` — add `diff` column to `mr_review_records`
- `src/db/codeReviewDao.ts` — read/write `diff` column
- `src/store/codeReviewStore.ts` — new AI prompt, post-process via resolver, persist diff
- `src/components/MRReviewTabs.tsx` — render `<MRReviewResult>` instead of inline issue list

**Test framework note:** This project has no JS unit test framework. We add Vitest in Task 1. Pure-function utilities use Vitest; React components use Vitest + RTL; full integration/E2E uses existing Python+Playwright pattern.

---

## Task 1: Add Vitest test framework

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/utils/smoke.test.ts`

- [ ] **Step 1: Install Vitest + RTL as dev dependencies**

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

Create file `vitest.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 3: Create `src/test-setup.ts`**

Create file `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add test script to `package.json`**

Modify `package.json` `scripts` block — add `"test": "vitest run"` and `"test:watch": "vitest"`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  ...
}
```

- [ ] **Step 5: Write a smoke test**

Create file `src/utils/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('arithmetic works', () => {
    expect(2 + 2).toBe(4)
  })
})
```

- [ ] **Step 6: Run the smoke test**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 7: Remove smoke test (it's done its job)**

```bash
rm src/utils/smoke.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-setup.ts
git commit -m "chore(test): add Vitest + RTL setup"
```

---

## Task 2: diffParser.ts (TDD)

**Files:**
- Create: `src/utils/diffParser.ts`
- Test: `src/utils/diffParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create file `src/utils/diffParser.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseDiff } from './diffParser'

describe('parseDiff', () => {
  it('returns empty result for empty input', () => {
    expect(parseDiff('')).toEqual({ files: [] })
  })

  it('returns empty result for whitespace-only input', () => {
    expect(parseDiff('   \n\n  ')).toEqual({ files: [] })
  })

  it('parses a single-file added-line diff', () => {
    const diff = [
      'diff --git a/utils/cache.ts b/utils/cache.ts',
      'index 0000..1111 100644',
      '--- a/utils/cache.ts',
      '+++ b/utils/cache.ts',
      '@@ -0,0 +1,2 @@',
      '+const cache = new Map()',
      '+cache.set("k", v)',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('utils/cache.ts')
    expect(result.files[0].hunks).toHaveLength(1)
    expect(result.files[0].hunks[0].startLine).toBe(1)
    expect(result.files[0].hunks[0].lines).toEqual([
      { num: 1, type: 'add', content: 'const cache = new Map()' },
      { num: 2, type: 'add', content: 'cache.set("k", v)' },
    ])
  })

  it('parses multi-file diff with mixed add/del/context', () => {
    const diff = [
      'diff --git a/api/users.ts b/api/users.ts',
      '--- a/api/users.ts',
      '+++ b/api/users.ts',
      '@@ -10,3 +10,5 @@',
      ' unchanged',
      '-removed line',
      '+added line 1',
      '+added line 2',
      ' unchanged after',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files[0].hunks[0].startLine).toBe(10)
    expect(result.files[0].hunks[0].lines.map(l => l.type)).toEqual([
      'context', 'del', 'add', 'add', 'context',
    ])
    expect(result.files[0].hunks[0].lines.map(l => l.num)).toEqual([
      10, 11, 11, 12, 13,
    ])
  })

  it('parses multiple files', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      'diff --git a/b.ts b/b.ts',
      '--- a/b.ts',
      '+++ b/b.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files.map(f => f.path)).toEqual(['a.ts', 'b.ts'])
  })

  it('computes +/- stats per file', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '--- a/x.ts',
      '+++ b/x.ts',
      '@@ -1,2 +1,3 @@',
      ' ctx',
      '-del',
      '+add1',
      '+add2',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files[0].additions).toBe(2)
    expect(result.files[0].deletions).toBe(1)
  })

  it('handles malformed diff gracefully (no hunk header)', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '+++ b/x.ts',
      '+some line without hunk header',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files).toEqual([])
  })

  it('strips trailing CR from line content', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '--- a/x.ts',
      '+++ b/x.ts',
      '@@ -0,0 +1 @@',
      '+const x = 1',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files[0].hunks[0].lines[0].content).toBe('const x = 1')
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- src/utils/diffParser.test.ts`
Expected: FAIL with "Cannot find module './diffParser'".

- [ ] **Step 3: Implement `parseDiff`**

Create file `src/utils/diffParser.ts`:

```ts
export type DiffLineType = 'add' | 'del' | 'context'

export interface ParsedDiffLine {
  num: number
  type: DiffLineType
  content: string
}

export interface ParsedHunk {
  startLine: number
  lines: ParsedDiffLine[]
}

export interface ParsedFile {
  path: string
  additions: number
  deletions: number
  hunks: ParsedHunk[]
}

export interface ParsedDiff {
  files: ParsedFile[]
}

const FILE_HEADER_RE = /^diff --git a\/(.+?) b\/(.+?)$/
const HUNK_HEADER_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/

export function parseDiff(raw: string): ParsedDiff {
  const files: ParsedFile[] = []
  if (!raw || !raw.trim()) return { files }

  const lines = raw.split('\n')
  let currentFile: ParsedFile | null = null
  let currentHunk: ParsedHunk | null = null
  let lineCursor = 0

  for (const rawLine of lines) {
    const fileMatch = rawLine.match(FILE_HEADER_RE)
    if (fileMatch) {
      currentFile = {
        path: fileMatch[2],
        additions: 0,
        deletions: 0,
        hunks: [],
      }
      currentHunk = null
      files.push(currentFile)
      continue
    }

    const hunkMatch = rawLine.match(HUNK_HEADER_RE)
    if (hunkMatch) {
      if (!currentFile) continue
      currentHunk = {
        startLine: parseInt(hunkMatch[1], 10),
        lines: [],
      }
      lineCursor = currentHunk.startLine
      currentFile.hunks.push(currentHunk)
      continue
    }

    if (!currentFile || !currentHunk) continue

    if (rawLine.startsWith('+')) {
      const content = rawLine.slice(1).replace(/\r$/, '')
      currentHunk.lines.push({ num: lineCursor, type: 'add', content })
      currentFile.additions += 1
      lineCursor += 1
    } else if (rawLine.startsWith('-')) {
      const content = rawLine.slice(1).replace(/\r$/, '')
      currentHunk.lines.push({ num: 0, type: 'del', content })
      currentFile.deletions += 1
    } else if (rawLine.startsWith(' ')) {
      const content = rawLine.slice(1).replace(/\r$/, '')
      currentHunk.lines.push({ num: lineCursor, type: 'context', content })
      lineCursor += 1
    } else if (rawLine.startsWith('\\')) {
      // "\ No newline at end of file" — skip
      continue
    }
  }

  return { files }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- src/utils/diffParser.test.ts`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/diffParser.ts src/utils/diffParser.test.ts
git commit -m "feat(diffParser): parse unified diff into structured files/hunks"
```

---

## Task 3: issueResolver.ts (TDD)

**Files:**
- Create: `src/utils/issueResolver.ts`
- Test: `src/utils/issueResolver.test.ts`

- [ ] **Step 1: Write failing tests**

Create file `src/utils/issueResolver.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveIssues } from './issueResolver'
import type { ParsedDiff } from './diffParser'
import type { AIResponseIssue } from './issueResolver'

const parsedDiff: ParsedDiff = {
  files: [
    {
      path: 'utils/cache.ts',
      additions: 2,
      deletions: 0,
      hunks: [
        {
          startLine: 1,
          lines: [
            { num: 1, type: 'add', content: 'const cache = new Map()' },
            { num: 2, type: 'add', content: 'cache.set("k", v)' },
          ],
        },
      ],
    },
    {
      path: 'api/users.ts',
      additions: 1,
      deletions: 1,
      hunks: [
        {
          startLine: 10,
          lines: [
            { num: 10, type: 'context', content: 'function fetchUser(id) {' },
            { num: 11, type: 'del', content: 'return fetch(url)' },
            { num: 11, type: 'add', content: 'return await fetch(url)' },
          ],
        },
      ],
    },
  ],
}

describe('resolveIssues', () => {
  it('resolves exact single-line snippet to added line', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: '可能内存泄漏',
        description: 'cache 没有清理',
        filePath: 'utils/cache.ts',
        codeSnippet: 'cache.set("k", v)',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBe(2)
    expect(resolved.resolved).toBe(true)
  })

  it('strips +/-/space prefix when AI includes it', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'test',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: '+ cache.set("k", v)',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBe(2)
  })

  it('normalizes whitespace differences', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'test',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: '  cache.set("k", v)  ',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBe(2)
  })

  it('marks issue as unresolved when snippet not found', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'not found',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: 'doesNotExist()',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBeUndefined()
    expect(resolved.resolved).toBe(false)
  })

  it('handles multi-line snippets joined by \\n', () => {
    const diff: ParsedDiff = {
      files: [
        {
          path: 'foo.ts',
          additions: 3,
          deletions: 0,
          hunks: [
            {
              startLine: 1,
              lines: [
                { num: 1, type: 'add', content: 'function foo() {' },
                { num: 2, type: 'add', content: '  doX()' },
                { num: 3, type: 'add', content: '}' },
              ],
            },
          ],
        },
      ],
    }
    const issues: AIResponseIssue[] = [
      {
        severity: 'critical',
        title: 'multi',
        description: 'test',
        filePath: 'foo.ts',
        codeSnippet: 'function foo() {\n  doX()\n}',
      },
    ]
    const [resolved] = resolveIssues(issues, diff)
    expect(resolved.lineNumber).toBe(1)
  })

  it('fuzzy-matches when 1 char differs', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'fuzzy',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: 'cache.set("k", x)', // x instead of v
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.resolved).toBe(true)
    expect(resolved.lineNumber).toBe(2)
  })

  it('preserves empty codeSnippet as unresolved with filePath only', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'suggestion',
        title: 'general',
        description: 'architectural',
        filePath: 'utils/cache.ts',
        codeSnippet: '',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.resolved).toBe(false)
    expect(resolved.lineNumber).toBeUndefined()
  })

  it('returns the same number of issues as input', () => {
    const issues: AIResponseIssue[] = [
      { severity: 'warning', title: 'a', description: '', filePath: 'utils/cache.ts', codeSnippet: 'const cache = new Map()' },
      { severity: 'warning', title: 'b', description: '', filePath: 'unknown.ts', codeSnippet: 'foo' },
    ]
    const resolved = resolveIssues(issues, parsedDiff)
    expect(resolved).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- src/utils/issueResolver.test.ts`
Expected: FAIL with "Cannot find module './issueResolver'".

- [ ] **Step 3: Implement `resolveIssues`**

Create file `src/utils/issueResolver.ts`:

```ts
import type { ParsedDiff, ParsedFile, ParsedHunk } from './diffParser'

export interface AIResponseIssue {
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath: string
  codeSnippet: string
}

export interface ResolvedIssue extends AIResponseIssue {
  id: string
  resolved: boolean
  lineNumber?: number
}

function normalize(s: string): string {
  return s.replace(/^[+\- ]/, '').trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1).fill(0).map((_, i) => i)
  let curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function findExact(snippet: string, file: ParsedFile): number | null {
  const target = normalize(snippet)
  if (!target) return null

  const lines = target.split('\n').map(l => normalize(l))
  if (lines.length === 1) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' && normalize(line.content) === target) {
          return line.num
        }
      }
    }
    return null
  }

  // multi-line: search consecutive hunk lines
  for (const hunk of file.hunks) {
    for (let i = 0; i <= hunk.lines.length - lines.length; i++) {
      let match = true
      for (let k = 0; k < lines.length; k++) {
        if (normalize(hunk.lines[i + k].content) !== lines[k]) {
          match = false
          break
        }
      }
      if (match) return hunk.lines[i].num
    }
  }
  return null
}

function findFuzzy(snippet: string, file: ParsedFile): number | null {
  const target = normalize(snippet)
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type !== 'add') continue
      const candidate = normalize(line.content)
      if (Math.abs(candidate.length - target.length) > 2) continue
      if (levenshtein(candidate, target) <= 2) return line.num
    }
  }
  return null
}

function makeId(): string {
  return `iss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function resolveIssues(
  issues: AIResponseIssue[],
  parsed: ParsedDiff
): ResolvedIssue[] {
  return issues.map(issue => {
    const file = parsed.files.find(f => f.path === issue.filePath)
    let lineNumber: number | undefined

    if (file && issue.codeSnippet) {
      lineNumber = findExact(issue.codeSnippet, file) ?? undefined
      if (lineNumber === undefined) {
        const fuzzy = findFuzzy(issue.codeSnippet, file)
        if (fuzzy !== null) {
          lineNumber = fuzzy
          console.warn(`[issueResolver] fuzzy-matched snippet for "${issue.title}"`)
        }
      }
    }

    return {
      ...issue,
      id: makeId(),
      lineNumber,
      resolved: lineNumber !== undefined,
    }
  })
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- src/utils/issueResolver.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/issueResolver.ts src/utils/issueResolver.test.ts
git commit -m "feat(issueResolver): resolve codeSnippet to exact line number"
```

---

## Task 4: Update types in src/types/index.ts

**Files:**
- Modify: `src/types/index.ts:122-139`

- [ ] **Step 1: Update `MRReviewRecord` to add `diff` and `projectName`, add `ReviewIssue` type**

In `src/types/index.ts`, replace the existing `MRReviewRecord` interface (lines 122-139) with:

```ts
export type IssueSeverity = 'critical' | 'warning' | 'suggestion'

export interface ReviewIssue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  filePath: string
  codeSnippet: string
  lineNumber?: number
  resolved: boolean
}

export interface MRReviewRecord {
  id: string
  projectId: string
  projectName: string
  mrId: string
  mrTitle: string
  mrUrl: string
  status: 'pending' | 'reviewing' | 'completed' | 'failed'
  diff: string
  issues: ReviewIssue[]
  reviewedAt: string
  createdAt: string
}
```

- [ ] **Step 2: Run TypeScript compile to verify**

Run: `npx tsc --noEmit`
Expected: errors only in files that haven't been updated yet (codeReviewStore.ts, codeReviewDao.ts, MRReviewTabs.tsx). That's expected — subsequent tasks fix them.

- [ ] **Step 3: Commit (type-only change)**

```bash
git add src/types/index.ts
git commit -m "refactor(types): ReviewIssue with codeSnippet+lineNumber, MRReviewRecord.diff"
```

---

## Task 5: DB migration + DAO update

**Files:**
- Modify: `src/db/index.ts:123-137`
- Modify: `src/db/codeReviewDao.ts:184-238`

- [ ] **Step 1: Add `diff` column to mr_review_records schema**

In `src/db/index.ts`, replace the `mr_review_records` CREATE TABLE block (lines 123-137) with:

```sql
CREATE TABLE IF NOT EXISTS mr_review_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  mr_id TEXT NOT NULL,
  mr_title TEXT NOT NULL,
  mr_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  diff TEXT DEFAULT '',
  issues TEXT DEFAULT '[]',
  reviewed_at TEXT,
  created_at TEXT
)
```

Then, immediately AFTER the `CREATE TABLE IF NOT EXISTS mr_review_records` block (after line 137), add a migration step that adds the column to existing tables:

```ts
// Migration: add diff column to existing tables (idempotent)
try {
  db.run(`ALTER TABLE mr_review_records ADD COLUMN diff TEXT DEFAULT ''`)
} catch {
  // column already exists — ignore
}
```

- [ ] **Step 2: Update `insertMRReviewRecord` to include `diff` and `projectName`**

In `src/db/codeReviewDao.ts`, replace `insertMRReviewRecord` (lines 184-193) with:

```ts
export function insertMRReviewRecord(record: MRReviewRecord): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO mr_review_records (id, project_id, project_name, mr_id, mr_title, mr_url, status, diff, issues, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id, record.projectId, record.projectName, record.mrId, record.mrTitle,
      record.mrUrl, record.status, record.diff, JSON.stringify(record.issues),
      record.reviewedAt, record.createdAt,
    ]
  )
}
```

- [ ] **Step 3: Update `getMRReviewRecordsByProject` to read `diff` and handle missing column**

In `src/db/codeReviewDao.ts`, replace `getMRReviewRecordsByProject` (lines 195-215) with:

```ts
export function getMRReviewRecordsByProject(projectId: string): MRReviewRecord[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec(
    `SELECT * FROM mr_review_records WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  )
  if (!result[0]) return []
  const columns = result[0].columns
  const diffIdx = columns.indexOf('diff')
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    projectName: row[2] as string,
    mrId: row[3] as string,
    mrTitle: row[4] as string,
    mrUrl: row[5] as string,
    status: row[6] as 'pending' | 'reviewing' | 'completed' | 'failed',
    diff: diffIdx >= 0 ? (row[diffIdx] as string ?? '') : '',
    issues: JSON.parse(row[7] as string) as MRReviewRecord['issues'],
    reviewedAt: row[8] as string,
    createdAt: row[9] as string,
  }))
}
```

- [ ] **Step 4: Update `updateMRReviewRecord` to allow updating `diff`**

In `src/db/codeReviewDao.ts`, in `updateMRReviewRecord` (lines 217-228), add a new branch after the existing `issues` branch:

```ts
  if (updates.diff !== undefined) { fields.push('diff = ?'); vals.push(updates.diff) }
```

So the final `updateMRReviewRecord` looks like:

```ts
export function updateMRReviewRecord(id: string, updates: Partial<MRReviewRecord>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.status !== undefined) { fields.push('status = ?'); vals.push(updates.status) }
  if (updates.diff !== undefined) { fields.push('diff = ?'); vals.push(updates.diff) }
  if (updates.issues !== undefined) { fields.push('issues = ?'); vals.push(JSON.stringify(updates.issues)) }
  if (updates.reviewedAt !== undefined) { fields.push('reviewed_at = ?'); vals.push(updates.reviewedAt) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE mr_review_records SET ${fields.join(', ')} WHERE id = ?`, vals)
}
```

- [ ] **Step 5: Update `getAllMRReviewRecords` to read `diff`**

In `src/db/codeReviewDao.ts`, in `getAllMRReviewRecords` (around line 238-241), apply the same defensive `diff` column reading pattern. Replace it with:

```ts
export function getAllMRReviewRecords(): MRReviewRecord[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec(`SELECT * FROM mr_review_records ORDER BY created_at DESC`)
  if (!result[0]) return []
  const columns = result[0].columns
  const diffIdx = columns.indexOf('diff')
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    projectName: row[2] as string,
    mrId: row[3] as string,
    mrTitle: row[4] as string,
    mrUrl: row[5] as string,
    status: row[6] as 'pending' | 'reviewing' | 'completed' | 'failed',
    diff: diffIdx >= 0 ? (row[diffIdx] as string ?? '') : '',
    issues: JSON.parse(row[7] as string) as MRReviewRecord['issues'],
    reviewedAt: row[8] as string,
    createdAt: row[9] as string,
  }))
}
```

- [ ] **Step 6: Run TypeScript compile to verify**

Run: `npx tsc --noEmit`
Expected: same errors as Task 4 step 2 (no new errors from this change).

- [ ] **Step 7: Commit**

```bash
git add src/db/index.ts src/db/codeReviewDao.ts
git commit -m "feat(db): persist MRReviewRecord.diff for diff viewer"
```

---

## Task 6: Update codeReviewStore.ts prompt + post-process

**Files:**
- Modify: `src/store/codeReviewStore.ts`

- [ ] **Step 1: Read current prompt and `parseIssuesFromResponse` to understand exact lines**

Run: `grep -n "parseIssuesFromResponse\|请分析以下\|codeSnippet\|lineRange" src/store/codeReviewStore.ts`
Expected: shows line numbers for `parseIssuesFromResponse` (around line 545) and the user prompt (around line 349). Use these line numbers in the next step.

- [ ] **Step 2: Update the user prompt to request `codeSnippet`**

In `src/store/codeReviewStore.ts`, replace the user prompt (around line 349) — find the string starting with `"请分析以下 MR 的代码变更"` and replace with:

```ts
const userPrompt = [
  '请分析以下 MR 的代码变更，识别问题。',
  '',
  'MR: ' + mr.title,
  'URL: ' + mr.url,
  '',
  'Diff:',
  diff,
  '',
  '请严格按以下 JSON 数组格式返回（不要 Markdown 代码块包裹）：',
  '[{',
  '  "severity": "critical" | "warning" | "suggestion",',
  '  "title": "一句话标题",',
  '  "description": "详细说明",',
  '  "filePath": "相对路径，例如 utils/cache.ts",',
  '  "codeSnippet": "diff 中引发问题的那一两行代码原文（不要带 +/- 前缀）"',
  '}]',
  '',
  '如果某个问题是整体性的、不针对具体代码行，codeSnippet 返回空字符串。',
].join('\n')
```

- [ ] **Step 3: Replace `parseIssuesFromResponse` to return raw AI issues (without line resolution)**

In `src/store/codeReviewStore.ts`, replace `parseIssuesFromResponse` (around line 545-574) with:

```ts
import { parseDiff } from '@/utils/diffParser'
import { resolveIssues, type AIResponseIssue } from '@/utils/issueResolver'

interface RawAIResponse {
  severity?: string
  title?: string
  description?: string
  filePath?: string
  codeSnippet?: string
}

function parseIssuesFromResponse(text: string): AIResponseIssue[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  let raw: unknown
  try {
    raw = JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is RawAIResponse => typeof item === 'object' && item !== null)
    .map(item => ({
      severity: (['critical', 'warning', 'suggestion'].includes(item.severity ?? '')
        ? item.severity
        : 'warning') as AIResponseIssue['severity'],
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
      filePath: String(item.filePath ?? ''),
      codeSnippet: String(item.codeSnippet ?? ''),
    }))
    .filter(i => i.title.length > 0)
}
```

- [ ] **Step 4: Add a helper that builds a complete `ReviewIssue[]` from raw AI output + diff**

In `src/store/codeReviewStore.ts`, after `parseIssuesFromResponse`, add:

```ts
function buildResolvedIssues(text: string, diff: string): ReviewIssue[] {
  const rawIssues = parseIssuesFromResponse(text)
  const parsed = parseDiff(diff)
  return resolveIssues(rawIssues, parsed)
}
```

- [ ] **Step 5: Update the call site in `startBatchReview` to use `buildResolvedIssues` and pass `diff` into the record**

In `src/store/codeReviewStore.ts`, in `startBatchReview`, find where `parseIssuesFromResponse(responseText)` is called and where `MRReviewRecord` is constructed. Replace the construction with code that uses `buildResolvedIssues` and includes `diff`. Locate the block that creates the record (search for `insertMRReviewRecord` or `MRReviewRecord` construction) and update it:

```ts
// Find this pattern:
const issues = parseIssuesFromResponse(responseText)
const record: MRReviewRecord = {
  ...,
  issues,
  ...
}

// Replace with:
const issues = buildResolvedIssues(responseText, diff)
const record: MRReviewRecord = {
  ...,
  diff,
  issues,
  ...
}
```

If the existing code uses a different shape, ensure the final record sets `diff: diff` and `issues: buildResolvedIssues(responseText, diff)`.

- [ ] **Step 6: Import new types and add `ReviewIssue` to the type import**

In `src/store/codeReviewStore.ts`, find the existing import line that brings in `MRReviewRecord` from `@/types` and update it:

```ts
import type { MRReviewRecord, ReviewIssue } from '@/types'
```

- [ ] **Step 7: Run TypeScript compile**

Run: `npx tsc --noEmit`
Expected: no errors from store.

- [ ] **Step 8: Commit**

```bash
git add src/store/codeReviewStore.ts
git commit -m "feat(store): request codeSnippet, resolve to lineNumber, persist diff"
```

---

## Task 7: DiffLine component

**Files:**
- Create: `src/components/DiffViewer/types.ts`
- Create: `src/components/DiffViewer/DiffLine.tsx`
- Create: `src/components/DiffViewer/__tests__/DiffLine.test.tsx`

- [ ] **Step 1: Create types file**

Create file `src/components/DiffViewer/types.ts`:

```ts
export type DiffLineType = 'add' | 'del' | 'context'

export interface ViewDiffLine {
  num: number
  type: DiffLineType
  content: string
}

export type LayoutMode = 'side-by-side' | 'inline' | 'file-explorer'
```

- [ ] **Step 2: Write failing test**

Create file `src/components/DiffViewer/__tests__/DiffLine.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffLine } from '../DiffLine'

describe('<DiffLine>', () => {
  it('renders added line with green styling and + prefix', () => {
    render(<DiffLine num={1} type="add" content="const x = 1" highlighted={false} />)
    const line = screen.getByTestId('diff-line')
    expect(line).toHaveTextContent('1')
    expect(line).toHaveTextContent('+')
    expect(line).toHaveTextContent('const x = 1')
    expect(line.className).toMatch(/add/)
  })

  it('renders deleted line with red styling and - prefix', () => {
    render(<DiffLine num={5} type="del" content="const old = 1" highlighted={false} />)
    expect(screen.getByTestId('diff-line').className).toMatch(/del/)
    expect(screen.getByTestId('diff-line').textContent).toContain('-')
  })

  it('renders context line with neutral styling', () => {
    render(<DiffLine num={3} type="context" content="unchanged" highlighted={false} />)
    expect(screen.getByTestId('diff-line').className).toMatch(/context/)
  })

  it('applies highlight-pulse class when highlighted=true', () => {
    render(<DiffLine num={1} type="add" content="x" highlighted={true} />)
    expect(screen.getByTestId('diff-line').className).toMatch(/highlight-pulse/)
  })

  it('does not apply highlight-pulse class when highlighted=false', () => {
    render(<DiffLine num={1} type="add" content="x" highlighted={false} />)
    expect(screen.getByTestId('diff-line').className).not.toMatch(/highlight-pulse/)
  })
})
```

- [ ] **Step 3: Run tests, verify failure**

Run: `npm test -- src/components/DiffViewer/__tests__/DiffLine.test.tsx`
Expected: FAIL — DiffLine module not found.

- [ ] **Step 4: Implement DiffLine**

Create file `src/components/DiffViewer/DiffLine.tsx`:

```tsx
import type { ViewDiffLine } from './types'

interface Props extends ViewDiffLine {
  highlighted: boolean
  filePath: string
}

const PREFIX: Record<ViewDiffLine['type'], string> = {
  add: '+',
  del: '-',
  context: ' ',
}

export function DiffLine({ num, type, content, highlighted, filePath }: Props) {
  const cls = ['diff-line', type, highlighted ? 'highlight-pulse' : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      className={cls}
      data-testid="diff-line"
      data-file-path={filePath}
      data-line-number={num}
    >
      <span className="diff-line-num">{num || ''}</span>
      <span className="diff-line-prefix">{PREFIX[type]}</span>
      <span className="diff-line-content">{content}</span>
    </div>
  )
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- src/components/DiffViewer/__tests__/DiffLine.test.tsx`
Expected: all 5 tests pass.

- [ ] **Step 6: Add CSS for DiffLine in `src/styles/` (find or create appropriate stylesheet)**

Open `src/styles/` and locate the global stylesheet (e.g. `index.css` or a `codeReview.css`). Add at the end:

```css
.diff-line {
  display: grid;
  grid-template-columns: 48px 24px 1fr;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  line-height: 18px;
  white-space: pre;
}
.diff-line-num { color: #9ca3af; text-align: right; padding-right: 8px; user-select: none; }
.diff-line-prefix { color: #6b7280; user-select: none; }
.diff-line.add { background: #e6f4ea; }
.diff-line.add .diff-line-content { color: #22863a; }
.diff-line.del { background: #fde8e8; }
.diff-line.del .diff-line-content { color: #b42318; }
.diff-line.context { background: transparent; }
.diff-line.highlight-pulse {
  animation: highlight-pulse 1.5s ease-out;
}
@keyframes highlight-pulse {
  0% { background-color: #fef08a; }
  100% { background-color: inherit; }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/DiffViewer/types.ts src/components/DiffViewer/DiffLine.tsx src/components/DiffViewer/__tests__/DiffLine.test.tsx src/styles/
git commit -m "feat(DiffLine): render add/del/context lines with highlight pulse"
```

---

## Task 8: FileSection component

**Files:**
- Create: `src/components/DiffViewer/FileSection.tsx`
- Create: `src/components/DiffViewer/__tests__/FileSection.test.tsx`

- [ ] **Step 1: Write failing test**

Create file `src/components/DiffViewer/__tests__/FileSection.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileSection } from '../FileSection'
import type { ParsedFile } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'

const file: ParsedFile = {
  path: 'utils/cache.ts',
  additions: 2,
  deletions: 1,
  hunks: [
    {
      startLine: 1,
      lines: [
        { num: 0, type: 'del', content: 'old' },
        { num: 1, type: 'add', content: 'new1' },
        { num: 2, type: 'add', content: 'new2' },
      ],
    },
  ],
}

const issues: ReviewIssue[] = [
  {
    id: 'i1', severity: 'warning', title: 't', description: 'd',
    filePath: 'utils/cache.ts', codeSnippet: 'new1', lineNumber: 1, resolved: true,
  },
]

describe('<FileSection>', () => {
  it('renders filename and +/- stats', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    expect(screen.getByText('utils/cache.ts')).toBeInTheDocument()
    expect(screen.getByText('+2 -1')).toBeInTheDocument()
  })

  it('shows issue count badge when issuesInFile non-empty', () => {
    render(<FileSection file={file} issuesInFile={issues} defaultOpen={true} />)
    expect(screen.getByTestId('file-issue-count')).toHaveTextContent('1')
  })

  it('expands body when defaultOpen=true', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    expect(screen.getByTestId('file-body')).toBeVisible()
  })

  it('collapses body when defaultOpen=false', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={false} />)
    expect(screen.queryByTestId('file-body')).not.toBeInTheDocument()
  })

  it('toggles on header click', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    fireEvent.click(screen.getByTestId('file-header'))
    expect(screen.queryByTestId('file-body')).not.toBeInTheDocument()
  })

  it('renders each diff line as DiffLine', () => {
    render(<FileSection file={file} issuesInFile={[]} defaultOpen={true} />)
    expect(screen.getAllByTestId('diff-line')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- src/components/DiffViewer/__tests__/FileSection.test.tsx`
Expected: FAIL — FileSection module not found.

- [ ] **Step 3: Implement FileSection**

Create file `src/components/DiffViewer/FileSection.tsx`:

```tsx
import { useState } from 'react'
import type { ParsedFile } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { DiffLine } from './DiffLine'

interface Props {
  file: ParsedFile
  issuesInFile: ReviewIssue[]
  defaultOpen: boolean
  highlightedLine?: number
}

export function FileSection({ file, issuesInFile, defaultOpen, highlightedLine }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="file-section" data-file-path={file.path}>
      <div
        className="file-section-header"
        data-testid="file-header"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', background: '#f5f5f5', borderBottom: '1px solid #e5e7eb' }}
      >
        <span className="file-section-chevron" style={{ transform: `rotate(${open ? 0 : -90}deg)`, transition: 'transform 0.15s' }}>▾</span>
        <span className="file-section-path" style={{ fontWeight: 500 }}>{file.path}</span>
        <span className="file-section-stats" style={{ color: '#6b7280', fontSize: 12 }}>+{file.additions} -{file.deletions}</span>
        {issuesInFile.length > 0 && (
          <span
            data-testid="file-issue-count"
            style={{
              background: issuesInFile.some(i => i.severity === 'critical') ? '#ef4444'
                : issuesInFile.some(i => i.severity === 'warning') ? '#f59e0b'
                : '#3b82f6',
              color: 'white', borderRadius: 8, padding: '0 6px', fontSize: 11,
            }}
          >
            {issuesInFile.length}
          </span>
        )}
      </div>
      {open && (
        <div className="file-section-body" data-testid="file-body">
          {file.hunks.flatMap(h =>
            h.lines.map((line, idx) => (
              <DiffLine
                key={`${h.startLine}-${idx}`}
                num={line.num}
                type={line.type}
                content={line.content}
                highlighted={highlightedLine === line.num}
                filePath={file.path}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- src/components/DiffViewer/__tests__/FileSection.test.tsx`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiffViewer/FileSection.tsx src/components/DiffViewer/__tests__/FileSection.test.tsx
git commit -m "feat(FileSection): collapsible file block with issue badge"
```

---

## Task 9: IssueList + IssueCallout components

**Files:**
- Create: `src/components/DiffViewer/IssueCallout.tsx`
- Create: `src/components/DiffViewer/IssueList.tsx`
- Create: `src/components/DiffViewer/__tests__/IssueList.test.tsx`

- [ ] **Step 1: Write failing test for IssueList**

Create file `src/components/DiffViewer/__tests__/IssueList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssueList } from '../IssueList'
import type { ReviewIssue } from '@/types'

const mk = (over: Partial<ReviewIssue>): ReviewIssue => ({
  id: over.id ?? 'i',
  severity: over.severity ?? 'warning',
  title: over.title ?? 'title',
  description: over.description ?? 'desc',
  filePath: over.filePath ?? 'x.ts',
  codeSnippet: over.codeSnippet ?? '',
  resolved: over.resolved ?? true,
  lineNumber: over.lineNumber,
})

describe('<IssueList>', () => {
  it('renders all issues when filter is "all"', () => {
    const issues = [mk({ id: 'a', severity: 'critical' }), mk({ id: 'b', severity: 'suggestion' })]
    render(<IssueList issues={issues} onSelectIssue={() => {}} />)
    expect(screen.getAllByTestId('issue-item')).toHaveLength(2)
  })

  it('filters issues by severity', () => {
    const issues = [mk({ id: 'a', severity: 'critical' }), mk({ id: 'b', severity: 'warning' })]
    render(<IssueList issues={issues} onSelectIssue={() => {}} initialFilter="critical" />)
    expect(screen.getAllByTestId('issue-item')).toHaveLength(1)
    expect(screen.getByTestId('issue-item')).toHaveTextContent('critical')
  })

  it('separates resolved and unresolved groups', () => {
    const issues = [
      mk({ id: 'a', resolved: true, lineNumber: 10 }),
      mk({ id: 'b', resolved: false }),
    ]
    render(<IssueList issues={issues} onSelectIssue={() => {}} />)
    expect(screen.getByTestId('group-resolved')).toBeInTheDocument()
    expect(screen.getByTestId('group-unresolved')).toBeInTheDocument()
  })

  it('calls onSelectIssue when item clicked', () => {
    const cb = vi.fn()
    const issues = [mk({ id: 'a' })]
    render(<IssueList issues={issues} onSelectIssue={cb} />)
    fireEvent.click(screen.getByTestId('issue-item'))
    expect(cb).toHaveBeenCalledWith('a')
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- src/components/DiffViewer/__tests__/IssueList.test.tsx`
Expected: FAIL — IssueList module not found.

- [ ] **Step 3: Implement IssueList**

Create file `src/components/DiffViewer/IssueList.tsx`:

```tsx
import { useState } from 'react'
import type { ReviewIssue, IssueSeverity } from '@/types'

interface Props {
  issues: ReviewIssue[]
  onSelectIssue: (id: string) => void
  initialFilter?: IssueSeverity | 'all'
}

type Filter = IssueSeverity | 'all'

const SEVERITY_LABEL: Record<Filter, string> = {
  all: '全部',
  critical: '严重',
  warning: '警告',
  suggestion: '建议',
}

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  suggestion: '#3b82f6',
}

export function IssueList({ issues, onSelectIssue, initialFilter = 'all' }: Props) {
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const matchesFilter = (i: ReviewIssue) => filter === 'all' || i.severity === filter

  const resolved = issues.filter(i => i.resolved && matchesFilter(i))
  const unresolved = issues.filter(i => !i.resolved && matchesFilter(i))

  return (
    <div className="issue-list" data-testid="issue-list">
      <div className="issue-list-filter" style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid #e5e7eb' }}>
        {(['all', 'critical', 'warning', 'suggestion'] as Filter[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            data-testid={`filter-${f}`}
            style={{
              padding: '2px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              background: filter === f ? '#3b82f6' : 'white',
              color: filter === f ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {SEVERITY_LABEL[f]}
          </button>
        ))}
      </div>
      <div data-testid="group-resolved" style={{ padding: 4 }}>
        {resolved.map(i => (
          <div
            key={i.id}
            data-testid="issue-item"
            data-issue-id={i.id}
            onClick={() => onSelectIssue(i.id)}
            style={{ borderLeft: `3px solid ${SEVERITY_COLOR[i.severity]}`, padding: '6px 8px', marginBottom: 4, cursor: 'pointer', background: 'white', borderRadius: 4 }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ background: SEVERITY_COLOR[i.severity], color: 'white', borderRadius: 4, padding: '0 4px', fontSize: 11 }}>{i.severity}</span>
              <span style={{ fontWeight: 500 }}>{i.title}</span>
              {i.lineNumber !== undefined && (
                <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 11 }}>L{i.lineNumber}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{i.filePath}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{i.description}</div>
          </div>
        ))}
      </div>
      {unresolved.length > 0 && (
        <div data-testid="group-unresolved" style={{ padding: 4, borderTop: '1px dashed #e5e7eb' }}>
          <div style={{ padding: 4, fontSize: 11, color: '#6b7280' }}>未定位 ({unresolved.length})</div>
          {unresolved.map(i => (
            <div
              key={i.id}
              data-testid="issue-item"
              data-issue-id={i.id}
              onClick={() => onSelectIssue(i.id)}
              style={{ borderLeft: '3px solid #9ca3af', padding: '6px 8px', marginBottom: 4, cursor: 'pointer', background: '#fafafa', borderRadius: 4, opacity: 0.85 }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>⊘</span>
                <span style={{ fontWeight: 500 }}>{i.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{i.filePath}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{i.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement IssueCallout**

Create file `src/components/DiffViewer/IssueCallout.tsx`:

```tsx
import type { ReviewIssue } from '@/types'

const SEVERITY_COLOR: Record<ReviewIssue['severity'], string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  suggestion: '#3b82f6',
}

interface Props {
  issue: ReviewIssue
  onClick: (id: string) => void
}

export function IssueCallout({ issue, onClick }: Props) {
  return (
    <div
      data-testid="issue-callout"
      onClick={() => onClick(issue.id)}
      style={{
        borderLeft: `3px solid ${SEVERITY_COLOR[issue.severity]}`,
        background: '#fff8e1',
        padding: '6px 10px',
        margin: '2px 0 2px 72px',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 500 }}>{issue.title}</div>
      <div style={{ color: '#6b7280', marginTop: 2 }}>{issue.description}</div>
    </div>
  )
}
```

- [ ] **Step 5: Run IssueList tests**

Run: `npm test -- src/components/DiffViewer/__tests__/IssueList.test.tsx`
Expected: all 4 IssueList tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/DiffViewer/IssueList.tsx src/components/DiffViewer/IssueCallout.tsx src/components/DiffViewer/__tests__/IssueList.test.tsx
git commit -m "feat(IssueList): filter + resolved/unresolved groups + IssueCallout"
```

---

## Task 10: DiffLayoutInline (B layout — most distinctive)

**Files:**
- Create: `src/components/DiffViewer/DiffLayoutInline.tsx`
- Test file later (integration via DiffViewer.test.tsx in Task 12)

- [ ] **Step 1: Implement DiffLayoutInline**

Create file `src/components/DiffViewer/DiffLayoutInline.tsx`:

```tsx
import { useMemo } from 'react'
import { parseDiff } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { DiffLine } from './DiffLine'
import { IssueCallout } from './IssueCallout'

interface Props {
  diff: string
  issues: ReviewIssue[]
  highlightedIssueId: string | null
  onSelectIssue: (id: string) => void
}

export function DiffLayoutInline({ diff, issues, highlightedIssueId, onSelectIssue }: Props) {
  const parsed = useMemo(() => parseDiff(diff), [diff])
  const highlighted = highlightedIssueId
    ? issues.find(i => i.id === highlightedIssueId)
    : undefined

  const issuesByFile = useMemo(() => {
    const map = new Map<string, ReviewIssue[]>()
    for (const i of issues) {
      if (!i.resolved) continue
      const list = map.get(i.filePath) ?? []
      list.push(i)
      map.set(i.filePath, list)
    }
    return map
  }, [issues])

  return (
    <div className="diff-layout-inline" data-testid="diff-layout-inline">
      {parsed.files.map(file => (
        <div key={file.path} className="diff-file-block">
          <div
            style={{
              padding: '6px 10px', background: '#f5f5f5',
              borderBottom: '1px solid #e5e7eb', fontWeight: 500,
            }}
          >
            📄 {file.path} <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 400 }}>+{file.additions} -{file.deletions}</span>
            {(issuesByFile.get(file.path)?.length ?? 0) > 0 && (
              <span style={{ marginLeft: 8, background: '#ef4444', color: 'white', borderRadius: 8, padding: '0 6px', fontSize: 11 }}>
                {issuesByFile.get(file.path)!.length} issues
              </span>
            )}
          </div>
          {file.hunks.flatMap(h =>
            h.lines.flatMap((line, idx) => {
              const lineIssues = (issuesByFile.get(file.path) ?? []).filter(
                i => i.lineNumber === line.num
              )
              return [
                <DiffLine
                  key={`${h.startLine}-${idx}`}
                  num={line.num}
                  type={line.type}
                  content={line.content}
                  highlighted={highlighted !== undefined && lineIssues.some(i => i.id === highlighted.id)}
                  filePath={file.path}
                />,
                ...lineIssues.map(issue => (
                  <IssueCallout key={issue.id} issue={issue} onClick={onSelectIssue} />
                )),
              ]
            })
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke check (no test yet — covered by integration test in Task 12)**

Run: `npm run dev` and navigate to the CodeReview page if a record exists; otherwise skip until integration task.

- [ ] **Step 3: Commit**

```bash
git add src/components/DiffViewer/DiffLayoutInline.tsx
git commit -m "feat(DiffLayoutInline): GitHub-style diff with inline issue callouts"
```

---

## Task 11: DiffLayoutSideBySide + DiffLayoutFileExplorer

**Files:**
- Create: `src/components/DiffViewer/DiffLayoutSideBySide.tsx`
- Create: `src/components/DiffViewer/DiffLayoutFileExplorer.tsx`

- [ ] **Step 1: Implement DiffLayoutSideBySide (A)**

Create file `src/components/DiffViewer/DiffLayoutSideBySide.tsx`:

```tsx
import { useMemo } from 'react'
import { parseDiff } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { IssueList } from './IssueList'
import { FileSection } from './FileSection'

interface Props {
  diff: string
  issues: ReviewIssue[]
  highlightedIssueId: string | null
  highlightedLine: number | null
  highlightedFile: string | null
  onSelectIssue: (id: string) => void
}

export function DiffLayoutSideBySide({ diff, issues, highlightedLine, highlightedFile, onSelectIssue }: Props) {
  const parsed = useMemo(() => parseDiff(diff), [diff])
  const issuesByFile = useMemo(() => {
    const m = new Map<string, ReviewIssue[]>()
    for (const i of issues) {
      if (!i.resolved) continue
      const list = m.get(i.filePath) ?? []
      list.push(i)
      m.set(i.filePath, list)
    }
    return m
  }, [issues])

  return (
    <div
      className="diff-layout-side-by-side"
      data-testid="diff-layout-side-by-side"
      style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 0, flex: 1 }}
    >
      <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
        <IssueList issues={issues} onSelectIssue={onSelectIssue} />
      </div>
      <div style={{ overflowY: 'auto' }}>
        {parsed.files.map(file => (
          <FileSection
            key={file.path}
            file={file}
            issuesInFile={issuesByFile.get(file.path) ?? []}
            defaultOpen={true}
            highlightedLine={highlightedFile === file.path ? highlightedLine ?? undefined : undefined}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement DiffLayoutFileExplorer (C)**

Create file `src/components/DiffViewer/DiffLayoutFileExplorer.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { parseDiff } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { IssueList } from './IssueList'
import { FileSection } from './FileSection'

interface Props {
  diff: string
  issues: ReviewIssue[]
  highlightedIssueId: string | null
  highlightedLine: number | null
  highlightedFile: string | null
  onSelectIssue: (id: string) => void
}

export function DiffLayoutFileExplorer({ diff, issues, highlightedLine, highlightedFile, onSelectIssue }: Props) {
  const parsed = useMemo(() => parseDiff(diff), [diff])
  const [selected, setSelected] = useState<string | null>(parsed.files[0]?.path ?? null)
  const issuesByFile = useMemo(() => {
    const m = new Map<string, ReviewIssue[]>()
    for (const i of issues) {
      if (!i.resolved) continue
      const list = m.get(i.filePath) ?? []
      list.push(i)
      m.set(i.filePath, list)
    }
    return m
  }, [issues])

  return (
    <div
      className="diff-layout-file-explorer"
      data-testid="diff-layout-file-explorer"
      style={{ display: 'grid', gridTemplateColumns: '200px 1fr 320px', flex: 1, minHeight: 0 }}
    >
      <div style={{ borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#fafafa' }}>
        {parsed.files.map(file => {
          const fileIssues = issuesByFile.get(file.path) ?? []
          return (
            <div
              key={file.path}
              data-testid="file-tree-item"
              onClick={() => setSelected(file.path)}
              style={{
                padding: '6px 8px', cursor: 'pointer',
                background: selected === file.path ? '#dbeafe' : 'transparent',
                fontSize: 13,
              }}
            >
              📄 {file.path}
              {fileIssues.length > 0 && (
                <span style={{ marginLeft: 4, background: '#ef4444', color: 'white', borderRadius: 8, padding: '0 5px', fontSize: 10 }}>
                  {fileIssues.length}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ overflowY: 'auto' }}>
        {parsed.files
          .filter(f => f.path === selected)
          .map(file => (
            <FileSection
              key={file.path}
              file={file}
              issuesInFile={issuesByFile.get(file.path) ?? []}
              defaultOpen={true}
              highlightedLine={highlightedFile === file.path ? highlightedLine ?? undefined : undefined}
            />
          ))}
      </div>
      <div style={{ borderLeft: '1px solid #e5e7eb', overflowY: 'auto' }}>
        <IssueList issues={issues} onSelectIssue={onSelectIssue} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DiffViewer/DiffLayoutSideBySide.tsx src/components/DiffViewer/DiffLayoutFileExplorer.tsx
git commit -m "feat(layouts): add SideBySide and FileExplorer layout variants"
```

---

## Task 12: DiffViewer container + scroll coordination

**Files:**
- Create: `src/components/DiffViewer/index.tsx`
- Create: `src/components/DiffViewer/__tests__/DiffViewer.test.tsx`

- [ ] **Step 1: Write failing test**

Create file `src/components/DiffViewer/__tests__/DiffViewer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffViewer } from '..'
import type { ReviewIssue } from '@/types'

const SAMPLE_DIFF = [
  'diff --git a/x.ts b/x.ts',
  '--- a/x.ts',
  '+++ b/x.ts',
  '@@ -1 +1 @@',
  '-old',
  '+new',
].join('\n')

const issues: ReviewIssue[] = [
  { id: 'a', severity: 'warning', title: 't', description: 'd',
    filePath: 'x.ts', codeSnippet: 'new', lineNumber: 1, resolved: true },
]

describe('<DiffViewer>', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders inline layout by default', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByTestId('diff-layout-inline')).toBeInTheDocument()
  })

  it('switches layout when toolbar button clicked', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    fireEvent.click(screen.getByTestId('layout-side-by-side'))
    expect(screen.getByTestId('diff-layout-side-by-side')).toBeInTheDocument()
  })

  it('persists layout to localStorage', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    fireEvent.click(screen.getByTestId('layout-file-explorer'))
    expect(localStorage.getItem('diffViewer.layout')).toBe('file-explorer')
  })

  it('reads layout from localStorage on mount', () => {
    localStorage.setItem('diffViewer.layout', 'side-by-side')
    render(<DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByTestId('diff-layout-side-by-side')).toBeInTheDocument()
  })

  it('shows empty-state when diff is empty', () => {
    render(<DiffViewer diff="" issues={[]} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByText(/无文件变更/i)).toBeInTheDocument()
  })

  it('shows green banner when AI returns no issues', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} issues={[]} currentIssueId={null} onSelectIssue={() => {}} />)
    expect(screen.getByText(/未发现问题/i)).toBeInTheDocument()
  })

  it('calls scrollIntoView when currentIssueId changes', () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const { rerender } = render(
      <DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId={null} onSelectIssue={() => {}} />
    )
    rerender(
      <DiffViewer diff={SAMPLE_DIFF} issues={issues} currentIssueId="a" onSelectIssue={() => {}} />
    )
    expect(scrollSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- src/components/DiffViewer/__tests__/DiffViewer.test.tsx`
Expected: FAIL — DiffViewer module not found.

- [ ] **Step 3: Implement DiffViewer**

Create file `src/components/DiffViewer/index.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReviewIssue } from '@/types'
import { DiffLayoutInline } from './DiffLayoutInline'
import { DiffLayoutSideBySide } from './DiffLayoutSideBySide'
import { DiffLayoutFileExplorer } from './DiffLayoutFileExplorer'
import type { LayoutMode } from './types'

const STORAGE_KEY = 'diffViewer.layout'

function loadLayout(): LayoutMode {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'side-by-side' || v === 'inline' || v === 'file-explorer') return v
  return 'inline'
}

interface Props {
  diff: string
  issues: ReviewIssue[]
  currentIssueId: string | null
  onSelectIssue: (id: string) => void
}

const LAYOUTS: { value: LayoutMode; label: string; testId: string }[] = [
  { value: 'side-by-side', label: '分栏', testId: 'layout-side-by-side' },
  { value: 'inline', label: '内联', testId: 'layout-inline' },
  { value: 'file-explorer', label: '文件浏览', testId: 'layout-file-explorer' },
]

export function DiffViewer({ diff, issues, currentIssueId, onSelectIssue }: Props) {
  const [layout, setLayout] = useState<LayoutMode>(loadLayout)
  const containerRef = useRef<HTMLDivElement>(null)

  const highlighted = currentIssueId ? issues.find(i => i.id === currentIssueId) : null
  const highlightedLine = highlighted?.lineNumber ?? null
  const highlightedFile = highlighted?.filePath ?? null

  useEffect(() => {
    if (!highlighted) return
    const el = containerRef.current?.querySelector(
      `[data-file-path="${CSS.escape(highlighted.filePath)}"][data-line-number="${highlighted.lineNumber ?? ''}"]`
    ) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIssueId, highlighted])

  const handleLayoutChange = (l: LayoutMode) => {
    setLayout(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const empty = !diff || diff.trim() === ''

  return (
    <div className="diff-viewer" data-testid="diff-viewer" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="diff-viewer-toolbar" style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid #e5e7eb' }}>
        {LAYOUTS.map(l => (
          <button
            key={l.value}
            type="button"
            data-testid={l.testId}
            onClick={() => handleLayoutChange(l.value)}
            style={{
              padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 4,
              background: layout === l.value ? '#3b82f6' : 'white',
              color: layout === l.value ? 'white' : '#374151',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            {l.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>
          {issues.filter(i => i.resolved).length} / {issues.length} 已定位
        </div>
      </div>
      {empty ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>该 MR 无文件变更</div>
      ) : issues.length === 0 ? (
        <div data-testid="no-issues-banner" style={{ padding: 12, background: '#d1fae5', color: '#065f46', textAlign: 'center', fontWeight: 500 }}>
          ✓ 未发现问题
        </div>
      ) : null}
      {!empty && (
        layout === 'inline' ? (
          <DiffLayoutInline diff={diff} issues={issues} highlightedIssueId={currentIssueId} onSelectIssue={onSelectIssue} />
        ) : layout === 'side-by-side' ? (
          <DiffLayoutSideBySide diff={diff} issues={issues} highlightedIssueId={currentIssueId} highlightedLine={highlightedLine} highlightedFile={highlightedFile} onSelectIssue={onSelectIssue} />
        ) : (
          <DiffLayoutFileExplorer diff={diff} issues={issues} highlightedIssueId={currentIssueId} highlightedLine={highlightedLine} highlightedFile={highlightedFile} onSelectIssue={onSelectIssue} />
        )
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- src/components/DiffViewer/__tests__/DiffViewer.test.tsx`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiffViewer/index.tsx src/components/DiffViewer/__tests__/DiffViewer.test.tsx
git commit -m "feat(DiffViewer): layout switcher + localStorage + scroll coordination"
```

---

## Task 13: MRReviewResult parent + integrate into MRReviewTabs

**Files:**
- Create: `src/components/MRReviewResult.tsx`
- Modify: `src/components/MRReviewTabs.tsx`

- [ ] **Step 1: Read current `MRReviewTabs.tsx` to understand its inner structure**

Run: `wc -l src/components/MRReviewTabs.tsx && head -60 src/components/MRReviewTabs.tsx`
Expected: 124 lines, with Tabs/TabPanel + inline issue list rendering.

- [ ] **Step 2: Create `MRReviewResult.tsx`**

Create file `src/components/MRReviewResult.tsx`:

```tsx
import { useState } from 'react'
import type { MRReviewRecord, ReviewIssue } from '@/types'
import { DiffViewer } from './DiffViewer'

interface Props {
  record: MRReviewRecord
  onRerun?: () => void
}

export function MRReviewResult({ record, onRerun }: Props) {
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(null)
  const hasDiff = record.diff && record.diff.trim().length > 0

  if (!hasDiff) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, color: '#6b7280' }}>该记录为旧版本，无 diff 数据，无法显示代码上下文</div>
        {onRerun && (
          <button
            type="button"
            data-testid="rerun-review"
            onClick={onRerun}
            style={{ padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            重新审核升级
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>{record.mrTitle}</strong>
        <a href={record.mrUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: '#3b82f6', fontSize: 12 }}>查看 MR ↗</a>
      </div>
      <DiffViewer
        diff={record.diff}
        issues={record.issues}
        currentIssueId={currentIssueId}
        onSelectIssue={setCurrentIssueId}
      />
    </div>
  )
}
```

- [ ] **Step 3: Modify `MRReviewTabs.tsx` to use `MRReviewResult`**

In `src/components/MRReviewTabs.tsx`:
- Add import: `import { MRReviewResult } from './MRReviewResult'`
- Find the section that renders each project's issue list (search for `record.issues` or `issues.map`). Replace that block with:

```tsx
<MRReviewResult record={record} onRerun={onRerun} />
```

If the existing code passes per-record props, adjust the signature; `MRReviewResult` accepts `record: MRReviewRecord` and optional `onRerun`.

If the existing code expected a callback like `onRerun(record.id)`, update the call:

```tsx
<MRReviewResult record={record} onRerun={() => onRerun?.(record.id)} />
```

- [ ] **Step 4: Run TypeScript compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run all unit tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/MRReviewResult.tsx src/components/MRReviewTabs.tsx
git commit -m "feat(MRReviewResult): integrate DiffViewer, add degraded view for old records"
```

---

## Task 14: E2E test (Python + Playwright)

**Files:**
- Create: `tests/test_code_review_diff_display.py`

- [ ] **Step 1: Create the E2E test**

Create file `tests/test_code_review_diff_display.py`:

```python
"""
E2E tests for Code Review Diff Display.
Usage:
  python3 /Users/fxy/.claude/skills/webapp-testing/scripts/with_server.py \
    --server "npm run dev" --port 5173 \
    -- python3 tests/test_code_review_diff_display.py
"""
import re
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
RESULTS = []


def log(msg):
    print(f"  [LOG] {msg}")


def pass_test(name):
    RESULTS.append(("PASS", name))
    print(f"  PASS: {name}")


def fail_test(name, reason=""):
    RESULTS.append(("FAIL", name, reason))
    print(f"  FAIL: {name}" + (f" - {reason}" if reason else ""))


def test_layout_switcher_visible(page):
    log("Test: layout switcher is visible on CodeReview page")
    page.goto(f"{BASE_URL}/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    if page.locator('[data-testid="layout-inline"]').count() > 0:
        pass_test("layout switcher present")
    else:
        fail_test("layout switcher present", "no [data-testid=layout-inline] found")


def test_layout_switch_changes_view(page):
    log("Test: clicking 分栏 switches to side-by-side layout")
    page.goto(f"{BASE_URL}/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    side_btn = page.locator('[data-testid="layout-side-by-side"]')
    if side_btn.count() == 0:
        fail_test("layout switch to side-by-side", "switcher not found")
        return
    side_btn.first.click()
    page.wait_for_timeout(300)
    if page.locator('[data-testid="diff-layout-side-by-side"]').count() > 0:
        pass_test("layout switch to side-by-side")
    else:
        fail_test("layout switch to side-by-side", "diff-layout-side-by-side not rendered")


def test_layout_persists_in_local_storage(page):
    log("Test: selected layout persists across reloads")
    page.goto(f"{BASE_URL}/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    page.locator('[data-testid="layout-file-explorer"]').first.click()
    page.wait_for_timeout(300)
    value = page.evaluate("() => localStorage.getItem('diffViewer.layout')")
    if value == "file-explorer":
        pass_test("layout persists in localStorage")
    else:
        fail_test("layout persists in localStorage", f"got {value!r}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        page = ctx.new_page()

        test_layout_switcher_visible(page)
        test_layout_switch_changes_view(page)
        test_layout_persists_in_local_storage(page)

        browser.close()

    passed = sum(1 for r in RESULTS if r[0] == "PASS")
    failed = len(RESULTS) - passed
    print(f"\n=== {passed} passed, {failed} failed ===")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    import sys
    main()
```

- [ ] **Step 2: Start dev server and run the test**

In one terminal: `npm run dev`. In another:

```bash
python3 /Users/fxy/.claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm run dev" --port 5173 \
  -- python3 tests/test_code_review_diff_display.py
```

Expected: `=== 3 passed, 0 failed ===`.

(If the dev server is already running on 5173, run the script directly: `python3 tests/test_code_review_diff_display.py`.)

- [ ] **Step 3: Commit**

```bash
git add tests/test_code_review_diff_display.py
git commit -m "test(e2e): CodeReview diff display layout switcher"
```

---

## Task 15: Full regression check + cleanup

- [ ] **Step 1: Run full unit test suite**

Run: `npm test`
Expected: all component + util tests pass.

- [ ] **Step 2: Run TypeScript compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run full E2E suite (existing 23 cases + new diff display tests)**

```bash
python3 /Users/fxy/.claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm run dev" --port 5173 \
  -- python3 tests/e2e_dashboard.py
```

Expected: all existing E2E tests still pass (no regression from `MRReviewTabs` refactor).

- [ ] **Step 4: Manual smoke test**

Run: `npm run electron:dev` (or `npm run dev`). Navigate to `/code-review`, trigger a review on a sample MR (requires configured MCP + LLM), verify:
- 3 layouts can be switched
- Clicking an issue scrolls to the line and highlights it
- Re-review button replaces issues
- Severity filter works
- Old records (if any) show degraded view with "重新审核" CTA

- [ ] **Step 5: Update CLAUDE.md with the new architecture note (if relevant)**

If you want to record the new pattern in `CLAUDE.md`, add a section:

```markdown
## Code Review Diff Display

The AI code review result view uses a client-side diff parser (`src/utils/diffParser.ts`) and issue resolver (`src/utils/issueResolver.ts`) to map AI-returned `codeSnippet` to exact line numbers. Three switchable layouts (`src/components/DiffViewer/`) render the diff alongside issues: side-by-side, GitHub-style inline, and files explorer. Layout preference persists in `localStorage` under `diffViewer.layout`.
```

(Only add this if you decide the project-level doc should track it.)

- [ ] **Step 6: Final commit**

```bash
git add CLAUDE.md  # if updated
git commit -m "docs: code review diff display architecture note"
```

---

## Self-Review

**Spec coverage:**
- D1 (3 switchable layouts) → Task 10/11/12
- D2 (auto-scroll + 1.5s highlight) → Task 7 (CSS keyframes) + Task 12 (`scrollIntoView`)
- D3 (100% accurate line numbers via client-side parsing) → Task 2 (parser) + Task 3 (resolver) + Task 6 (post-process)
- D4 (collapsible per file with issue count badges) → Task 8 (`FileSection`)
- D5 (code-snippet locating) → Task 3 (`resolveIssues`) + Task 6 (prompt update)
- Data model changes → Task 4 (types) + Task 5 (DAO + migration)
- 3 layouts (A/B/C) → Task 10/11/12
- Backward-compat degraded view → Task 13 (`MRReviewResult`)
- Re-review replaces issues → Task 6 (post-process)
- Empty states (no diff / no issues) → Task 12
- Large diff handling → Task 8 (defaultOpen based on issues)
- AI prompt update → Task 6
- localStorage persistence → Task 12
- Unit tests (diffParser/issueResolver ≥ 90%) → Task 2/3 (TDD)
- Component tests → Task 7/8/9/12
- Integration via E2E → Task 14
- E2E regression → Task 15

**Placeholder scan:** No TBD/TODO. All steps show concrete code and exact commands.

**Type consistency:** `ReviewIssue` defined Task 4, used Task 6/7/8/9/13. `LayoutMode` defined Task 7, used Task 10/11/12. `ParsedDiff`/`ParsedFile` defined Task 2, used Task 3/8/10/11/12. `AIResponseIssue`/`ResolvedIssue` defined Task 3, used Task 6. Consistent across all tasks.