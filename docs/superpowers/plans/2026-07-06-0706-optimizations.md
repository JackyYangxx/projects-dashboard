# 0706 Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 optimization areas from PRD: dashboard defaults/status/roles, project detail sidebar/repo/tags, code review table, global styles.

**Architecture:** Incremental changes to existing React + Zustand + sql.js codebase. Data model changes (tag→tags[], Repository.projectId) with backward-compatible migration. UI changes follow existing inline-edit and Tailwind patterns.

**Tech Stack:** React 18, TypeScript, Zustand, sql.js (SQLite WASM), Tailwind CSS, Vite

---

### Task 1: Data Model — Repository.projectId + tag→tags[]

**Files:**
- Modify: `src/types/index.ts:36-42,71`
- Modify: `src/db/projectDao.ts:21-68,114-168,170-272,282-423`
- Modify: `src/data/seedData.ts:11`

- [ ] **Step 1: Add projectId to Repository interface**

In `src/types/index.ts`, change the Repository interface:
```typescript
export interface Repository {
  id: string
  code?: string
  projectId?: string
  url: string
  branch: string
  note?: string
}
```

- [ ] **Step 2: Change tag to tags in Project interface**

In `src/types/index.ts`, change line 71:
```typescript
tags: string[]
```

- [ ] **Step 3: Add migration logic in findAll()**

In `src/db/projectDao.ts`, in the `findAll()` function, after mapping row fields, add tag migration:
```typescript
// In the map callback, after reading rowObj.tag:
let tags: string[] = parseJsonField<string[]>(rowObj.tags, [])
const rawTag = rowObj.tag as string
if (tags.length === 0 && rawTag && typeof rawTag === 'string' && rawTag.trim()) {
  tags = [rawTag.trim()]
}
```

Then in the returned object, replace `tag: rowObj.tag as string` with `tags`.

- [ ] **Step 4: Update findById() similarly**

Same migration logic in `findById()` for tag→tags conversion.

- [ ] **Step 5: Update create() for tags**

In `create()`, change `tag` column to `tags`, store as `JSON.stringify(project.tags || [])`.

- [ ] **Step 6: Update update() for tags**

In `update()`, change `updates.tag` handling to `updates.tags`:
```typescript
if (updates.tags !== undefined) {
  setClauses.push('tags = ?')
  values.push(JSON.stringify(updates.tags))
}
```

- [ ] **Step 7: Update upsert() for tags**

In `upsert()`, update all `tag` references to `tags`, store as JSON array.

- [ ] **Step 8: Update seed data**

In `src/data/seedData.ts`:
- Change `tag: '项目 A - 三月'` to `tags: ['项目 A', '三月']`
- Change `totalAmount: 2240000` to `0`
- Change `usedAmount: 1680000` to `0`
- Change `status: 'ongoing'` to `status: 'paused'`
- Add `projectId: undefined` to the repository object

- [ ] **Step 9: Run type check**

```bash
npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/db/projectDao.ts src/data/seedData.ts
git commit -m "feat: add Repository.projectId, change tag to tags[], update seed defaults

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Dashboard — Form defaults + seed data defaults

**Files:**
- Modify: `src/pages/ProjectForm.tsx:12-24`

- [ ] **Step 1: Update ProjectForm defaults**

In `src/pages/ProjectForm.tsx`, change the initial `formData` state:
```typescript
const [formData, setFormData] = useState({
  projectId: '',
  name: '',
  productLine: '',
  status: 'paused' as Project['status'],
  leader: '',
  totalAmount: 0,
  usedAmount: 0,
  repositoryUrl: '',
  repositoryCode: '',
  branch: 'main',
})
```

And in `handleSubmit`, change `tag: ''` to `tags: []`:
```typescript
tags: [],
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProjectForm.tsx
git commit -m "feat: default new projects to paused status and zero budget

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Dashboard — Status column in ProjectTable

**Files:**
- Modify: `src/components/ProjectTable.tsx:1-247`
- Modify: `src/components/ProjectTable.tsx` — add `onStatusChange` prop

- [ ] **Step 1: Add onStatusChange prop to interface**

In `src/components/ProjectTable.tsx`, update the interface:
```typescript
interface ProjectTableProps {
  projects: Project[]
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onView?: (project: Project) => void
  onStatusChange?: (project: Project, status: Project['status']) => void
}
```

- [ ] **Step 2: Import constants**

Add import at top:
```typescript
import { VALID_STATUSES, STATUS_LABELS } from '../constants/project'
```

- [ ] **Step 3: Update colgroup for 7 columns**

Change colgroup widths to accommodate the new status column:
```tsx
<colgroup>
  <col style={{ width: '16%' }} />
  <col style={{ width: '14%' }} />
  <col style={{ width: '10%' }} />
  <col style={{ width: '18%' }} />
  <col style={{ width: '8%' }} />
  <col style={{ width: '16%' }} />
  <col style={{ width: '14%' }} />
</colgroup>
```

- [ ] **Step 4: Add status column header**

Add between "负责人" and "进展" th elements:
```tsx
<th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
  状态
</th>
```

- [ ] **Step 5: Change "负责人" to "开发责任人"**

Change the th text from "负责人" to "开发责任人".

- [ ] **Step 6: Add status select in table rows**

After the "负责人" td, add the status column td:
```tsx
<td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none" onClick={(e) => e.stopPropagation()}>
  <select
    value={project.status}
    onChange={(e) => {
      e.stopPropagation()
      onStatusChange?.(project, e.target.value as Project['status'])
    }}
    className="w-full h-7 px-2 bg-white border border-outline rounded text-xs font-body text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_4px_center] bg-no-repeat pr-6"
  >
    {VALID_STATUSES.map(s => (
      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
    ))}
  </select>
</td>
```

- [ ] **Step 7: Update empty state colSpan**

Change `colSpan={6}` to `colSpan={7}`.

- [ ] **Step 8: Wire onStatusChange in Dashboard**

In `src/pages/Dashboard.tsx`, add handler and pass to ProjectTable:
```typescript
const handleStatusChange = (project: Project, status: Project['status']) => {
  useProjectStore.getState().updateProject(project.id, { status })
}
```

And in the ProjectTable JSX:
```tsx
<ProjectTable
  projects={filteredProjects}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
/>
```

- [ ] **Step 9: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add src/components/ProjectTable.tsx src/pages/Dashboard.tsx
git commit -m "feat: add status column with dropdown to project table, rename to dev lead

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard — Import/Export header labels update

**Files:**
- Modify: `src/pages/Dashboard.tsx:165-168,176,178,241-266,262-293`
- Modify: `src/constants/project.ts:30-31`

- [ ] **Step 1: Update IMPORT_REQUIRED_HEADERS**

In `src/constants/project.ts`, change `'负责人'` to `'开发责任人'`:
```typescript
export const IMPORT_REQUIRED_HEADERS = ['项目名称', '产品线', '开发责任人', '总预算', '已用预算']
```

- [ ] **Step 2: Update import parsing for new header**

In Dashboard's `handleImport`, change row 178 from `const leader = String(row['负责人'] || '').trim()` to:
```typescript
const leader = String(row['开发责任人'] || row['负责人'] || '').trim()
```

- [ ] **Step 3: Update import tag parsing for multi-tag**

In the import handler, change tag line from `tag: String(row['标签'] || '')` to:
```typescript
tags: String(row['标签'] || '').split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
```

- [ ] **Step 4: Update export headers**

In `handleExport`, change `'负责人': p.leader` to `'开发责任人': p.leader`, and `'标签': p.tag` to:
```typescript
'标签': p.tags.join(', '),
```

- [ ] **Step 5: Update template download headers**

Change `'负责人'` to `'开发责任人'` in template header row.

- [ ] **Step 6: Update search placeholder**

Change search placeholder from "搜索项目名称、责任人..." to "搜索项目名称、开发责任人...".

- [ ] **Step 7: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/Dashboard.tsx src/constants/project.ts
git commit -m "feat: update import/export for dev lead label, multi-tag parsing

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Sidebar — Project detail route highlight

**Files:**
- Modify: `src/components/Sidebar.tsx:13-16,60-65`

- [ ] **Step 1: Add project detail nav item**

In `src/components/Sidebar.tsx`, add to navItems array:
```typescript
const navItems: NavItem[] = [
  { label: '项目看板', icon: 'dashboard', path: '/' },
  { label: '项目详情', icon: 'description', path: '/project' },
  { label: '代码评审', icon: 'code', path: '/code-review' },
]
```

- [ ] **Step 2: Update isActive logic**

Change the isActive check to support prefix matching:
```typescript
const isActive = item.path === '/project'
  ? location.pathname.startsWith('/project')
  : location.pathname === item.path
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add project detail sidebar nav item with prefix matching

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Project Detail — Repository ProjectId UI

**Files:**
- Modify: `src/pages/ProjectDetail.tsx:326-416,418-441`

- [ ] **Step 1: Add ProjectId input in edit mode**

In the repo edit grid, add a ProjectId input after the code input. Change the grid from `grid-cols-12` to keep 12 cols but adjust:
- code: col-span-2 → stays
- url: col-span-4 → col-span-3
- Add projectId: col-span-2
- branch: col-span-2 → stays  
- note: col-span-3 → col-span-2
- delete: col-span-1 → stays

Before the URL input, add:
```tsx
<div className="col-span-2">
  <input
    type="text"
    value={repo.projectId || ''}
    onChange={e => {
      const next = [...editRepos]
      next[idx] = { ...next[idx], projectId: e.target.value }
      setEditRepos(next)
      updateProject(project.id, { repositories: next.filter(r => r.url.trim()), updatedAt: new Date().toISOString() })
    }}
    className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-mono text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
    placeholder="ProjectId"
  />
</div>
```

- [ ] **Step 2: Add ProjectId display in view mode**

In the repo view row, after the code badge and before the URL, add:
```tsx
{repo.projectId && (
  <span className="text-xs font-mono text-on-surface-tertiary border border-outline px-1.5 py-0.5 rounded flex-shrink-0">
    {repo.projectId}
  </span>
)}
```

- [ ] **Step 3: Update import to include repo projectId**

In Dashboard's import handler, add projectId parsing for repos:
```typescript
repositories: (() => {
  const repos: import('@/types').Repository[] = []
  for (let i = 1; i <= 3; i++) {
    const url = String(row[`代码仓${i}`] || '').trim()
    if (url) {
      repos.push({
        id: crypto.randomUUID(),
        code: String(row[`代码仓编码${i}`] || '').trim() || undefined,
        projectId: String(row[`代码仓ProjectId${i}`] || '').trim() || undefined,
        url,
        branch: String(row[`分支${i}`] || 'main').trim(),
        note: String(row[`备注${i}`] || '').trim() || undefined,
      })
    }
  }
  return repos
})(),
```

- [ ] **Step 4: Update export to include repo projectId**

In Dashboard's export handler, add ProjectId columns:
```typescript
cols[`代码仓ProjectId${n}`] = r.projectId || ''
```

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectDetail.tsx src/pages/Dashboard.tsx
git commit -m "feat: add Repository.projectId field to detail page and import/export

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Multi-Tag UI — Dashboard filter + table display

**Files:**
- Modify: `src/pages/Dashboard.tsx:16-22,30-31,70-85,397-431`
- Modify: `src/components/ProjectTable.tsx:146-150`

- [ ] **Step 1: Replace month filter with tag filter in Dashboard**

Remove `MONTHS` constant and `monthFilter`/`showMonthMenu` state. Add tag filter state:
```typescript
const [tagFilter, setTagFilter] = useState<string[]>([])
const [showTagMenu, setShowTagMenu] = useState(false)
```

- [ ] **Step 2: Collect unique tags from projects**

Add useMemo to collect all unique tags:
```typescript
const allTags = useMemo(() => {
  const tagSet = new Set<string>()
  projects.forEach(p => p.tags?.forEach(t => { if (t) tagSet.add(t) }))
  return Array.from(tagSet).sort()
}, [projects])
```

- [ ] **Step 3: Update filter logic**

Replace month filter with tag filter:
```typescript
if (tagFilter.length > 0) {
  result = result.filter((p) => tagFilter.some(t => p.tags?.includes(t)))
}
```

- [ ] **Step 4: Update filter UI**

Replace month filter dropdown with tag filter dropdown. Show "标签：全部" when no tags selected, or show selected tag names. Dropdown shows all unique tags as multi-select checkboxes.

- [ ] **Step 5: Update clear filter button**

Change to clear tag filter: `setTagFilter([])`.

- [ ] **Step 6: Update ProjectTable tag display**

In `src/components/ProjectTable.tsx`, change single tag display to multi-tag:
```tsx
{project.tags && project.tags.length > 0 && (
  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
    {project.tags.slice(0, 2).map((t, i) => (
      <span key={i} className="text-[10px] font-body text-on-surface-tertiary bg-surface-hover px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
        {t}
      </span>
    ))}
    {project.tags.length > 2 && (
      <span className="text-[10px] font-body text-on-surface-tertiary">+{project.tags.length - 2}</span>
    )}
  </div>
)}
```

- [ ] **Step 7: Update search to also search tags**

In the search filter:
```typescript
result = result.filter((p) =>
  p.name.toLowerCase().includes(q) ||
  p.leader.toLowerCase().includes(q) ||
  p.tags?.some(t => t.toLowerCase().includes(q))
)
```

- [ ] **Step 8: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/ProjectTable.tsx
git commit -m "feat: multi-tag support with tag filter on dashboard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Project Detail — Multi-tag editor

**Files:**
- Modify: `src/pages/ProjectDetail.tsx:56-57,232-263`

- [ ] **Step 1: Replace single tag state with multi-tag state**

Replace `isEditingTag`/`tagInput` state with multi-tag editing state:
```typescript
const [isEditingTags, setIsEditingTags] = useState(false)
const [tagsInput, setTagsInput] = useState('')
```

- [ ] **Step 2: Replace tag display with multi-tag pills**

In the nav bar, replace the single tag display/edit section with multi-tag display:
```tsx
{isEditingTags ? (
  <div className="flex items-center gap-1">
    {tagsInput.split(/[,，]/).map((t, i) => t.trim()).filter(Boolean).map((tag, i) => (
      <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-body font-medium bg-primary-50 text-primary-700 border border-primary-200">
        {tag}
        <button onClick={() => {
          const next = tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean).filter((_, j) => j !== i).join(', ')
          setTagsInput(next)
        }} className="w-4 h-4 flex items-center justify-center hover:bg-primary-100 rounded-full">
          <Icon name="close" size={10} />
        </button>
      </span>
    ))}
    <input
      type="text"
      autoFocus
      placeholder="输入标签，回车添加"
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const val = (e.target as HTMLInputElement).value.trim()
          if (val) {
            setTagsInput(prev => prev ? `${prev}, ${val}` : val)
            ;(e.target as HTMLInputElement).value = ''
          }
        }
        if (e.key === 'Escape') {
          setIsEditingTags(false)
        }
      }}
      onBlur={() => {
        const tags = tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean)
        updateProject(project.id, { tags, updatedAt: new Date().toISOString() })
        setIsEditingTags(false)
      }}
      className="w-28 h-7 px-2 bg-white border border-primary-400 rounded text-xs font-body text-on-surface-primary focus:outline-none focus:ring-2 focus:ring-primary-500/15"
    />
  </div>
) : (
  <div className="flex items-center gap-1">
    {project.tags && project.tags.length > 0 ? (
      project.tags.map((t, i) => (
        <span key={i} className="px-2 py-0.5 rounded text-xs font-body font-medium bg-primary-50 text-primary-700 border border-primary-200">
          {t}
        </span>
      ))
    ) : (
      <span
        onClick={() => {
          if (isReadOnly) return
          setTagsInput(project.tags?.join(', ') || '')
          setIsEditingTags(true)
        }}
        className={`px-2 py-0.5 rounded text-xs font-body font-medium text-on-surface-tertiary border border-dashed border-outline ${!isReadOnly ? 'cursor-pointer hover:bg-primary-100 hover:border-primary-300' : ''}`}
      >
        添加标签
      </span>
    )}
    {!isReadOnly && project.tags && project.tags.length > 0 && (
      <button
        onClick={() => {
          setTagsInput(project.tags?.join(', ') || '')
          setIsEditingTags(true)
        }}
        className="w-5 h-5 flex items-center justify-center text-on-surface-tertiary hover:text-primary-600 rounded"
      >
        <Icon name="edit" size={12} />
      </button>
    )}
  </div>
)}
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat: multi-tag editor in project detail page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Code Review — ProjectSelector expanded columns

**Files:**
- Modify: `src/components/ProjectSelector.tsx:31-92`

- [ ] **Step 1: Add new column headers**

Add "分支", "ProjectId", "备注" columns to the thead:
```tsx
<th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">仓库地址</th>
<th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">分支</th>
<th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">ProjectId</th>
<th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">备注</th>
```

- [ ] **Step 2: Expand row cells**

In each project row, split repo info into separate cells. For projects with multiple repos, show each repo as a sub-row:
```tsx
<td className="px-4 py-3 text-sm text-on-surface-tertiary">
  {project.repositories.length > 0
    ? project.repositories.map((repo, i) => (
        <div key={repo.id} className={i > 0 ? 'mt-1' : ''}>
          {repo.code && (
            <span className="text-xs font-mono text-on-surface-tertiary border border-outline px-1 py-0.5 rounded mr-1">
              {repo.code}
            </span>
          )}
          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline text-xs">
            {repo.url}
          </a>
        </div>
      ))
    : <span className="text-on-surface-tertiary">—</span>}
</td>
<td className="px-4 py-3 text-sm font-mono text-on-surface-secondary">
  {project.repositories.length > 0
    ? project.repositories.map((repo, i) => (
        <div key={repo.id} className={i > 0 ? 'mt-1' : ''}>{repo.branch || '—'}</div>
      ))
    : '—'}
</td>
<td className="px-4 py-3 text-sm font-mono text-on-surface-secondary">
  {project.repositories.length > 0
    ? project.repositories.map((repo, i) => (
        <div key={repo.id} className={i > 0 ? 'mt-1' : ''}>{repo.projectId || '—'}</div>
      ))
    : '—'}
</td>
<td className="px-4 py-3 text-sm text-on-surface-secondary">
  {project.repositories.length > 0
    ? project.repositories.map((repo, i) => (
        <div key={repo.id} className={i > 0 ? 'mt-1' : ''}>{repo.note || '—'}</div>
      ))
    : '—'}
</td>
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectSelector.tsx
git commit -m "feat: expand code review project selector with repo info columns

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Global Styles — Title bar color distinction

**Files:**
- Modify: `src/components/Header.tsx:14`
- Modify: `src/pages/ProjectDetail.tsx:219`
- Modify: `src/pages/CodeReview.tsx:48`
- Modify: `src/pages/ProjectForm.tsx` — top nav (if exists)

- [ ] **Step 1: Change Header background**

In `src/components/Header.tsx`, change line 14 from `bg-white` to:
```tsx
<header className="h-14 bg-surface-subtle border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
```

- [ ] **Step 2: Change ProjectDetail top nav background**

In `src/pages/ProjectDetail.tsx`, line 219, change `bg-white` to `bg-surface-subtle`:
```tsx
<nav className="h-14 bg-surface-subtle border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
```

- [ ] **Step 3: Change CodeReview top nav background**

In `src/pages/CodeReview.tsx`, line 48, change `bg-surface-elevated` to `bg-surface-subtle`:
```tsx
<nav className="h-14 bg-surface-subtle border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
```

- [ ] **Step 4: Check ProjectForm for nav**

Check if `src/pages/ProjectForm.tsx` has a top nav bar. If so, change its background to `bg-surface-subtle`.

- [ ] **Step 5: Check Settings page**

Check `src/pages/Settings.tsx` for nav bar and update.

- [ ] **Step 6: Run type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Header.tsx src/pages/ProjectDetail.tsx src/pages/CodeReview.tsx
git commit -m "feat: distinguish title bar from content with surface-subtle background

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 11: E2E Testing & Verification

**Files:**
- Create: `docs/superpowers/tests/2026-07-06-0706-optimizations-test-cases.md`
- Create: `docs/superpowers/tests/2026-07-06-0706-optimizations-test-report.md`

- [ ] **Step 1: Write E2E test cases document**

Write test cases covering all 7 requirement areas. See test cases document for details.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```
Wait for server to be ready on localhost:5173.

- [ ] **Step 3: Run E2E tests via Chrome DevTools MCP**

Execute each test case:
1. Navigate to app
2. Take snapshot
3. Perform actions
4. Verify results with screenshots
5. Check console for errors

- [ ] **Step 4: Verify existing E2E tests still pass**

Run all existing unit tests:
```bash
npx vitest run
```

- [ ] **Step 5: Write test report**

Document pass/fail for each test case, include screenshots.

- [ ] **Step 6: Commit test artifacts**

```bash
git add docs/superpowers/tests/
git commit -m "test: add E2E test cases and report for 0706 optimizations

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
