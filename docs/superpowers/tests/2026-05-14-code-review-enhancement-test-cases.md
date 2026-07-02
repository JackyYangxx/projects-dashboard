# E2E Test Cases: AI Code Review Enhancement

**Spec:** `docs/superpowers/specs/2026-05-14-code-review-enhancement-design.md`
**Written:** 2026-05-14T22:30:00+08:00
**Total Cases:** 23

---

## Test Case 1: Config Section Collapsible

**Test ID:** TC-001
**Priority:** P1
**Preconditions:** User is on CodeReview page (`/code-review`)

### Steps

1. Navigate to `/code-review`
2. Locate the config section header "LLM / MCP / Skill 配置"
3. Verify the expand icon shows `expand_less` (expanded state)
4. Click the config section header to collapse
5. Verify the three config panels (LLM, MCP, Skill) are no longer visible

### Expected Result

Config section collapses when clicked, hiding all three config panels. Clicking again expands to show panels.

### Verification Method

Snapshot before and after clicking to verify panel visibility

---

## Test Case 2: LLM Config Panel - Add New Config

**Test ID:** TC-002
**Priority:** P1
**Preconditions:** User is on CodeReview page, config section is expanded

### Steps

1. Navigate to `/code-review`
2. Locate LLM Config panel
3. Click "+ 新增" button
4. Fill in model name "test-model"
5. Fill in model URL "https://api.test.com/v1/messages"
6. Fill in API Key "test-api-key-123"
7. Click "保存" button

### Expected Result

New LLM config appears in the list with checkbox checked (enabled by default)

### Verification Method

Snapshot of LLM config list after adding

---

## Test Case 3: LLM Config Panel - Test Connection

**Test ID:** TC-003
**Priority:** P2
**Preconditions:** User is on CodeReview page, config section is expanded

### Steps

1. Navigate to `/code-review`
2. Locate LLM Config panel
3. Click "+ 新增" button
4. Fill in model URL "https://api.test.com/v1/messages"
5. Fill in API Key "test-api-key-123"
6. Click "测试连接" button
7. Wait for result

### Expected Result

Test result displays success (green) or failure (red) message below the button

### Verification Method

Snapshot of test result message

---

## Test Case 4: LLM Config Panel - Enable/Disable

**Test ID:** TC-004
**Priority:** P2
**Preconditions:** At least one LLM config exists

### Steps

1. Navigate to `/code-review`
2. Locate existing LLM config in list
3. Uncheck the checkbox for that config
4. Verify checkbox becomes unchecked

### Expected Result

Checkbox toggles, config enabled state changes

### Verification Method

Snapshot of checkbox state before and after

---

## Test Case 5: LLM Config Panel - Remove Config

**Test ID:** TC-005
**Priority:** P2
**Preconditions:** At least one LLM config exists

### Steps

1. Navigate to `/code-review`
2. Locate existing LLM config in list
3. Click "删除" button

### Expected Result

Config is removed from the list immediately

### Verification Method

Snapshot of list before and after removal

---

## Test Case 6: MCP Config Panel - JSON Paste with Valid Config

**Test ID:** TC-006
**Priority:** P1
**Preconditions:** User is on CodeReview page, config section is expanded

### Steps

1. Navigate to `/code-review`
2. Locate MCP Config panel
3. Paste valid JSON:
```json
{
  "name": "Test GitLab MCP",
  "endpoint": "https://git.test.com/api/mcp",
  "authHeader": "Bearer test-token",
  "tools": ["listMRs", "getMRDetails"]
}
```
4. Wait for parsing to complete

### Expected Result

Config is parsed successfully, no error message shown, name "Test GitLab MCP" appears

### Verification Method

Snapshot of parsed MCP config display

---

## Test Case 7: MCP Config Panel - JSON Paste with Invalid Config

**Test ID:** TC-007
**Priority:** P1
**Preconditions:** User is on CodeReview page, config section is expanded

### Steps

1. Navigate to `/code-review`
2. Locate MCP Config panel
3. Paste invalid JSON: `{ invalid json }`
4. Wait for error display

### Expected Result

Error message displayed indicating JSON parse failure

### Verification Method

Snapshot of error message display

---

## Test Case 8: Skill Panel - Upload Skill

**Test ID:** TC-008
**Priority:** P2
**Preconditions:** User is on CodeReview page, config section is expanded

### Steps

1. Navigate to `/code-review`
2. Locate Skill panel
3. Click "+ 上传" button
4. Fill in name "Test Skill"
5. Fill in description "A test skill"
6. Fill in content "Test prompt content"
7. Click "保存" button

### Expected Result

New skill appears in list with checkbox checked (enabled)

### Verification Method

Snapshot of skill list after adding

---

## Test Case 9: Project Selection - Checkbox Table

**Test ID:** TC-009
**Priority:** P0
**Preconditions:** User is on CodeReview page, at least 3 projects exist in database

### Steps

1. Navigate to `/code-review`
2. Locate project selection table
3. Verify columns: 全选, 项目名称, 产品线, 状态, 仓库地址
4. Click checkbox for first project
5. Verify checkbox becomes checked
6. Click checkbox for second project

### Expected Result

Individual project checkboxes can be toggled independently

### Verification Method

Snapshot of table showing selected projects

---

## Test Case 10: Project Selection - Select All

**Test ID:** TC-010
**Priority:** P0
**Preconditions:** User is on CodeReview page, multiple projects exist

### Steps

1. Navigate to `/code-review`
2. Locate "全选" checkbox in table header
3. Click "全选" checkbox
4. Verify all project checkboxes become checked
5. Verify "全选" checkbox is fully checked (not indeterminate)

### Expected Result

All projects selected, "全选" shows fully checked state

### Verification Method

Snapshot of table with all projects selected

---

## Test Case 11: Project Selection - Deselect All

**Test ID:** TC-011
**Priority:** P0
**Preconditions:** All projects are currently selected

### Steps

1. Navigate to `/code-review`
2. Click "全选" checkbox to select all
3. Click "全选" checkbox again to deselect

### Expected Result

All checkboxes become unchecked, "全选" is also unchecked

### Verification Method

Snapshot of table with all deselected

---

## Test Case 12: Start Review Button - Disabled When No Selection

**Test ID:** TC-012
**Priority:** P0
**Preconditions:** User is on CodeReview page, no projects selected

### Steps

1. Navigate to `/code-review`
2. Verify no projects are selected
3. Locate "开始评审" button
4. Verify button is disabled

### Expected Result

"开始评审" button is visually disabled (opacity 0.5) and not clickable

### Verification Method

Snapshot of disabled button state

---

## Test Case 13: Start Review Button - Enabled When Projects Selected

**Test ID:** TC-013
**Priority:** P0
**Preconditions:** User is on CodeReview page

### Steps

1. Navigate to `/code-review`
2. Select at least one project
3. Locate "开始评审" button
4. Verify button is enabled

### Expected Result

"开始评审" button becomes enabled (full opacity) and clickable

### Verification Method

Snapshot of enabled button state

---

## Test Case 14: Review Progress Display

**Test ID:** TC-014
**Priority:** P0
**Preconditions:** Review is in progress (simulated or actual)

### Steps

1. Navigate to `/code-review`
2. Select one or more projects
3. Click "开始评审"
4. Observe the review progress area

### Expected Result

Review progress area shows:
- Current project name
- Current MR title being reviewed
- Progress percentage with visual bar
- Completed count / total count (e.g., "已完成: 2/5 MR")

### Verification Method

Snapshot of review progress display

---

## Test Case 15: MR Review Results Tabs

**Test ID:** TC-015
**Priority:** P0
**Preconditions:** At least one MR has been reviewed with issues

### Steps

1. Navigate to `/code-review`
2. Locate "评审结果" section (below review progress)
3. Verify tabs display project names with issue counts (e.g., [项目A (3)])
4. Click on a project tab
5. Verify issue list shows for that project

### Expected Result

Tabs show issue counts per project, clicking tab switches displayed issues

### Verification Method

Snapshot of tabs and issue list

---

## Test Case 16: Issue Display with Severity and View Online

**Test ID:** TC-016
**Priority:** P0
**Preconditions:** MR review results exist with issues

### Steps

1. Navigate to `/code-review`
2. Locate issue list (inside selected project tab)
3. Verify issues show:
   - Severity indicator (red=critical, yellow=warning)
   - MR title
   - Issue title and description
   - "查看线上" button/link
4. Click "查看线上" button

### Expected Result

Issue displays correctly with all fields, and clicking "查看线上" opens MR URL in new browser tab

### Verification Method

Snapshot of issue display; verify new tab opened with correct URL

---

## Test Case 17: Filter Issues by Severity

**Test ID:** TC-017
**Priority:** P1
**Preconditions:** MR review results exist with mixed severity issues

### Steps

1. Navigate to `/code-review`
2. Locate severity filter buttons: [全部] [严重] [警告] [建议]
3. Verify "全部" is selected by default
4. Click "严重" filter
5. Verify only critical severity issues are shown
6. Click "警告" filter
7. Verify only warning severity issues are shown

### Expected Result

Filter buttons correctly filter issue list by severity

### Verification Method

Snapshot of filtered issue list for each severity level

---

## Test Case 18: Export to Excel

**Test ID:** TC-018
**Priority:** P0
**Preconditions:** At least one MR has been reviewed with issues

### Steps

1. Navigate to `/code-review`
2. Locate "导出 Excel" button in评审结果 section
3. Click "导出 Excel" button
4. Observe download

### Expected Result

Excel file downloads with columns: 项目名称, MR链接, MR标题, 问题标题, 严重程度, 问题描述, 评审时间

### Verification Method

Check downloaded file exists and contains expected data

---

## Test Case 19: Clear Data - Confirmation Modal

**Test ID:** TC-019
**Priority:** P1
**Preconditions:** MR review results exist

### Steps

1. Navigate to `/code-review`
2. Locate "清理数据" button
3. Click "清理数据" button
4. Observe confirmation modal

### Expected Result

Modal appears with:
- Title "确认清理"
- Message "清理前会先导出 Excel，确定要清理吗？"
- "取消" and "确认清理" buttons

### Verification Method

Snapshot of confirmation modal

---

## Test Case 20: Clear Data - Cancel Action

**Test ID:** TC-020
**Priority:** P1
**Preconditions:** Confirmation modal is displayed

### Steps

1. Navigate to `/code-review`
2. Click "清理数据" to show modal
3. Click "取消" button
4. Verify modal closes

### Expected Result

Modal closes, no data is deleted

### Verification Method

Snapshot of modal closed state, verify data still exists

---

## Test Case 21: Clear Data - Confirm Action

**Test ID:** TC-021
**Priority:** P1
**Preconditions:** Confirmation modal is displayed, review data exists

### Steps

1. Navigate to `/code-review`
2. Click "清理数据" to show modal
3. Click "确认清理" button
4. Verify modal closes

### Expected Result

Excel is exported, then data is cleared, review results section disappears

### Verification Method

Snapshot after clearing, verify review results no longer displayed

---

## Test Case 22: Clear Data Button Disabled When No Data

**Test ID:** TC-022
**Priority:** P2
**Preconditions:** No review results exist

### Steps

1. Navigate to `/code-review`
2. Verify no review results section is visible
3. Locate "清理数据" button (should not be visible or should be disabled)

### Expected Result

"清理数据" button is not visible when no data exists

### Verification Method

Snapshot showing button is not visible/disabled

---

## Test Case 23: Export Button Disabled When No Data

**Test ID:** TC-023
**Priority:** P2
**Preconditions:** No review results exist

### Steps

1. Navigate to `/code-review`
2. Verify no review results section is visible
3. Locate "导出 Excel" button (should not be visible or should be disabled)

### Expected Result

"导出 Excel" button is not visible when no data exists

### Verification Method

Snapshot showing button is not visible/disabled