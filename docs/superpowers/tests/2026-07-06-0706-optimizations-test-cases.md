# E2E Test Cases: 0706 Optimizations

**Spec:** `docs/superpowers/specs/2026-07-06-0706-optimizations-design.md`
**PRD:** `docs/PRD/0706-optimizations.md`
**Written:** 2026-07-06T21:00:00+08:00
**Total Cases:** 29

---

## Area 1: Dashboard — Default Budget & Status

### Test Case 1.1: New Project Defaults

**Test ID:** TC-DASH-001
**Priority:** P0

**Preconditions:** Dev server running at `http://localhost:5173`

**Steps:**
1. Navigate to `http://localhost:5173/#/project/new`
2. Inspect the form's default values

**Expected Result:**
- Status field defaults to "暂停中" (paused)
- Budget (总预算) field defaults to 0
- Used budget (已用预算) field defaults to 0

**Verification:** Snapshot + screenshot of the form in initial state.

---

### Test Case 1.2: Status Column with Dropdown

**Test ID:** TC-DASH-002
**Priority:** P0

**Preconditions:** Dev server running, at least one project exists

**Steps:**
1. Navigate to `http://localhost:5173` (dashboard)
2. Locate the "状态" column header (7th column)
3. Verify each project row has a `<select>` dropdown in the status column
4. Change a project's status from "进行中" to "暂停中" via the dropdown
5. Verify the status dot color changes accordingly

**Expected Result:**
- Table has 7 columns including "状态"
- Each row has a functional status `<select>` with 3 options: 进行中, 已完成, 暂停中
- Changing status updates the row's status dot color (blue→yellow, etc.)
- Clicking the dropdown does NOT navigate to the project detail page (stopPropagation works)

**Verification:** Snapshot + screenshot of status dropdown interaction.

---

### Test Case 1.3: Column Header Rename (负责人 → 开发责任人)

**Test ID:** TC-DASH-003
**Priority:** P0

**Steps:**
1. Navigate to `http://localhost:5173`
2. Inspect the third column header

**Expected Result:**
- Column header reads "开发责任人" (not "负责人")

**Verification:** Snapshot text check.

---

## Area 2: Dashboard — Multi-Tag Filter

### Test Case 2.1: Tag Filter Replaces Month Filter

**Test ID:** TC-DASH-004
**Priority:** P0

**Preconditions:** Dev server running, at least one project with tags exists

**Steps:**
1. Navigate to `http://localhost:5173`
2. Click the filter dropdown (tag filter button in the toolbar area)
3. Verify it shows available tags from projects
4. Select one or more tags
5. Verify the project list filters to show only matching projects

**Expected Result:**
- Tag filter button is present (replacing the old month filter)
- Dropdown shows checkboxes for each unique tag across projects
- Selecting tags filters the project list
- Deselecting all tags shows all projects
- Filter button shows count of selected tags

**Verification:** Snapshot + screenshot of filter interaction.

---

### Test Case 2.2: Multi-Tag Display in Table

**Test ID:** TC-DASH-005
**Priority:** P1

**Steps:**
1. Navigate to `http://localhost:5173`
2. Inspect project rows in the table
3. Verify tag pills are rendered under project names

**Expected Result:**
- Projects with tags show up to 2 tag pills under the project name
- If more than 2 tags, "+N" overflow indicator is shown
- Tag pills have rounded-full styling with muted colors

**Verification:** Snapshot + screenshot.

---

## Area 3: Project Detail — Sidebar Menu Highlight

### Test Case 3.1: Sidebar "项目详情" Active on /project/:id

**Test ID:** TC-DETAIL-001
**Priority:** P0

**Steps:**
1. Navigate to `http://localhost:5173` (dashboard)
2. Verify sidebar "项目看板" is active, "项目详情" is not
3. Click "查看" on any project to navigate to `/project/:id`
4. Verify sidebar "项目详情" is now active (highlighted)

**Expected Result:**
- Sidebar has "项目详情" menu item
- It highlights (active state) when on any `/project/:id` page
- It does NOT highlight when on dashboard `/`

**Verification:** Snapshot + screenshot of sidebar in both states.

---

### Test Case 3.2: Sidebar "项目详情" Active on /project/new

**Test ID:** TC-DETAIL-002
**Priority:** P1

**Steps:**
1. Navigate to `http://localhost:5173/#/project/new`
2. Check sidebar active state

**Expected Result:**
- "项目详情" is active when on `/project/new`

**Verification:** Snapshot.

---

## Area 4: Project Detail — Repository ProjectId Field

### Test Case 4.1: Repository ProjectId Display (View Mode)

**Test ID:** TC-DETAIL-003
**Priority:** P0

**Preconditions:** Project exists with a repository that has a `projectId` value

**Steps:**
1. Navigate to a project detail page in view mode
2. Locate the "代码仓信息" section
3. Inspect repository rows for ProjectId badge

**Expected Result:**
- When `repo.projectId` has a value, a badge with that value appears in the repository row
- Badge is styled distinctly from the code badge
- When `repo.projectId` is empty, no badge is rendered

**Verification:** Snapshot + screenshot.

---

### Test Case 4.2: Repository ProjectId Input (Edit Mode)

**Test ID:** TC-DETAIL-004
**Priority:** P0

**Steps:**
1. Navigate to a project detail page
2. Enter edit mode
3. Locate the "代码仓信息" section
4. Find the ProjectId input field in the repository edit row
5. Enter a ProjectId value and save

**Expected Result:**
- ProjectId input field exists with appropriate placeholder
- Value persists after save
- Visible in view mode after toggling back

**Verification:** Snapshot + screenshot before/after.

---

## Area 5: Project Detail — Multi-Tag Support

### Test Case 5.1: Multi-Tag Display in Project Detail

**Test ID:** TC-DETAIL-005
**Priority:** P0

**Preconditions:** Project exists with multiple tags

**Steps:**
1. Navigate to a project detail page
2. Locate the tags section
3. Inspect the tag display

**Expected Result:**
- Each tag is rendered as an individual pill (not a single comma-separated string)
- Tag pills have distinct styling (bg-primary-50, text-primary-700, border-primary-200)
- Edit button is present next to tags

**Verification:** Snapshot + screenshot.

---

### Test Case 5.2: Multi-Tag Editing

**Test ID:** TC-DETAIL-006
**Priority:** P0

**Steps:**
1. Navigate to a project detail page
2. Click the edit button on tags
3. Enter comma-separated tags (e.g., "标签A, 标签B, 标签C")
4. Press Enter or blur to save
5. Verify tags update to individual pills

**Expected Result:**
- Clicking edit switches to input mode with comma-separated current tags
- Saving splits by comma and renders individual pills
- Empty input removes all tags

**Verification:** Snapshot + screenshot before/after edit.

---

## Area 6: Code Review — Ongoing Projects Only + Repo Columns

### Test Case 6.1: Only Ongoing Projects Shown

**Test ID:** TC-CODE-001
**Priority:** P0

**Preconditions:** Multiple projects with different statuses exist (ongoing, completed, paused)

**Steps:**
1. Navigate to `http://localhost:5173/#/code-review`
2. Inspect the project selector table
3. Verify which projects appear

**Expected Result:**
- Only projects with status "ongoing" (进行中) appear in the project selector
- Completed and paused projects are NOT listed

**Verification:** Snapshot + cross-reference with dashboard project list.

---

### Test Case 6.2: Repository Info Columns in Project Selector

**Test ID:** TC-CODE-002
**Priority:** P0

**Preconditions:** An ongoing project exists with at least one repository

**Steps:**
1. Navigate to `http://localhost:5173/#/code-review`
2. Inspect the repository info columns in the project selector

**Expected Result:**
- Table includes columns for: 地址, 分支, ProjectId, 备注
- Each repository in a project is shown as a sub-row with these columns populated
- Multi-repo projects show multiple sub-rows

**Verification:** Snapshot + screenshot.

---

## Area 7: Global Styles — Title Bar Distinct from Content

### Test Case 7.1: Dashboard Title Bar Background

**Test ID:** TC-GLOBAL-001
**Priority:** P1

**Steps:**
1. Navigate to `http://localhost:5173`
2. Inspect the header/title bar background color
3. Compare with the content area background color

**Expected Result:**
- Header background uses `bg-surface-subtle` (visually distinct from white content area)
- Content area has a different background (white or surface-elevated)
- Clear visual separation between title bar and content

**Verification:** Screenshot + CSS class inspection.

---

### Test Case 7.2: Code Review Page Title Bar Background

**Test ID:** TC-GLOBAL-002
**Priority:** P1

**Steps:**
1. Navigate to `http://localhost:5173/#/code-review`
2. Inspect the title bar background
3. Compare with content area

**Expected Result:**
- Title bar uses `bg-surface-subtle`
- Content area has different background
- Visual distinction is clear

**Verification:** Screenshot + CSS class inspection.

---

### Test Case 7.3: Settings Page Title Bar Background

**Test ID:** TC-GLOBAL-003
**Priority:** P1

**Steps:**
1. Navigate to `http://localhost:5173/#/settings`
2. Inspect the title bar background

**Expected Result:**
- Title bar uses `bg-surface-subtle`
- Visual distinction from content area

**Verification:** Screenshot + CSS class inspection.

---

## Area 8: Regression — Console Errors

### Test Case 8.1: Zero Console Errors Across All Pages

**Test ID:** TC-REGRESS-001
**Priority:** P0

**Steps:**
1. Navigate to each page in sequence:
   - `/` (Dashboard)
   - `/project/:id` (view mode)
   - `/project/:id?edit=true` (edit mode)
   - `/project/new` (create form)
   - `/code-review` (Code Review)
   - `/settings` (Settings)
2. On each page, wait for rendering to complete
3. Collect all console.error messages

**Expected Result:**
- Zero console.error messages on any page

**Verification:** `evaluate_script` to check `console.error` calls.

---

### Test Case 8.2: Unit Tests Pass

**Test ID:** TC-REGRESS-002
**Priority:** P0

**Steps:**
1. Run `npx vitest run`

**Expected Result:**
- All 148 tests pass, 0 failures

**Verification:** Command output.

---

### Test Case 8.3: TypeScript Compilation

**Test ID:** TC-REGRESS-003
**Priority:** P0

**Steps:**
1. Run `npx tsc --noEmit`

**Expected Result:**
- Zero TypeScript errors

**Verification:** Command output.

---

### Test Case 8.4: Existing E2E Tests Not Modified

**Test ID:** TC-REGRESS-004
**Priority:** P1

**Steps:**
1. Check git diff for `tests/e2e_dashboard.py`

**Expected Result:**
- No modifications to existing E2E test files

**Verification:** `git diff tests/e2e_dashboard.py` returns empty.

---

## Area 9: Repository CRUD

### Test Case 9.1: Add Repository — Full Flow

**Test ID:** TC-DETAIL-007
**Priority:** P0

**Preconditions:** Dev server running, project exists in edit mode

**Steps:**
1. Navigate to a project detail page
2. Enter edit mode
3. Click "添加代码仓" button
4. Fill in all fields: 编码 (code), ProjectId, URL, 分支 (branch), 备注 (note)
5. Toggle to view mode
6. Toggle back to edit mode

**Expected Result:**
- New empty row appears immediately after clicking "添加代码仓"
- All fields are editable text inputs
- After filling fields and toggling to view mode, the new repo is visible
- After re-entering edit mode, all filled values persist
- Empty-URL rows are cleaned up when exiting edit mode

**Verification:** Snapshot + screenshot of add flow.

---

### Test Case 9.2: Modify Repository Fields

**Test ID:** TC-DETAIL-008
**Priority:** P1

**Preconditions:** Project exists with at least one repository

**Steps:**
1. Navigate to a project detail page in edit mode
2. Modify the 编码 (code) field of an existing repository
3. Modify the URL field
4. Modify the 分支 (branch) field
5. Modify the 备注 (note) field
6. Toggle to view mode

**Expected Result:**
- All modified field values are visible in view mode
- Changes persist after re-entering edit mode

**Verification:** Snapshot + screenshot before/after modification.

---

### Test Case 9.3: Delete Repository

**Test ID:** TC-DETAIL-009
**Priority:** P1

**Preconditions:** Project exists with at least two repositories

**Steps:**
1. Navigate to a project detail page in edit mode
2. Click the delete (close) button on one repository row
3. Verify the repository row is removed
4. Toggle to view mode

**Expected Result:**
- Deleted repository no longer appears in view mode
- Remaining repositories are unaffected

**Verification:** Snapshot + screenshot before/after deletion.

---

### Test Case 9.4: Empty URL Repository Cleanup on Exit Edit

**Test ID:** TC-DETAIL-010
**Priority:** P0

**Preconditions:** Project exists in edit mode

**Steps:**
1. Navigate to a project detail page in edit mode
2. Click "添加代码仓" — new empty row appears
3. Do NOT fill in the URL field
4. Toggle to view mode (exit edit mode)
5. Toggle back to edit mode

**Expected Result:**
- After exiting edit mode, the empty-URL row is automatically removed
- Re-entering edit mode does not show the empty row
- Repositories with valid URLs are preserved

**Verification:** Snapshot + screenshot.

---

## Area 10: Budget Source CRUD

### Test Case 10.1: Add Budget Source

**Test ID:** TC-DETAIL-011
**Priority:** P0

**Preconditions:** Project exists in edit mode

**Steps:**
1. Navigate to a project detail page in edit mode
2. Locate the "预算来源" section
3. Click "添加预算来源" button
4. Fill in source name and amount
5. Toggle to view mode

**Expected Result:**
- New budget source row appears after clicking add
- Filled values persist in view mode
- Total budget updates to reflect the new source

**Verification:** Snapshot + screenshot of add flow.

---

### Test Case 10.2: Modify Budget Source

**Test ID:** TC-DETAIL-012
**Priority:** P1

**Preconditions:** Project exists with at least one budget source

**Steps:**
1. Navigate to a project detail page in edit mode
2. Modify the name of an existing budget source
3. Modify the amount
4. Toggle to view mode

**Expected Result:**
- Modified name and amount are visible in view mode
- Total budget recalculates correctly

**Verification:** Snapshot + screenshot before/after modification.

---

### Test Case 10.3: Delete Budget Source

**Test ID:** TC-DETAIL-013
**Priority:** P1

**Preconditions:** Project exists with at least two budget sources

**Steps:**
1. Navigate to a project detail page in edit mode
2. Click the delete button on one budget source
3. Verify the row is removed
4. Toggle to view mode

**Expected Result:**
- Deleted source no longer appears
- Total budget updates accordingly
- Remaining sources are unaffected

**Verification:** Snapshot + screenshot before/after deletion.

---

## Area 11: Team Member Management

### Test Case 11.1: Add Team Member

**Test ID:** TC-DETAIL-014
**Priority:** P0

**Preconditions:** Project exists in edit mode

**Steps:**
1. Navigate to a project detail page in edit mode
2. Locate the "团队成员" or "战略团队" section
3. Click "添加成员" button
4. Fill in member name and role
5. Toggle to view mode

**Expected Result:**
- New member card appears with name, role, and generated avatar
- Member persists after toggling to view mode

**Verification:** Snapshot + screenshot of add flow.

---

### Test Case 11.2: Remove Team Member

**Test ID:** TC-DETAIL-015
**Priority:** P0

**Preconditions:** Project exists with at least two team members

**Steps:**
1. Navigate to a project detail page in edit mode
2. Locate the close (×) button on a team member card
3. Click the close button
4. Verify the member card is removed
5. Toggle to view mode

**Expected Result:**
- Removed member no longer appears in view mode
- Remaining members are unaffected
- Close button is only visible in edit mode

**Verification:** Snapshot + screenshot before/after removal.

---

## Area 12: Status Persistence

### Test Case 12.1: Status Change Persists After Reload

**Test ID:** TC-DASH-006
**Priority:** P0

**Preconditions:** Dev server running, at least one project exists

**Steps:**
1. Navigate to `http://localhost:5173` (dashboard)
2. Note the current status of a project
3. Change the project's status via the dropdown (e.g., 进行中 → 暂停中)
4. Refresh the page
5. Verify the status shown after reload

**Expected Result:**
- After page refresh, the changed status persists
- Status dot color matches the persisted status
- Status dropdown shows the correct current value

**Verification:** Snapshot before change + after reload.

---

## Area 13: Business Role in Strategic Team

### Test Case 13.1: Business Role Display in Strategic Team

**Test ID:** TC-DETAIL-016
**Priority:** P1

**Preconditions:** Project exists with team members including one with role "业务责任人"

**Steps:**
1. Navigate to a project detail page
2. Locate the "战略团队" section
3. Inspect the roles displayed for team members

**Expected Result:**
- Team member with role "业务责任人" is displayed
- The role label is clearly shown on the member card
- Multiple team members with different roles (开发责任人, 业务责任人, etc.) are all visible

**Verification:** Snapshot + screenshot.
