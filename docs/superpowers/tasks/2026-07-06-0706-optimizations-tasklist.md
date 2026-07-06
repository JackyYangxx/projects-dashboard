# 0706 Optimizations Task List

**Spec:** `docs/superpowers/specs/2026-07-06-0706-optimizations-design.md`
**Generated:** 2026-07-06T20:50:00+08:00
**Total Tasks:** 7

---

### Task 1: Run TypeScript type checking

**Files:**
- All modified files in working tree

**Acceptance Criteria:**
1. `npx tsc --noEmit` exits with code 0
2. No type errors in any file

**Verification Command:** `npx tsc --noEmit`

---

### Task 2: Run Vitest unit tests

**Files:**
- `src/data/__tests__/seedData.test.ts`
- `src/__tests__/projectTypes.test.ts`
- All other unit test files

**Acceptance Criteria:**
1. All Vitest tests pass (currently ~148 tests)
2. seedData test verifies single seed project with `code: 'REPO-001'`

**Verification Command:** `npx vitest run`

---

### Task 3: Write E2E test TC-001 -- read-only repo code badge

**Files:**
- Modify: `tests/e2e_dashboard.py`

**Acceptance Criteria:**
1. New test function `test_repo_code_badge_readonly` added to test list
2. Navigates to project detail page in read-only mode
3. Verifies `REPO-001` badge text is visible in the repository section
4. PASS assertion when badge is found, SKIP if no project exists

**Verification Command:** `python tests/e2e_dashboard.py`

---

### Task 4: Write E2E test TC-002 -- edit mode repo code input

**Files:**
- Modify: `tests/e2e_dashboard.py`

**Acceptance Criteria:**
1. New test function `test_repo_code_edit_mode` added to test list
2. Enters edit mode on project detail, locates repo code input (placeholder="编码")
3. Types a new code value, verifies input retains the value after blur
4. PASS assertion confirming edit flow works

**Verification Command:** `python tests/e2e_dashboard.py`

---

### Task 5: Write E2E test TC-003 -- project form repo code field

**Files:**
- Modify: `tests/e2e_dashboard.py`

**Acceptance Criteria:**
1. New test function `test_project_form_repo_code_field` added to test list
2. Navigates to `/project/new`
3. Verifies "代码仓编码" label/input exists with placeholder "如 REPO-001"
4. Verifies code field appears before "代码仓" URL field in DOM order
5. PASS assertion confirming field renders correctly

**Verification Command:** `python tests/e2e_dashboard.py`

---

### Task 6: Write E2E test TC-004 -- project selector repo code badge

**Files:**
- Modify: `tests/e2e_dashboard.py`

**Acceptance Criteria:**
1. New test function `test_project_selector_repo_code_badge` added to test list
2. Navigates to code-review page where ProjectSelector renders
3. Verifies `REPO-001` badge text is visible in the repository column
4. PASS assertion confirming code badge renders in selector

**Verification Command:** `python tests/e2e_dashboard.py`

---

### Task 7: Full E2E suite + console error check + git commit

**Files:**
- All modified files in working tree

**Acceptance Criteria:**
1. Full E2E test suite runs: all tests pass (58+ tests, including TC-001 through TC-004)
2. Console: zero console errors across all pages (`CONSOLE_ERRORS` count = 0)
3. `git add` all changed files and `git commit` with conventional commit message describing the repository code feature
4. Git status clean after commit

**Verification Command:** `python tests/e2e_dashboard.py`
