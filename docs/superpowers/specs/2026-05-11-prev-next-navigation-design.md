# Prev/Next Navigation for Project Detail

## Context

Users need to navigate between project details without returning to the Dashboard. The navigation scope should match the current filtered list on the Dashboard.

## Architecture

### Data Flow

```
Dashboard (filter change)
  → Zustand store.setFilteredProjectIds(ids)
  → navigate('/project/:id')
  → ProjectDetail reads filteredProjectIds from store
  → calculates prev/next based on current position
```

### State Changes

**Zustand store (`src/store/projectStore.ts`):**
- Add `filteredProjectIds: string[]` to state
- Add `setFilteredProjectIds(ids: string[]): void` action

**Dashboard (`src/pages/Dashboard.tsx`):**
- On filter change, compute filtered project IDs
- Call `setFilteredProjectIds(filteredIds)` in store
- When navigating to project detail, store already holds correct list

**ProjectDetail (`src/pages/ProjectDetail.tsx`):**
- On mount, read `filteredProjectIds` from store
- Compute `currentIndex = filteredProjectIds.indexOf(projectId)`
- If `currentIndex === -1` (no list available), disable prev/next
- `prevId = filteredProjectIds[currentIndex - 1]`
- `nextId = filteredProjectIds[currentIndex + 1]`

## Components

### PrevNextNav Component

New component `src/components/PrevNextNav.tsx`:

**Props:**
```typescript
interface PrevNextNavProps {
  prevId?: string
  nextId?: string
  currentIndex: number
  total: number
  onPrev: () => void
  onNext: () => void
}
```

**UI:**
- Fixed bottom bar, full width
- Three sections: [← Prev] [3 / 12] [Next →]
- When `prevId` is undefined, Prev button is disabled (opacity 0.4, cursor not-allowed)
- When `nextId` is undefined, Next button is disabled
- Keyboard: `Alt+←` = prev, `Alt+→` = next

**Styles:**
- `position: fixed; bottom: 0; left: 0; right: 0;`
- Height: 48px
- Background: same as page background with subtle top border
- Flexbox, space-between alignment

### Keyboard Handler

Inside ProjectDetail, add `useEffect` with `keydown` listener:
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

## Edge Cases

| Case | Behavior |
|------|----------|
| No filtered list (direct URL) | Both prev/next disabled |
| First project | Prev disabled |
| Last project | Next disabled |
| List becomes empty after filter | Both disabled |
| Single project | Both disabled |

## Files to Modify

| File | Change |
|------|--------|
| `src/store/projectStore.ts` | Add `filteredProjectIds` state + `setFilteredProjectIds` |
| `src/pages/Dashboard.tsx` | Call `setFilteredProjectIds` when filter changes |
| `src/pages/ProjectDetail.tsx` | Read store, compute prev/next, add keyboard listener |
| `src/components/PrevNextNav.tsx` | New component |
| `src/App.tsx` | (no changes needed) |

## Implementation Notes

1. `filteredProjectIds` should be set when Dashboard mounts (with initial filtered list) so direct navigation from Dashboard works
2. `filteredProjectIds` should NOT persist to localStorage — always recomputed from current Dashboard state
3. If `filteredProjectIds` is empty array, treat same as no-list (disable both)