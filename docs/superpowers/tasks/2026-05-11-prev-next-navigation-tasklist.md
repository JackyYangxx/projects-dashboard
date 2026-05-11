# Prev/Next Navigation - Task List

## Task 1: Add filteredProjectIds state to Zustand store

**Files:**
- Modify: `src/store/projectStore.ts:6-19`

**Acceptance Criteria:**
1. `filteredProjectIds: string[]` is added to the ProjectStore interface state
2. `setFilteredProjectIds(ids: string[]): void` action is added to the interface
3. Initial value is empty array `[]`
4. The action correctly updates `filteredProjectIds` in state

**Verification Command:** `grep -n "filteredProjectIds" src/store/projectStore.ts`

---

## Task 2: Update Dashboard to set filteredProjectIds on mount and filter change

**Files:**
- Modify: `src/pages/Dashboard.tsx:39-45`

**Acceptance Criteria:**
1. `setFilteredProjectIds` is called with all project IDs on initial load (line 17-18 useEffect)
2. When `handleView` navigates to a project, the store already holds the current filtered list
3. No filter logic change required - all projects are used as the default filtered list

**Verification Command:** `grep -n "setFilteredProjectIds" src/pages/Dashboard.tsx`

---

## Task 3: Create PrevNextNav component

**Files:**
- Create: `src/components/PrevNextNav.tsx`

**Acceptance Criteria:**
1. Component accepts `prevId`, `nextId`, `currentIndex`, `total`, `onPrev`, `onNext` props
2. UI shows `[← Prev] [3 / 12] [Next →]` layout with fixed bottom bar
3. Prev button disabled when `prevId` is undefined (opacity 0.4, cursor not-allowed)
4. Next button disabled when `nextId` is undefined
5. Keyboard: `Alt+←` calls `onPrev`, `Alt+→` calls `onNext`
6. Height 48px, full width, subtle top border, flexbox space-between

**Verification Command:** `ls -la src/components/PrevNextNav.tsx && grep -n "Alt" src/components/PrevNextNav.tsx`

---

## Task 4: Integrate prev/next navigation in ProjectDetail

**Files:**
- Modify: `src/pages/ProjectDetail.tsx:9-74`

**Acceptance Criteria:**
1. On mount, reads `filteredProjectIds` from store and computes `currentIndex`
2. If `currentIndex === -1` (no list), both prev/next are disabled
3. Computes `prevId = filteredProjectIds[currentIndex - 1]`, `nextId = filteredProjectIds[currentIndex + 1]`
4. `useEffect` adds `keydown` listener for `Alt+←` and `Alt+→`
5. Renders `<PrevNextNav>` component at bottom of page
6. When navigating, uses `navigate(\`/project/${prevId}\`)` and `navigate(\`/project/${nextId}\`)`

**Verification Command:** `grep -n "filteredProjectIds\|PrevNextNav\|Alt+" src/pages/ProjectDetail.tsx`

---

## Task 5: Verify edge cases work correctly

**Files:**
- Modify: `src/components/PrevNextNav.tsx`
- Modify: `src/pages/ProjectDetail.tsx`

**Acceptance Criteria:**
1. Direct URL navigation (no filtered list): both buttons disabled
2. First project in list: Prev disabled, Next enabled
3. Last project in list: Next disabled, Prev enabled
4. Single project: both disabled
5. Empty filtered list: both disabled (same as no-list behavior)
6. `filteredProjectIds` is NOT persisted to localStorage (always in-memory only)

**Verification Command:** Manual test with various navigation scenarios; check browser console for no errors
