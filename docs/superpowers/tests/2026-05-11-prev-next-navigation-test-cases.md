# Prev/Next Navigation E2E Test Cases

## Test Case 1: Navigate to Project from Dashboard with Filter Applied

**Test ID:** TC-001
**Priority:** P0
**Preconditions:** Dashboard has multiple projects loaded; at least 3 projects exist.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter (e.g., filter by status "ongoing") that results in 3+ projects
3. Click on the second project in the filtered list
4. Take snapshot of the page

### Expected Result
- ProjectDetail page loads
- PrevNextNav bar is visible at bottom
- Navigation counter shows correct position (e.g., "2 / 3")
- Both Prev and Next buttons are enabled (if not at first/last)

### Verification Method
Snapshot of ProjectDetail page with PrevNextNav visible

---

## Test Case 2: Click Next Button Navigates to Next Project

**Test ID:** TC-002
**Priority:** P0
**Preconditions:** Dashboard has projects loaded; user navigates to a project that is NOT the last in filtered list.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the first project in the filtered list
4. Note the current project ID
5. Click the "Next →" button
6. Take snapshot

### Expected Result
- URL changes to `/project/{nextId}`
- New project detail page loads
- Counter updates to next position (e.g., "2 / 3")

### Verification Method
Snapshot of the navigated-to project detail page

---

## Test Case 3: Click Prev Button Navigates to Previous Project

**Test ID:** TC-003
**Priority:** P0
**Preconditions:** Dashboard has projects loaded; user navigates to a project that is NOT the first in filtered list.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the second project in the filtered list
4. Note the current project ID
5. Click the "← Prev" button
6. Take snapshot

### Expected Result
- URL changes to `/project/{prevId}`
- New project detail page loads
- Counter updates to previous position (e.g., "1 / 3")

### Verification Method
Snapshot of the navigated-to project detail page

---

## Test Case 4: Keyboard Shortcut Alt+Right Arrow Navigates Next

**Test ID:** TC-004
**Priority:** P0
**Preconditions:** User is on ProjectDetail page that is NOT the last in filtered list.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the first project in the filtered list
4. Press `Alt+→` (Alt and right arrow key)
5. Take snapshot

### Expected Result
- URL changes to `/project/{nextId}`
- Page navigates to the next project

### Verification Method
Snapshot of the navigated-to project detail page

---

## Test Case 5: Keyboard Shortcut Alt+Left Arrow Navigates Previous

**Test ID:** TC-005
**Priority:** P0
**Preconditions:** User is on ProjectDetail page that is NOT the first in filtered list.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the second project in the filtered list
4. Press `Alt+←` (Alt and left arrow key)
5. Take snapshot

### Expected Result
- URL changes to `/project/{prevId}`
- Page navigates to the previous project

### Verification Method
Snapshot of the navigated-to project detail page

---

## Test Case 6: First Project in List Has Prev Button Disabled

**Test ID:** TC-006
**Priority:** P1
**Preconditions:** Dashboard has projects loaded; filtered list has at least 2 projects.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the first project in the filtered list
4. Take snapshot focusing on the PrevNextNav bar

### Expected Result
- "← Prev" button is disabled (opacity ~0.4, cursor: not-allowed)
- "Next →" button is enabled
- Counter shows "1 / N"

### Verification Method
Snapshot showing disabled Prev button state

---

## Test Case 7: Last Project in List Has Next Button Disabled

**Test ID:** TC-007
**Priority:** P1
**Preconditions:** Dashboard has projects loaded; filtered list has at least 2 projects.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the last project in the filtered list
4. Take snapshot focusing on the PrevNextNav bar

### Expected Result
- "← Prev" button is enabled
- "Next →" button is disabled (opacity ~0.4, cursor: not-allowed)
- Counter shows "N / N"

### Verification Method
Snapshot showing disabled Next button state

---

## Test Case 8: Single Project Disables Both Buttons

**Test ID:** TC-008
**Priority:** P1
**Preconditions:** Dashboard has projects loaded; filtered list shows exactly 1 project.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter that results in exactly 1 project
3. Click on that single project
4. Take snapshot focusing on the PrevNextNav bar

### Expected Result
- Both "← Prev" and "Next →" buttons are disabled
- Counter shows "1 / 1"

### Verification Method
Snapshot showing both buttons disabled

---

## Test Case 9: Direct URL Access Disables Both Buttons

**Test ID:** TC-009
**Priority:** P1
**Preconditions:** User directly accesses a project URL without going through Dashboard.

### Steps
1. Navigate directly to `http://localhost:5173/project/{someProjectId}` (bypassing Dashboard)
2. Wait for page to load
3. Take snapshot focusing on the PrevNextNav bar

### Expected Result
- Both "← Prev" and "Next →" buttons are disabled
- No filtered list available for navigation

### Verification Method
Snapshot showing both buttons disabled

---

## Test Case 10: Empty Filtered List Disables Both Buttons

**Test ID:** TC-010
**Priority:** P1
**Preconditions:** Dashboard has projects loaded; user applies a filter that results in 0 projects.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter that results in zero matching projects (e.g., invalid status value)
3. Attempt to click on any project (should not be possible)
4. Navigate directly to any project URL
5. Take snapshot focusing on the PrevNextNav bar

### Expected Result
- Both "← Prev" and "Next →" buttons are disabled
- Counter shows "0 / 0" or is hidden

### Verification Method
Snapshot showing both buttons disabled

---

## Test Case 11: Keyboard Shortcuts Do Not Fire When Buttons Disabled

**Test ID:** TC-011
**Priority:** P2
**Preconditions:** User is on first project with Prev disabled, OR last project with Next disabled.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing 3+ projects
3. Click on the first project (Prev is disabled)
4. Press `Alt+←` multiple times
5. Verify URL has not changed
6. Press `Alt+→` to navigate forward
7. Now on last project, press `Alt+→` multiple times
8. Verify URL has not changed

### Expected Result
- When at first project, `Alt+←` does not navigate
- When at last project, `Alt+→` does not navigate
- URL remains stable

### Verification Method
Console check or URL verification after each key press

---

## Test Case 12: Navigation Counter Shows Correct Position

**Test ID:** TC-012
**Priority:** P1
**Preconditions:** Dashboard has 5+ projects loaded with consistent filter.

### Steps
1. Navigate to `http://localhost:5173/`
2. Apply a filter showing exactly 5 projects
3. Click on the third project in the filtered list
4. Verify counter shows "3 / 5"
5. Click "Next →" button
6. Verify counter shows "4 / 5"
7. Click "Next →" button again
8. Verify counter shows "5 / 5"

### Expected Result
- Counter always reflects current position in filtered list
- Format is always "currentIndex / total"

### Verification Method
Snapshot at each step showing counter value
