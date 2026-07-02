# Multi-Repository Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend project from single `repository`/`branch` to `repositories: Repository[]` array (url, branch, note per repo).

**Architecture:** Replace two TEXT columns with one JSON column (`repositories TEXT DEFAULT '[]'`). Follow existing patterns: `parseJsonField<T>()` for reads, `JSON.stringify()` for writes, migration via `PRAGMA table_info` column detection. Edit only in ProjectDetail page. Dashboard import/export uses multi-column flattening (代码仓1/分支1/备注1...).

**Tech Stack:** React 18 + TypeScript + sql.js (SQLite WASM) + Zustand + Playwright (E2E)

---

### Task 1: Add Repository Type and Update Project

**Files:**
- Modify: `src/types/index.ts:57-78`

- [ ] **Step 1: Add Repository interface and update Project type**

In `src/types/index.ts`, add after line 34 (after Milestone interface):

```typescript
export interface Repository {
  id: string
  url: string
  branch: string
  note?: string
}
```

Replace lines 74-75:
```typescript
// Remove:
  repository: string
  branch: string
// Add:
  repositories: Repository[]
```

- [ ] **Step 2: Verify type compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: errors only in files that still reference `project.repository`/`project.branch` (projectDao, seedData, ProjectDetail, Dashboard, ProjectSelector, codeReviewStore). These will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Repository type, update Project to use repositories array"
```

---

### Task 2: Database Schema Migration

**Files:**
- Modify: `src/db/index.ts:47-71,188-233`

- [ ] **Step 1: Replace repository/branch columns with repositories**

In `src/db/index.ts`, replace lines 66-67 in the CREATE TABLE statement:
```sql
-- Remove:
      repository TEXT DEFAULT '',
      branch TEXT DEFAULT '',
-- Add:
      repositories TEXT DEFAULT '[]',
```

- [ ] **Step 2: Add migration logic**

Insert after line 71 (after `console.log('[DB] Table created')`) and before the `// Create mcp_services table` comment:

```typescript
  // Migration: convert old repository/branch columns to repositories JSON array
  try {
    const colCheck = db.exec("PRAGMA table_info(projects)")
    const columnNames = colCheck[0]?.values.map((row) => row[1] as string) || []
    if (columnNames.includes('repository') && !columnNames.includes('repositories')) {
      console.log('[DB] Migrating repository/branch to repositories JSON array...')
      db.run("ALTER TABLE projects ADD COLUMN repositories TEXT DEFAULT '[]'")
      const oldRows = db.exec("SELECT id, repository, branch FROM projects")
      for (const row of oldRows[0]?.values || []) {
        const [rid, oldRepo, oldBranch] = row as [string, string, string]
        const repos = oldRepo
          ? JSON.stringify([{ id: crypto.randomUUID(), url: oldRepo, branch: oldBranch || 'main' }])
          : '[]'
        db.run("UPDATE projects SET repositories = ? WHERE id = ?", [repos, rid])
      }
      console.log('[DB] Migration complete')
    }
  } catch (err) {
    console.error('[DB] Migration failed:', err)
  }
```

- [ ] **Step 3: Update seed INSERT to use repositories column**

Replace line 200 (INSERT column list):
```sql
-- Remove:
...milestones, timeline, leader, repository, branch, created_at, updated_at
-- Add:
...milestones, timeline, leader, repositories, created_at, updated_at
```

Replace lines 220-221 (INSERT values):
```typescript
// Remove:
            project.repository || '',
            project.branch || '',
// Add:
            JSON.stringify(project.repositories || []),
```

- [ ] **Step 4: Verify database init compiles**

Run: `npx tsc --noEmit src/db/index.ts 2>&1`

Expected: no errors from db/index.ts.

- [ ] **Step 5: Commit**

```bash
git add src/db/index.ts
git commit -m "feat: migrate database schema to repositories JSON array"
```

---

### Task 3: Update CRUD in projectDao.ts

**Files:**
- Modify: `src/db/projectDao.ts`

- [ ] **Step 1: Import Repository type**

In `src/db/projectDao.ts` line 2, add `Repository` to the type import:
```typescript
import type { Project, Repository, SubProgress, TeamMember, ScopeItem, TimelineEvent, NoteHistory, Milestone } from '../types'
```

- [ ] **Step 2: Update findAll to parse repositories**

Replace lines 59-60:
```typescript
// Remove:
      repository: rowObj.repository as string,
      branch: rowObj.branch as string,
// Add:
      repositories: parseJsonField<Repository[]>(rowObj.repositories, []),
```

- [ ] **Step 3: Update findById to parse repositories**

Replace lines 99-100:
```typescript
// Remove:
      repository: row.repository as string,
      branch: row.branch as string,
// Add:
      repositories: parseJsonField<Repository[]>(row.repositories, []),
```

- [ ] **Step 4: Update create to serialize repositories**

In the INSERT column list (line 124), replace `repository, branch` with `repositories`.

Replace lines 144-145:
```typescript
// Remove:
      project.repository || '',
      project.branch || '',
// Add:
      JSON.stringify(project.repositories || []),
```

- [ ] **Step 5: Update update() to handle repositories field**

Replace lines 221-228:
```typescript
// Remove:
  if (updates.repository !== undefined) {
    setClauses.push('repository = ?')
    values.push(updates.repository)
  }
  if (updates.branch !== undefined) {
    setClauses.push('branch = ?')
    values.push(updates.branch)
  }
// Add:
  if (updates.repositories !== undefined) {
    setClauses.push('repositories = ?')
    values.push(JSON.stringify(updates.repositories))
  }
```

- [ ] **Step 6: Update upsert signature and logic**

Replace lines 252-253 (signature):
```typescript
// Remove:
  repository?: string
  branch?: string
// Add:
  repositories?: Repository[]
```

Replace lines 292-298:
```typescript
// Remove:
    if (projectData.repository !== undefined) {
      updates.push('repository = ?')
      values.push(projectData.repository)
    }
    if (projectData.branch !== undefined) {
      updates.push('branch = ?')
      values.push(projectData.branch)
    }
// Add:
    if (projectData.repositories !== undefined) {
      updates.push('repositories = ?')
      values.push(JSON.stringify(projectData.repositories))
    }
```

Replace lines 311-312 (return object):
```typescript
// Remove:
      repository: projectData.repository || '',
      branch: projectData.branch || '',
// Add:
      repositories: projectData.repositories || [],
```

Replace lines 344-345 (create fallback):
```typescript
// Remove:
      repository: projectData.repository || '',
      branch: projectData.branch || '',
// Add:
      repositories: projectData.repositories || [],
```

- [ ] **Step 7: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | grep -c error`

Expected: remaining errors in ProjectDetail.tsx, Dashboard.tsx, ProjectSelector.tsx, codeReviewStore.ts, seedData.ts only.

- [ ] **Step 8: Commit**

```bash
git add src/db/projectDao.ts
git commit -m "feat: update CRUD to serialize/deserialize repositories JSON"
```

---

### Task 4: Update Seed Data

**Files:**
- Modify: `src/data/seedData.ts`

- [ ] **Step 1: Convert each seed project to repositories array**

Replace each project's `repository` + `branch` with `repositories` array.

For "战略品牌重塑" (lines 13-14):
```typescript
// Remove:
    repository: 'https://github.com/example/brand-refresh',
    branch: 'main',
// Add:
    repositories: [
      { id: 'r1', url: 'https://github.com/example/brand-refresh', branch: 'main', note: '主仓库' },
    ],
```

For "次世代界面设计" (lines 80-81):
```typescript
// Remove:
    repository: 'https://github.com/example/ui-design',
    branch: 'develop',
// Add:
    repositories: [
      { id: 'r1', url: 'https://github.com/example/ui-design', branch: 'develop', note: '主仓库' },
    ],
```

For "全球扩张路线图" (lines 127-128):
```typescript
// Remove:
    repository: 'https://github.com/example/global-roadmap',
    branch: 'main',
// Add:
    repositories: [
      { id: 'r1', url: 'https://github.com/example/global-roadmap', branch: 'main', note: '主仓库' },
    ],
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -c error`

Expected: remaining errors only in ProjectDetail.tsx, Dashboard.tsx, ProjectSelector.tsx, codeReviewStore.ts.

- [ ] **Step 3: Commit**

```bash
git add src/data/seedData.ts
git commit -m "feat: convert seed data to multi-repo format"
```

---

### Task 5: ProjectDetail Multi-Repo UI

**Files:**
- Modify: `src/pages/ProjectDetail.tsx:53-55,60-66,78-84,196-204,286-376`

- [ ] **Step 1: Replace repo edit state**

Replace lines 53-55:
```typescript
// Remove:
  const [repoEditRepository, setRepoEditRepository] = useState('')
  const [repoEditBranch, setRepoEditBranch] = useState('')
  const [isRepoEditing, setIsRepoEditing] = useState(false)
// Add:
  const [editRepos, setEditRepos] = useState<Repository[]>([])
```

Add `Repository` to the type import on line 10:
```typescript
import type { BudgetSource, Repository } from '@/types'
```

- [ ] **Step 2: Remove auto-enter repo edit mode effect**

Remove lines 60-66 (the `prevIsReadOnlyRef` effect that auto-enters repo edit mode). This is no longer needed because repos are always editable when `!isReadOnly`.

- [ ] **Step 3: Update repo init useEffect**

Replace lines 78-84:
```typescript
  useEffect(() => {
    if (project) {
      setRepoEditRepository(project.repository || '')
      setRepoEditBranch(project.branch || '')
    }
  }, [project])
```
With:
```typescript
  useEffect(() => {
    if (project) {
      setEditRepos(
        project.repositories.length > 0
          ? project.repositories.map(r => ({ ...r }))
          : [{ id: crypto.randomUUID(), url: '', branch: 'main' }]
      )
    }
  }, [project])
```

- [ ] **Step 4: Replace handleRepoSave**

Replace lines 196-204:
```typescript
  const handleRepoSave = () => {
    if (!project) return
    updateProject(project.id, {
      repository: repoEditRepository,
      branch: repoEditBranch,
      updatedAt: new Date().toISOString(),
    })
    setIsRepoEditing(false)
  }
```
With:
```typescript
  const handleRepoSave = () => {
    if (!project) return
    updateProject(project.id, {
      repositories: editRepos.filter(r => r.url.trim()),
      updatedAt: new Date().toISOString(),
    })
  }
```

- [ ] **Step 5: Rewrite repo section JSX**

Replace the entire repo section (lines 286-376 — from `<div className="col-span-12">` containing "代码仓信息" through to the closing `</div>` before `{/* Row 1: Progress */}`):

```tsx
          {/* Row 0: Repository Info Card */}
          <div className="col-span-12">
            <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="folder_copy" size={16} />
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">代码仓信息</h3>
              </div>

              {!isReadOnly ? (
                <div className="space-y-3">
                  {editRepos.map((repo, idx) => (
                    <div key={repo.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={repo.url}
                          onChange={e => {
                            const next = [...editRepos]
                            next[idx] = { ...next[idx], url: e.target.value }
                            setEditRepos(next)
                          }}
                          className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-mono text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                          placeholder="https://github.com/org/repo"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={repo.branch}
                          onChange={e => {
                            const next = [...editRepos]
                            next[idx] = { ...next[idx], branch: e.target.value }
                            setEditRepos(next)
                          }}
                          className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-mono text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                          placeholder="main"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={repo.note || ''}
                          onChange={e => {
                            const next = [...editRepos]
                            next[idx] = { ...next[idx], note: e.target.value }
                            setEditRepos(next)
                          }}
                          className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                          placeholder="备注（可选）"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center pt-0.5">
                        {editRepos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditRepos(editRepos.filter((_, i) => i !== idx))}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-tertiary hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="删除此代码仓"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditRepos([...editRepos, { id: crypto.randomUUID(), url: '', branch: 'main' }])}
                    className="inline-flex items-center gap-1.5 h-8 px-3 border border-dashed border-outline rounded-md text-xs font-body text-on-surface-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    <Icon name="add" size={14} />
                    添加代码仓
                  </button>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRepoSave}
                      className="inline-flex items-center h-8 px-3 bg-primary-500 text-white rounded-md text-xs font-body font-medium hover:bg-primary-600 transition-colors"
                    >
                      保存代码仓
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-body text-on-surface-primary">
                  {project.repositories.length > 0 ? (
                    <div className="space-y-2">
                      {project.repositories.map(repo => (
                        <div key={repo.id} className="flex items-center gap-2 py-1.5 px-3 bg-surface-base rounded-md">
                          <Icon name="folder_copy" size={14} className="text-on-surface-tertiary flex-shrink-0" />
                          <span className="font-mono text-xs">{repo.url}</span>
                          <span className="text-on-surface-tertiary">@</span>
                          <span className="font-mono text-xs">{repo.branch || '—'}</span>
                          {repo.note && (
                            <span className="text-xs text-on-surface-tertiary ml-2">({repo.note})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-on-surface-tertiary">未设置代码仓</span>
                  )}
                </div>
              )}
            </div>
          </div>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -c error`

Expected: remaining errors in Dashboard.tsx, ProjectSelector.tsx, codeReviewStore.ts only.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat: add multi-repo editing UI in ProjectDetail"
```

---

### Task 6: Dashboard Import/Export Multi-Repo

**Files:**
- Modify: `src/pages/Dashboard.tsx:189-190,219-225,249-250`
- Modify: `src/constants/project.ts:26-29`

- [ ] **Step 1: Update IMPORT_OPTIONAL_HEADERS**

In `src/constants/project.ts`, replace lines 26-29:
```typescript
export const IMPORT_OPTIONAL_HEADERS = [
  '代码仓',
  '分支',
] as const
```
With:
```typescript
export const IMPORT_OPTIONAL_HEADERS = [
  '代码仓1', '分支1', '备注1',
  '代码仓2', '分支2', '备注2',
  '代码仓3', '分支3', '备注3',
] as const
```

- [ ] **Step 2: Update import parsing logic**

In `src/pages/Dashboard.tsx`, replace lines 189-190:
```typescript
              repository: String(row['代码仓'] || ''),
              branch: String(row['分支'] || ''),
```
With:
```typescript
              repositories: (() => {
                const repos: import('@/types').Repository[] = []
                for (let i = 1; i <= 3; i++) {
                  const url = String(row[`代码仓${i}`] || '').trim()
                  if (url) {
                    repos.push({
                      id: crypto.randomUUID(),
                      url,
                      branch: String(row[`分支${i}`] || 'main').trim(),
                      note: String(row[`备注${i}`] || '').trim() || undefined,
                    })
                  }
                }
                return repos
              })(),
```

- [ ] **Step 3: Update export logic**

Replace lines 249-250:
```typescript
      '代码仓': p.repository || '',
      '分支': p.branch || '',
```
With:
```typescript
      ...((): Record<string, string> => {
        const cols: Record<string, string> = {}
        p.repositories.forEach((r, i) => {
          const n = i + 1
          cols[`代码仓${n}`] = r.url
          cols[`分支${n}`] = r.branch || ''
          cols[`备注${n}`] = r.note || ''
        })
        return cols
      })(),
```

- [ ] **Step 4: Update template download headers**

Replace line 221:
```typescript
    const optionalHeaders = ['代码仓', '分支']
```
With:
```typescript
    const optionalHeaders = ['代码仓1', '分支1', '备注1', '代码仓2', '分支2', '备注2', '代码仓3', '分支3', '备注3']
```

Also update the sample row on line 226 to match:
```typescript
    const sampleRow = ['示例项目', '示例产品线', '张三', 100000, 50000, '', '', '', '', '', '', '', '', '']
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -c error`

Expected: remaining errors only in ProjectSelector.tsx, codeReviewStore.ts.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx src/constants/project.ts
git commit -m "feat: update import/export for multi-repo columns"
```

---

### Task 7: Update ProjectSelector for Code Review

**Files:**
- Modify: `src/components/ProjectSelector.tsx:61-63`

- [ ] **Step 1: Display repo count badge instead of single URL**

Replace lines 61-63:
```tsx
              <td className="px-4 py-3 text-sm text-on-surface-tertiary font-mono truncate max-w-[300px]">
                {project.repository || '-'}
              </td>
```
With:
```tsx
              <td className="px-4 py-3 text-sm text-on-surface-tertiary truncate max-w-[300px]">
                {project.repositories.length > 0
                  ? `${project.repositories.length}个代码仓`
                  : '-'}
              </td>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -c error`

Expected: remaining errors only in codeReviewStore.ts.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectSelector.tsx
git commit -m "feat: show repo count badge in ProjectSelector"
```

---

### Task 8: Update Code Review Store to Iterate Repos

**Files:**
- Modify: `src/store/codeReviewStore.ts:264-291`

- [ ] **Step 1: Replace single-repo check with repo iteration**

Replace lines 264-291:
```typescript
    for (const projectId of projectIds) {
      const project = projects.find(p => p.id === projectId)
      if (!project || !project.repository) continue

      // 1. Get MR list via MCP
      set({
        reviewProgress: {
          projectId,
          projectName: project.name,
          mrTitle: '获取 MR 列表...',
          progress: 0,
          completed: 0,
          total: 0
        }
      })

      let mrs: Array<{ id: string; title: string; url: string; state: string }> = []
      try {
        const mrListResult = await window.mcpAPI?.invokeTool({
          url: mcpConfig.url,
          authHeader: mcpConfig.authHeader,
          toolName: 'listMRs',
          toolArgs: { repository: project.repository, branch: project.branch }
        })
        mrs = (mrListResult as { mrs?: Array<{ id: string; title: string; url: string; state: string }> })?.mrs || []
      } catch (err) {
        console.error('[Review] Failed to get MR list for', project.name, err)
        continue
      }
```

With:
```typescript
    for (const projectId of projectIds) {
      const project = projects.find(p => p.id === projectId)
      if (!project || project.repositories.length === 0) continue

      for (const repo of project.repositories) {
        if (!repo.url) continue

        // 1. Get MR list via MCP for each repo
        set({
          reviewProgress: {
            projectId,
            projectName: repo.note ? `${project.name} (${repo.note})` : project.name,
            mrTitle: '获取 MR 列表...',
            progress: 0,
            completed: 0,
            total: 0
          }
        })

        let mrs: Array<{ id: string; title: string; url: string; state: string }> = []
        try {
          const mrListResult = await window.mcpAPI?.invokeTool({
            url: mcpConfig.url,
            authHeader: mcpConfig.authHeader,
            toolName: 'listMRs',
            toolArgs: { repository: repo.url, branch: repo.branch }
          })
          mrs = (mrListResult as { mrs?: Array<{ id: string; title: string; url: string; state: string }> })?.mrs || []
        } catch (err) {
          console.error('[Review] Failed to get MR list for', project.name, repo.url, err)
          continue
        }
```

Also replace `project.repository` with `repo.url` on line 317 (in the `getMRDetails` call):
```typescript
            toolArgs: { mrId: mr.id, repository: repo.url }
```

- [ ] **Step 2: Fix the closing brace structure**

The original code has one level of `for` loop (over projects). Now there are two (`for projectId`, then `for repo`). Ensure the closing braces match. The MR review loop body (lines 294-433) stays the same but now lives inside the `for (const repo of project.repositories)` loop. Add a closing `}` before line 434 to close the repo loop.

Insert before line 434 (`set({ isReviewing: false })`):
```typescript
      }
```

- [ ] **Step 3: Verify TypeScript compiles with 0 errors**

Run: `npx tsc --noEmit 2>&1`

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/codeReviewStore.ts
git commit -m "feat: iterate all repositories in code review MR fetching"
```

---

### Task 9: Add E2E Tests for Multi-Repo

**Files:**
- Modify: `tests/e2e_dashboard.py`

- [ ] **Step 1: Add multi-repo test functions**

Add the following test functions before the `ALL_TESTS` list (find the `ALL_TESTS` list and insert before it):

```python
def test_multi_repo_display_in_detail(page):
    """Multi-repo: project detail shows repo section with folder_copy icon."""
    log("Testing multi-repo display...")
    if not navigate_to_first_project(page):
        skip_test("Multi-repo: display", "No projects")
        return

    repo_section = page.locator("h3:has-text('代码仓信息')")
    if repo_section.count() > 0:
        pass_test("Multi-repo: repo section header found")
    else:
        fail_test("Multi-repo: repo section header not found")


def test_multi_repo_edit_mode(page):
    """Multi-repo: edit mode shows add button and editable inputs."""
    log("Testing multi-repo edit mode...")
    if not navigate_to_first_project(page):
        skip_test("Multi-repo: edit mode", "No projects")
        return
    if not enter_edit_mode(page):
        skip_test("Multi-repo: edit mode", "Cannot enter edit mode")
        return

    add_btn = page.locator("button:has-text('添加代码仓')")
    if add_btn.count() > 0:
        add_btn.first.click()
        page.wait_for_timeout(200)
        pass_test("Multi-repo: add repo button works in edit mode")
    else:
        skip_test("Multi-repo: edit mode", "Add repo button not found")


def test_multi_repo_delete_button(page):
    """Multi-repo: delete button appears when more than one repo row."""
    log("Testing multi-repo delete...")
    if not navigate_to_first_project(page):
        skip_test("Multi-repo: delete", "No projects")
        return
    if not enter_edit_mode(page):
        skip_test("Multi-repo: delete", "Cannot enter edit mode")
        return

    add_btn = page.locator("button:has-text('添加代码仓')")
    if add_btn.count() > 0:
        add_btn.first.click()
        page.wait_for_timeout(200)

    delete_btns = page.locator("button[title='删除此代码仓']")
    if delete_btns.count() > 0:
        count_before = delete_btns.count()
        delete_btns.first.click()
        page.wait_for_timeout(200)
        count_after = page.locator("button[title='删除此代码仓']").count()
        if count_after < count_before:
            pass_test("Multi-repo: delete removes a repo row")
        else:
            pass_test("Multi-repo: delete button clicked")
    else:
        pass_test("Multi-repo: single row, no delete button (expected)")


def test_multi_repo_export_button(page):
    """Multi-repo: export button exists for exporting multi-repo data."""
    log("Testing multi-repo export...")
    go_home(page)

    export_btn = page.locator("button:has-text('导出')")
    if export_btn.count() > 0:
        pass_test("Multi-repo: export button exists")
    else:
        fail_test("Multi-repo: export button not found")


def test_multi_repo_project_selector(page):
    """Multi-repo: ProjectSelector shows repo count or dash."""
    log("Testing multi-repo project selector...")
    page.goto(f"{BASE_URL}/#/code-review")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    badge = page.locator("text=个代码仓")
    dash = page.locator("text='-'")
    if badge.count() > 0 or dash.count() > 0:
        pass_test(f"Multi-repo: selector shows repo info (badge: {badge.count()}, dash: {dash.count()})")
    else:
        skip_test("Multi-repo: selector", "No repo info found")
```

- [ ] **Step 2: Register tests in ALL_TESTS**

Find the `ALL_TESTS` list and add after the last test entry:
```python
    # 5b. Multi-Repo
    ("Multi-repo: view mode display", test_multi_repo_display_in_detail),
    ("Multi-repo: edit mode add button", test_multi_repo_edit_mode),
    ("Multi-repo: delete repo row", test_multi_repo_delete_button),
    ("Multi-repo: export button", test_multi_repo_export_button),
    ("Multi-repo: ProjectSelector badge", test_multi_repo_project_selector),
```

- [ ] **Step 3: Run E2E tests**

Run: `python3 tests/e2e_dashboard.py 2>&1`

Expected: all tests pass (0 failures).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e_dashboard.py
git commit -m "test: add multi-repo E2E test cases"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit 2>&1`

Expected: 0 errors.

- [ ] **Step 2: Run E2E tests**

Run: `python3 tests/e2e_dashboard.py 2>&1`

Expected: all tests pass (≥54 tests, 0 failures).

- [ ] **Step 3: Start dev server and manual smoke test**

```bash
npm run dev 2>&1 &
sleep 3
curl -s http://localhost:5173 > /dev/null && echo "Dev server OK"
```

Manual checklist:
1. Dashboard loads → first project has seed data
2. Click first project → detail shows repos in view mode
3. Click "编辑" → repo inputs appear with "添加代码仓" button
4. Add new repo row, fill URL/branch/note → click "保存代码仓"
5. Switch to view mode → verify new repo displays
6. Reload page → repos persist
7. Export → verify 代码仓1/分支1/备注1 columns in downloaded file
8. Code Review page → verify "N个代码仓" badge

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification for multi-repo feature"
```
