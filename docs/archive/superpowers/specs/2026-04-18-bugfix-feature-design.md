# Bug Fix & Feature Implementation Design

**Date:** 2026-04-18
**Status:** Approved for implementation

---

## Overview

Fix 3 bugs and implement 2 features for Precision Curator project detail page.

---

## Issue #6: Edit Button Navigation with `?edit=true` Parameter

### Problem
Clicking "Edit" button in project list navigates to view mode instead of edit mode.

### Solution
1. `Dashboard.tsx` — `handleEdit` navigates to `/project/${id}?edit=true`
2. `ProjectDetail.tsx` — reads `edit` param via `useSearchParams()`, initializes `isReadOnly={!editParam}`

### Files Changed
- `src/pages/Dashboard.tsx`
- `src/pages/ProjectDetail.tsx`

---

## Issue #7: Budget Stats Not Echoing in Edit Mode

### Problem
Budget total/used amounts not echoing when entering edit mode.

### Root Cause
`budgetEditTotal` and `budgetEditUsed` state initialized as empty strings, only set on focus.

### Solution
When `isReadOnly` transitions from `true` to `false`, initialize `budgetEditTotal` and `budgetEditUsed` with current `project.totalAmount` and `project.usedAmount`.

### Files Changed
- `src/pages/ProjectDetail.tsx`

---

## Issue #8: Markdown Not Parsed in Note History

### Problem
Note history displays raw markdown text like `**bold**` instead of rendered HTML.

### Solution
Use `marked` library to parse markdown before rendering via `dangerouslySetInnerHTML`.

### Dependencies
- Add `marked` npm package

### Files Changed
- `src/components/Timeline.tsx` (or note history section in `ProjectDetail.tsx`)

---

## Feature #1: Hide Project Notes in View Mode

### Problem
Project notes section visible in both view and edit modes.

### Solution
Conditionally render notes section: `{!isReadOnly && (<RichEditor ... />)}`

### Files Changed
- `src/pages/ProjectDetail.tsx`

---

## Feature #2: Milestone Editing in Edit Mode

### Problem
Milestones are read-only; no way to add/edit milestones.

### Solution
- In edit mode (`!isReadOnly`): show "Add Milestone" button
- Click opens a Dialog with form: title, date, status (pending/completed/delayed), description
- Uses existing modal pattern already in codebase
- On submit: calls `updateProject` to add milestone

### Files Changed
- `src/pages/ProjectDetail.tsx` — add milestone dialog and state
- No new component files needed

---

## Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `marked` | Markdown parsing | latest stable |

---

## Implementation Order

1. Issue #6 (navigation fix)
2. Issue #7 (budget echo fix)
3. Issue #8 (markdown parsing)
4. Feature #1 (hide notes in view mode)
5. Feature #2 (milestone editing)
