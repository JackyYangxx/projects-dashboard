# Prev/Next Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prev/next project navigation in ProjectDetail, scoped to Dashboard's current filtered list.

**Architecture:** Zustand store holds `filteredProjectIds`. Dashboard syncs filtered list on filter change. ProjectDetail reads store to compute prev/next. New `PrevNextNav` component provides fixed-bottom navigation bar with keyboard shortcuts.

**Tech Stack:** React, Zustand, React Router

---

## Task 1: Add filteredProjectIds to Zustand Store

**Files:**
- Modify: `src/store/projectStore.ts:6-19`

- [ ] **Step 1: Add state and action to ProjectStore interface**

In the `ProjectStore` interface (lines 6-19), add:
```typescript
filteredProjectIds: string[]
setFilteredProjectIds: (ids: string[]) => void
```

- [ ] **Step 2: Add filteredProjectIds to initial state**

In the `zustandCreate<ProjectStore>((set, get) => ({` block (line 21-25), add to the initial state object:
```typescript
filteredProjectIds: [],
```

- [ ] **Step 3: Implement setFilteredProjectIds action**

After the existing actions, add:
```typescript
setFilteredProjectIds: (ids) => set({ filteredProjectIds: ids }),
```

**Verify:** `npm run typecheck` passes (or `npx tsc --noEmit` if available).

---

## Task 2: Modify ProjectTable to notify Dashboard of filtered changes

**Files:**
- Modify: `src/components/ProjectTable.tsx:6-11`, `src/components/ProjectTable.tsx:26-57`

- [ ] **Step 1: Add onFilteredProjectsChange prop to ProjectTableProps**

Add to the `ProjectTableProps` interface (lines 6-11):
```typescript
onFilteredProjectsChange?: (projectIds: string[]) => void
```

- [ ] **Step 2: Pass filteredProjects as IDs to the callback**

In the `useEffect` that computes filtered projects (lines 32-57), add after `setFilteredProjects(result)`:
```typescript
onFilteredProjectsChange?.(result.map(p => p.id))
```

The effect body should be:
```typescript
React.useEffect(() => {
  let result = projects

  if (statusFilter !== '全部') {
    const statusMap: Record<string, Project['status']> = {
      '进行中': 'ongoing',
      '已完成': 'completed',
      '暂停中': 'paused',
    }
    const targetStatus = statusMap[statusFilter]
    if (targetStatus) {
      result = result.filter((p) => p.status === targetStatus)
    }
  }

  if (monthFilter !== '全部') {
    const monthIdx = MONTHS.indexOf(monthFilter)
    result = result.filter((p) => {
      const date = new Date(p.createdAt)
      return date.getMonth() + 1 === monthIdx
    })
  }

  setFilteredProjects(result)
  setVisibleCount(INITIAL_PAGE_SIZE)
  onFilteredProjectsChange?.(result.map(p => p.id))
}, [projects, monthFilter, statusFilter, onFilteredProjectsChange])
```

**Verify:** TypeScript passes.

---

## Task 3: Dashboard syncs filtered IDs to store

**Files:**
- Modify: `src/pages/Dashboard.tsx:14`, `src/pages/Dashboard.tsx:272-277`

- [ ] **Step 1: Destructure setFilteredProjectIds from store**

On line 14, change:
```typescript
const { projects, isLoading, loadProjects } = useProjectStore()
```
to:
```typescript
const { projects, isLoading, loadProjects, setFilteredProjectIds } = useProjectStore()
```

- [ ] **Step 2: Create handler function**

Add after `handleDelete` (around line 49):
```typescript
const handleFilteredProjectsChange = (ids: string[]) => {
  setFilteredProjectIds(ids)
}
```

- [ ] **Step 3: Pass handler to ProjectTable and set on mount**

Change the ProjectTable usage (lines 272-277) from:
```typescript
<ProjectTable
  projects={projects}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```
to:
```typescript
<ProjectTable
  projects={projects}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onFilteredProjectsChange={handleFilteredProjectsChange}
/>
```

- [ ] **Step 4: Set initial filtered list on mount**

After the `loadProjects()` call in `useEffect`, add:
```typescript
useEffect(() => {
  loadProjects()
}, [loadProjects])

useEffect(() => {
  setFilteredProjectIds(projects.map(p => p.id))
}, [projects])
```
Wait — the second useEffect with `[projects]` would update when projects load. Since Dashboard already renders `<ProjectTable projects={projects} ...>`, and ProjectTable will call `onFilteredProjectsChange` whenever `filteredProjects` changes (including on initial render), Task 2's `onFilteredProjectsChange?.(result.map(p => p.id))` call will handle initial sync automatically. No additional useEffect needed in Dashboard.

**Verify:** Build succeeds.

---

## Task 4: Create PrevNextNav component

**Files:**
- Create: `src/components/PrevNextNav.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/PrevNextNav.tsx`:
```typescript
import React from 'react'

interface PrevNextNavProps {
  prevId?: string
  nextId?: string
  currentIndex: number
  total: number
  onPrev: () => void
  onNext: () => void
}

const PrevNextNav: React.FC<PrevNextNavProps> = ({
  prevId,
  nextId,
  currentIndex,
  total,
  onPrev,
  onNext,
}) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-12 bg-surface-elevated border-t border-outline flex items-center justify-between px-6 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        onClick={onPrev}
        disabled={!prevId}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
          prevId
            ? 'text-on-surface-primary hover:bg-surface-container cursor-pointer'
            : 'text-on-surface-tertiary opacity-40 cursor-not-allowed'
        }`}
        aria-label="上一个项目"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
        上一个
      </button>

      <span className="text-sm font-body text-on-surface-secondary font-mono tabular-nums">
        {currentIndex} / {total}
      </span>

      <button
        onClick={onNext}
        disabled={!nextId}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
          nextId
            ? 'text-on-surface-primary hover:bg-surface-container cursor-pointer'
            : 'text-on-surface-tertiary opacity-40 cursor-not-allowed'
        }`}
        aria-label="下一个项目"
      >
        下一个
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </div>
  )
}

export default PrevNextNav
```

**Verify:** Build succeeds with new component.

---

## Task 5: Integrate prev/next navigation into ProjectDetail

**Files:**
- Modify: `src/pages/ProjectDetail.tsx:1-14`, `src/pages/ProjectDetail.tsx` (after nav bar, before main content)

- [ ] **Step 1: Import PrevNextNav and add store access**

At the top of the file (lines 1-8), add `PrevNextNav` to the import from `@/components/...`:
```typescript
import ProgressSlider from '@/components/ProgressSlider'
import RichEditor from '@/components/RichEditor'
import PrevNextNav from '@/components/PrevNextNav'
```

Change line 13 from:
```typescript
const { getProjectById, updateProject } = useProjectStore()
```
to:
```typescript
const { getProjectById, updateProject, filteredProjectIds } = useProjectStore()
```

- [ ] **Step 2: Compute prev/next IDs**

After the `project` declaration (around line 14), add:
```typescript
const currentIndex = project ? filteredProjectIds.indexOf(project.id) : -1
const prevId = currentIndex > 0 ? filteredProjectIds[currentIndex - 1] : undefined
const nextId = currentIndex >= 0 && currentIndex < filteredProjectIds.length - 1
  ? filteredProjectIds[currentIndex + 1]
  : undefined
```

- [ ] **Step 3: Add keyboard event handler**

Add a new `useEffect` after the existing ones (around line 73):
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.altKey && e.key === 'ArrowLeft' && prevId) {
      navigate(`/project/${prevId}`)
    }
    if (e.altKey && e.key === 'ArrowRight' && nextId) {
      navigate(`/project/${nextId}`)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [prevId, nextId, navigate])
```

- [ ] **Step 4: Add PrevNextNav before closing div**

Before the closing `</div>` of the root `min-h-screen` div (line 835), add:
```typescript
<PrevNextNav
  prevId={prevId}
  nextId={nextId}
  currentIndex={currentIndex >= 0 ? currentIndex + 1 : 0}
  total={filteredProjectIds.length}
  onPrev={() => prevId && navigate(`/project/${prevId}`)}
  onNext={() => nextId && navigate(`/project/${nextId}`)}
/>
```

**Note:** The `currentIndex + 1` is because users expect 1-based indexing ("3 / 12" not "2 / 12").

**Verify:** Build succeeds, run `npm run dev` and test.

---

## Self-Review Checklist

- [ ] `filteredProjectIds` state is added to store
- [ ] `setFilteredProjectIds` action is added to store
- [ ] ProjectTable calls `onFilteredProjectsChange` on filter change
- [ ] Dashboard passes handler to ProjectTable and syncs to store
- [ ] PrevNextNav is created with correct UI (fixed bottom, 3 sections, disabled states)
- [ ] ProjectDetail computes prev/next from `filteredProjectIds`
- [ ] Keyboard shortcuts `Alt+←` and `Alt+→` work in ProjectDetail
- [ ] Position indicator shows "current / total" (1-based)
- [ ] Edge cases handled: first project (prev disabled), last project (next disabled), no list (both disabled), single project (both disabled)
- [ ] No placeholder/TODO in code
- [ ] Types consistent across all modified files

## Spec Coverage

| Spec Section | Task |
|---|---|
| Data Flow (store sync) | Task 1, 2, 3 |
| PrevNextNav Component | Task 4 |
| Keyboard Handler (Alt+←/→) | Task 5, Step 3 |
| UI (fixed bottom bar) | Task 4 |
| Position indicator | Task 4, Step 4 |
| Disabled states | Task 4 |
| Edge cases | Task 5, Step 2 |