# E2E Test Cases: Repository Code Field

**Spec:** `docs/superpowers/specs/2026-07-06-0706-optimizations-design.md`
**PRD:** `docs/PRD/0706-optimizations.md`
**Written:** 2026-07-06T17:00:00+08:00
**Total Cases:** 5

---

## Test Case 1: Repository Code Badge Display (Read-Only Mode)

**Test ID:** TC-001
**Priority:** P0
**Preconditions:**
- Dev server running at `http://localhost:5173`
- At least one project exists with a repository that has a `code` value (e.g., `REPO-001` from seed data)
- Project detail page is in read-only (view) mode

### Steps

1. Navigate to `http://localhost:5173` (dashboard)
2. Click the view button (`aria-label` contains "查看") on the first project row to open its detail page
3. Verify the page URL contains `/project/`
4. Locate the "代码仓信息" section header
5. Inspect the repository row for a code badge element

### Expected Result

- When `repo.code` has a value (e.g., `REPO-001`), a badge is rendered with the code text
- Badge has CSS classes: `text-xs`, `font-mono`, `text-on-surface-tertiary`, `border`, `border-outline`, `px-1.5`, `py-0.5`, `rounded`
- Badge appears before the repository URL in the row
- The old `projectId` badge (which incorrectly showed the project's `projectId`) is no longer present in the repository row
- When `repo.code` is empty/undefined, no badge is rendered for that repository

### Verification Method

1. **Snapshot check:** Take an a11y snapshot of the page and verify the code text `REPO-001` is present in the repository info section
2. **DOM check:** Verify the badge element exists with correct CSS classes via `page.locator('.text-xs.font-mono')` within the repo section
3. **Negative check:** Verify `page.locator('.text-xs.font-mono').filter({ hasText: project.projectId })` does NOT exist (old projectId badge is removed)
4. **Screenshot:** Capture a screenshot of the repository info card for visual verification

---

## Test Case 2: Repository Code Field Editing (Edit Mode)

**Test ID:** TC-002
**Priority:** P0
**Preconditions:**
- Dev server running at `http://localhost:5173`
- At least one project exists with a repository
- Project detail page in edit mode

### Steps

1. Navigate to `http://localhost:5173` (dashboard)
2. Click the view button on the first project to open its detail page
3. Click the "编辑" button to enter edit mode
4. Locate the "代码仓信息" section
5. Find the code input field (placeholder="编码") for the first repository row
6. Verify the input is rendered with `font-mono` styling
7. Type a new code value (e.g., `REPO-002`) into the code input
8. Press Enter or wait for auto-save (debounce)
9. Toggle back to read-only mode by clicking the "编辑中" (or equivalent) button
10. Verify the new code value appears as a badge

### Expected Result

- In edit mode, each repository row has a "编码" input field with `font-mono` class
- The code input is positioned before the URL input in the row layout (col-span-2)
- The input accepts text and auto-saves on Enter or blur
- After toggling back to read-only mode, the entered code appears as a badge
- Adding a new repository via "添加代码仓" creates a row with an empty code input
- Deleting a repository row works correctly with the code field present

### Verification Method

1. **DOM check in edit mode:** Verify input with placeholder "编码" exists in repository rows
2. **Layout check:** Verify code input appears before URL input in the grid row
3. **Auto-save check:** Fill the code input, press Enter, toggle to view mode, verify badge displays the new code
4. **Add/delete check:** Click "添加代码仓", verify new row has code input; delete a row, verify it's removed
5. **Screenshot:** Before/after screenshots of edit mode repository rows

---

## Test Case 3: Repository Code Field in Project Creation Form

**Test ID:** TC-003
**Priority:** P1
**Preconditions:**
- Dev server running at `http://localhost:5173`

### Steps

1. Navigate to `http://localhost:5173/#/project/new`
2. Verify the form has all expected fields rendered
3. Locate the "代码仓编码" input field (placeholder: "如 REPO-001")
4. Verify this field appears before the "代码仓" (URL) input field
5. Fill in all required fields: project name, product line, leader
6. Fill the code field with `REPO-TEST`
7. Fill the repository URL and branch fields
8. Click "创建项目" to submit
9. After redirect to dashboard, find and open the newly created project
10. Verify the repository code badge shows `REPO-TEST`

### Expected Result

- "代码仓编码" input field is rendered with placeholder "如 REPO-001"
- The code input is positioned before the "代码仓" URL input
- The field uses `font-mono` styling
- On submit, the project is created with the repository's `code` field set to the entered value
- The code value persists and is visible when viewing the project detail page

### Verification Method

1. **Form render check:** Verify input with placeholder "如 REPO-001" exists and is before the "代码仓" input
2. **End-to-end check:** Submit the form with a code value, navigate to the created project, verify badge exists
3. **Screenshot:** Capture the form with the code field filled

---

## Test Case 4: Repository Code Badge in Project Selector

**Test ID:** TC-004
**Priority:** P1
**Preconditions:**
- Dev server running at `http://localhost:5173`
- At least one project exists with a repository that has a non-empty `code` value

### Steps

1. Navigate to `http://localhost:5173/#/code-review`
2. Wait for the code review page to load
3. Locate the project selector component (checkboxes with project info)
4. For a project whose repository has a `code` value, verify a code badge is displayed
5. For a project whose repository has an empty/missing `code`, verify no code badge is displayed

### Expected Result

- When `repo.code` exists, a badge with the code text (e.g., `REPO-001`) appears in the repository list item, positioned before the repository URL link
- When `repo.code` is empty/undefined, no badge is rendered
- Badge styling matches the read-only detail page badge style

### Verification Method

1. **DOM check:** Verify code badge elements exist in the project selector for projects with repo codes
2. **Negative check:** Verify no orphaned/empty badge elements exist
3. **Screenshot:** Capture the project selector section showing code badges

---

## Test Case 5: Console Error Check Across All Pages

**Test ID:** TC-005
**Priority:** P0
**Preconditions:**
- Dev server running at `http://localhost:5173`

### Steps

1. Navigate to each page in sequence, monitoring `console.error` messages:
   - `http://localhost:5173` (Dashboard)
   - `http://localhost:5173/#/project/new` (Project Form)
   - Open a project detail page in view mode
   - Same project detail page in edit mode
   - `http://localhost:5173/#/code-review` (Code Review)
   - `http://localhost:5173/#/settings` (Settings)
2. On each page, wait for `networkidle` and then 500ms for any deferred errors
3. Collect all `console.error` level messages

### Expected Result

- Zero `console.error` messages across all pages
- TypeScript compilation passes without errors (`npm run build` succeeds)
- All existing E2E tests from `tests/e2e_dashboard.py` continue to pass

### Verification Method

1. **Console listener:** Attach `page.on("console", handler)` filtering for `msg.type() === "error"`
2. **Build check:** Run `npx tsc --noEmit` and verify zero errors
3. **Regression check:** Run `python tests/e2e_dashboard.py` against the dev server and verify all tests pass (no new failures introduced)
