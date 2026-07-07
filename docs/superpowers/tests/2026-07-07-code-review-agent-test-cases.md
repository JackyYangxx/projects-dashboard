# E2E Test Cases: Code Review Agent

**Spec:** `docs/superpowers/specs/2026-07-07-code-review-agent-design.md`
**Plan:** `docs/superpowers/plans/2026-07-07-code-review-agent-plan.md`
**Written:** 2026-07-07T10:00:00+08:00
**Total Cases:** 57

> All tests use `MockProvider` (per spec §四 LLM Provider 抽象) since real API keys are unavailable.
> Tests run against `npm run dev` (Vite, http://localhost:5173) for browser-level verification, unless explicitly requiring Electron features (tray, node-cron, IPC).
> Each case assumes the dev server / Electron app is already running. Use `mcp__chrome-devtools__*` tools for browser verification.
> Priority: P0 = critical path; P1 = core functionality; P2 = edge cases / nice-to-have.

---

## Section A: Architecture — Web Worker Setup (Spec §一)

### Test Case A1: Agent Web Worker boots on app start

**Test ID:** TC-AG-001
**Priority:** P0
**Preconditions:** LLM configured with `MockProvider` (api_type=mock), no in-progress review

**Steps:**
1. Launch `npm run dev`
2. Open `http://localhost:5173` in Chrome via `mcp__chrome-devtools__new_page`
3. Open DevTools → Sources → Workers (or use `mcp__chrome-devtools__list_console_messages`)
4. Observe console for worker initialization logs

**Expected Result:**
- `agentWorkerManager` singleton initialized in `src/main.tsx`
- `src/agents/worker.ts` Web Worker is running (visible in DevTools → Application → Workers)
- Console log: `[agent] worker initialized` (or similar)
- No console errors

**Verification:** `mcp__chrome-devtools__list_console_messages` (filter `error`)

---

### Test Case A2: Worker persists across route changes

**Test ID:** TC-AG-002
**Priority:** P1
**Preconditions:** App running, agent worker initialized

**Steps:**
1. Navigate to `http://localhost:5173/#/code-review`
2. Navigate to `http://localhost:5173/#/` (dashboard)
3. Navigate back to `http://localhost:5173/#/code-review`
4. Verify worker is still alive in DevTools

**Expected Result:**
- Worker instance ID remains the same across route changes (worker is bound to renderer, not React component lifecycle)
- No duplicate worker instances created

**Verification:** `mcp__chrome-devtools__evaluate_script` to confirm singleton identity

---

### Test Case A3: Main Process integrates node-cron scheduler

**Test ID:** TC-AG-003
**Priority:** P0
**Preconditions:** `npm run electron:dev` running, `electron/main.ts` has Scheduler module

**Steps:**
1. Start Electron app via `npm run electron:dev`
2. Wait for main window to load
3. Inspect main process logs (terminal output where `npm run electron:dev` is running)
4. Verify `Scheduler` module initialized and `node-cron` task registered

**Expected Result:**
- Main process logs show: `[scheduler] cron task registered: <default cron expression>`
- No crash on initialization

**Verification:** Terminal output inspection (manual check)

---

## Section B: IPC Design (Spec §二)

### Test Case B1: Renderer receives agent:schedule-tick IPC

**Test ID:** TC-IPC-001
**Priority:** P0
**Preconditions:** Electron app running, scheduler configured with short cron (e.g., `*/1 * * * *`)

**Steps:**
1. In Settings page, set cron expression to `*/1 * * * *` (every minute)
2. Wait 60–90 seconds
3. Observe console in renderer

**Expected Result:**
- Console log appears: `[agent] received schedule tick at <timestamp>`
- `agent:schedule-tick` IPC payload `{ triggerTime: <ISO> }` is delivered
- If a task is already running, scheduler skips and logs "上次扫描仍在进行"

**Verification:** `mcp__chrome-devtools__list_console_messages`

---

### Test Case B2: Main → Renderer agent:schedule-update on config change

**Test ID:** TC-IPC-002
**Priority:** P1
**Preconditions:** Electron app running, Settings page accessible

**Steps:**
1. Navigate to Settings page (or wherever ScheduleConfig is exposed)
2. Change cron expression from `0 9 * * 1-5` to `0 10 * * 1-5`
3. Save the change
4. Check renderer console

**Expected Result:**
- IPC `agent:schedule-update` sent from main → renderer with `{ cronExpression: "0 10 * * 1-5", nextRun: <ISO> }`
- UI updates "下次扫描" label to reflect new schedule

**Verification:** `mcp__chrome-devtools__list_console_messages` (look for `schedule-update` log)

---

### Test Case B3: postMessage discriminated unions — agent:start

**Test ID:** TC-IPC-003
**Priority:** P1
**Preconditions:** LLM configured with MockProvider, at least one project exists with mock MR data

**Steps:**
1. Navigate to CodeReview page (`/#/code-review`)
2. Select a project and click "开始评审"
3. Check DevTools → Network → WS / Messages from worker
4. Verify the dispatched message matches `WorkerInMessage` type

**Expected Result:**
- `agent:start` message dispatched with payload `{ taskId, projectId, mrIds: string[] }`
- Worker receives message and responds with `agent:phase-change` (pending → preparing)

**Verification:** `mcp__chrome-devtools__evaluate_script` → inspect dev hook for dispatched messages

---

### Test Case B4: Transactional DB batch — agent:db-batch

**Test ID:** TC-IPC-004
**Priority:** P0
**Preconditions:** Mock LLM configured, manual review triggered

**Steps:**
1. Trigger a manual review from CodeReview page
2. Observe DB operations in DevTools
3. Verify that `review_tasks` row + N `mr_review_records` rows are inserted in one transaction

**Expected Result:**
- A single `BEGIN...COMMIT` transaction visible in DB trace
- If Worker crashes mid-transaction, no orphan `mr_review_records` exist (atomicity guaranteed)

**Verification:** `mcp__chrome-devtools__evaluate_script` → query `agent_reports` count vs `review_tasks` count should be consistent

---

### Test Case B5: Main process window-all-closed hides window (all platforms)

**Test ID:** TC-IPC-005
**Priority:** P1
**Preconditions:** Electron app running

**Steps:**
1. Click the window close button (X) in main window
2. Observe system tray
3. Verify tray icon appears with menu: "显示主窗口 / 下次扫描: <date> / 立即扫描 / 退出"
4. Click "显示主窗口" to restore

**Expected Result:**
- Window closes but app stays alive in tray (not full quit) on both Windows and macOS
- Tray menu items all functional
- "退出" truly exits the process

**Verification:** Manual UI inspection + tray interaction

---

## Section C: Database (Spec §三)

### Test Case C1: New tables created on first launch

**Test ID:** TC-DB-001
**Priority:** P0
**Preconditions:** Fresh app launch (or DB file deleted), LLM configured

**Steps:**
1. Delete or rename `projects-dashboard.db` in user data directory
2. Launch app
3. After `initDatabase()` completes, query DB schema via `evaluate_script`

**Expected Result:**
- Tables exist: `agent_rules`, `agent_memories`, `review_tasks`, `agent_reports`
- All existing tables still present (`projects`, `mr_review_records`, etc.)

**Verification:** `mcp__chrome-devtools__evaluate_script` to list SQLite tables

---

### Test Case C2: mr_review_records migrated with task_id column

**Test ID:** TC-DB-002
**Priority:** P0
**Preconditions:** Existing DB file from pre-Agent version

**Steps:**
1. Start with DB file that has `mr_review_records` without `task_id`
2. Launch app
3. Verify migration applied

**Expected Result:**
- `mr_review_records` table now has `task_id TEXT` column
- Existing rows have `task_id = NULL`
- New rows (after triggering review) have non-null `task_id` matching `review_tasks.id`

**Verification:** `mcp__chrome-devtools__evaluate_script` to inspect table schema

---

### Test Case C3: 16 builtin rules seeded into agent_rules

**Test ID:** TC-DB-003
**Priority:** P0
**Preconditions:** Fresh DB or post-migration

**Steps:**
1. After app launches and DB initialized, query `agent_rules`

**Expected Result:**
- Exactly 16 rows with `is_builtin = 1`
- Rules cover categories: 通用 (5), PC Web (3), 大屏 (3), 移动 (3), 安全 (2) — totaling 16
- All rules have `enabled = 1` by default
- No XSS-specific duplicate rule (the `避免 dangerouslySetInnerHTML/innerHTML` rule in 通用 already covers XSS)

**Verification:** `evaluate_script` → count rows where `is_builtin=1` should equal 16

---

### Test Case C4: review_tasks status state machine transitions

**Test ID:** TC-DB-004
**Priority:** P0
**Preconditions:** Mock LLM configured, manual review triggered

**Steps:**
1. Trigger manual review on a project
2. Watch `review_tasks.status` field evolve in real time via `evaluate_script` polling
3. Observe transitions: pending → preparing → analyzing → locating → reflecting → completed

**Expected Result:**
- Status transitions in order: pending → preparing → analyzing → locating → reflecting → completed
- Each phase persists to DB before next transition
- After completion, status remains `completed` (terminal state)

**Verification:** Repeated `evaluate_script` polling every 500ms during a run

---

### Test Case C5: Pause and resume transitions

**Test ID:** TC-DB-005
**Priority:** P1
**Preconditions:** Mock LLM configured with slow response, review in progress

**Steps:**
1. Trigger review on a project with many mock MRs
2. While `status = analyzing`, click "暂停" button
3. Verify status changes to `paused`
4. Click "继续" button
5. Verify status transitions `paused` → `analyzing` (resume)

**Expected Result:**
- `paused` is a stable state (Worker suspends between LLM calls)
- On resume, Worker continues from where it left off (no re-processing of completed MRs)

**Verification:** `evaluate_script` → query `review_tasks.status` and `progress`

---

### Test Case C6: Cancel sets terminal status

**Test ID:** TC-DB-006
**Priority:** P1
**Preconditions:** Review in progress

**Steps:**
1. Trigger review
2. Click "取消" button mid-analysis
3. Verify status

**Expected Result:**
- Status changes to `cancelled` (terminal)
- Already-completed MRs persist in `mr_review_records`
- In-progress MR marked with appropriate status

**Verification:** `evaluate_script` → query latest `review_tasks.status` and `error_message`

---

## Section D: Agent Pipeline (Spec §四)

### Test Case D1: Pipeline 4-stage execution produces issues

**Test ID:** TC-PIPE-001
**Priority:** P0
**Preconditions:** Mock LLM configured to return canned issues, at least one MR with known code patterns

**Steps:**
1. Trigger review via CodeReview page
2. Open Agent Progress component
3. Observe phase transitions in real time

**Expected Result:**
- Phases execute in order: Prepare → Analyze → Locate → Reflect
- Progress bar advances 0% → 100%
- At end, issues visible in `mr_review_records.issues` (JSON)
- Each issue has: severity, title, description, filePath, lineNumber, suggestion

**Verification:** Screenshot of progress UI + `evaluate_script` → query `mr_review_records.issues`

---

### Test Case D2: MockProvider returns canned responses

**Test ID:** TC-PIPE-002
**Priority:** P0
**Preconditions:** MockProvider configured (api_type=mock), review triggered

**Steps:**
1. Set LLM provider to MockProvider in Settings
2. Trigger review
3. Verify LLM calls don't hit external network (no fetch to api.openai.com etc.)
4. Verify issues are returned based on regex matching of mock patterns

**Expected Result:**
- No outbound HTTP requests to real LLM endpoints
- Issues generated by MockProvider's regex-based mock logic
- Pipeline completes successfully end-to-end

**Verification:** `mcp__chrome-devtools__list_network_requests` filtered by `xhr` — no external LLM calls

---

### Test Case D3: Concurrency control — single Agent instance

**Test ID:** TC-PIPE-003
**Priority:** P1
**Preconditions:** Long-running review in progress (simulate via slow mock)

**Steps:**
1. Start review on Project A (long-running)
2. While it's running, click "开始评审" on Project B
3. Observe UI behavior

**Expected Result:**
- Confirmation modal appears: "评审正在进行中，是否取消并重新开始？"
- Two options: cancel + start new, or wait
- Only one `review_tasks` row has `status IN (pending|preparing|analyzing|locating|reflecting|paused)` at any time

**Verification:** `evaluate_script` → count active review_tasks

---

### Test Case D4: Worker crash marks task as failed

**Test ID:** TC-PIPE-004
**Priority:** P1
**Preconditions:** Ability to inject Worker error (mock scenario via special test trigger)

**Steps:**
1. Inject a `postMessage` to Worker that causes an uncaught error
2. Observe `worker.onerror` handler activation
3. Check task status

**Expected Result:**
- `review_tasks.status = 'failed'`
- `error_message` column populated with stack trace / error description
- UI shows "评审异常中断，请重试"

**Verification:** `evaluate_script` → trigger worker error, check task status

---

### Test Case D5: LLM call timeout retries once

**Test ID:** TC-PIPE-005
**Priority:** P2
**Preconditions:** Mock provider with configurable timeout

**Steps:**
1. Configure mock to timeout on first call, succeed on second
2. Trigger review
3. Verify retry behavior

**Expected Result:**
- Worker retries LLM call once after timeout
- If second attempt succeeds, review continues normally
- If both fail, that MR group marked as failed, others continue

**Verification:** Console logs show retry attempts; task completes (some MRs may be marked failed)

---

## Section E: Token Budget (Spec §五)

### Test Case E1: Token estimation displays in progress

**Test ID:** TC-TOK-001
**Priority:** P1
**Preconditions:** Mock LLM configured, large diff in mock data (>50 files)

**Steps:**
1. Trigger review on project with large diff
2. Observe TokenBudget in Prepare stage

**Expected Result:**
- Token estimation reported (e.g., "Estimated: 45,000 tokens")
- If estimation > Available, file-splitting strategy triggered
- Progress UI shows token usage context

**Verification:** `evaluate_script` → inspect worker messages for token estimates

---

### Test Case E2: File-splitting when diff exceeds budget

**Test ID:** TC-TOK-002
**Priority:** P1
**Preconditions:** Mock diff totaling > 8.5K tokens (MaxTokens - reserved)

**Steps:**
1. Configure mock with 100 files
2. Trigger review
3. Observe Analyze stage behavior

**Expected Result:**
- Files split into multiple groups
- Each group processed concurrently (parallel LLM calls)
- Reflect stage merges all groups' results
- Total issues = sum of all groups' issues

**Verification:** Console logs show concurrent groups processed; final issue count matches

---

### Test Case E3: Large file truncation

**Test ID:** TC-TOK-003
**Priority:** P2
**Preconditions:** Mock with single file > Available × 80%

**Steps:**
1. Configure mock with 1 file of 100K characters
2. Trigger review
3. Observe handling

**Expected Result:**
- File marked as "过大跳过" in report
- Only grep-based rule check applied to this file (not LLM)
- Other files in diff reviewed normally

**Verification:** Issue list contains a note or warning for the large file

---

### Test Case E4: Memory compression at 60% MaxTokens

**Test ID:** TC-TOK-004
**Priority:** P2
**Preconditions:** Long multi-turn LLM conversation (simulate via mock with long context)

**Steps:**
1. Trigger review with mock that returns very long responses
2. Watch for compression trigger at 60% threshold
3. Observe intermediate context compression

**Expected Result:**
- At 60% MaxTokens, Compress Zone is summarized to structured XML
- Frozen Zone (system + rules) never compressed
- Active Zone (last 3 turns) preserved as-is
- Review completes without token overflow error

**Verification:** Console logs indicate compression event

---

## Section F: Rule System (Spec §六)

### Test Case F1: Built-in rules trigger matching issues

**Test ID:** TC-RULE-001
**Priority:** P0
**Preconditions:** Mock LLM with mock diff containing `dangerouslySetInnerHTML`

**Steps:**
1. Configure mock MR with file containing `dangerouslySetInnerHTML={{ __html: userInput }}`
2. Trigger review
3. Search for issues with rule "避免 dangerouslySetInnerHTML/innerHTML"

**Expected Result:**
- At least one critical-severity issue found
- Issue references the rule name
- Severity = critical per rule template

**Verification:** Filter issues by severity=critical; at least one matches

---

### Test Case F2: File pattern filtering excludes non-matching files

**Test ID:** TC-RULE-002
**Priority:** P1
**Preconditions:** Mock diff includes both `.tsx` and `.json` files; rule has `filePatterns: ["*.tsx", "*.jsx"]`

**Steps:**
1. Configure mock with multiple file types
2. Trigger review
3. Verify `.json` files not in scope of any issue

**Expected Result:**
- Issues only generated for files matching `*.tsx` or `*.jsx`
- `.json`, `.lock` files excluded from LLM review

**Verification:** All issue `filePath` values match rule's `filePatterns`

---

### Test Case F3: Two-layer priority — project rule overrides global

**Test ID:** TC-RULE-003
**Priority:** P1
**Preconditions:** Global rule "X" enabled; project-specific rule "X" with different `matchPatterns` created for Project A

**Steps:**
1. Create project-specific rule overriding global rule X
2. Trigger review on Project A
3. Verify which rule's `matchPatterns` were applied

**Expected Result:**
- Project rule X's `matchPatterns` used, not global rule X's
- first-match-wins priority applied
- UI shows project rule in scope

**Verification:** Issues generated match the project rule's pattern, not global

---

### Test Case F4: Disable rule via UI toggle

**Test ID:** TC-RULE-004
**Priority:** P1
**Preconditions:** Built-in rule exists and is enabled

**Steps:**
1. Navigate to Rule Management UI on CodeReview page
2. Toggle off a built-in rule (e.g., "避免 any 类型")
3. Trigger new review
4. Verify rule no longer applies

**Expected Result:**
- Built-in rule cannot be deleted (delete button disabled/hidden)
- Built-in rule can be toggled enabled/disabled
- After disable, issues of that rule type no longer generated
- DB row still exists with `enabled=0`

**Verification:** Toggle UI + new review run; no issues from disabled rule

---

### Test Case F5: Custom rule CRUD via UI

**Test ID:** TC-RULE-005
**Priority:** P1
**Preconditions:** Rule editor UI accessible

**Steps:**
1. Click "新建规则" in Rule Management
2. Fill form: name, description, filePatterns, matchPatterns, severity, scope
3. Save
4. Verify rule appears in list
5. Edit the rule, change severity
6. Save again
7. Delete the rule
8. Verify deletion

**Expected Result:**
- New rule appears in list with `is_builtin=0`
- Edit reflects in DB and UI
- Delete removes the rule (only non-builtin rules can be deleted)
- Validation: required fields enforced

**Verification:** `evaluate_script` → query `agent_rules` count before/after each operation

---

### Test Case F6: LLM semantic rule (no regex) handled correctly

**Test ID:** TC-RULE-006
**Priority:** P2
**Preconditions:** Mock LLM with capability to return issues for semantic rules like "useEffect 缺依赖"

**Steps:**
1. Configure mock MR with `useEffect(() => { ... }, [])` where deps array is empty
2. Trigger review
3. MockProvider (or LLM in real mode) returns issue for rule "useEffect 缺少依赖项或未清理"

**Expected Result:**
- Issue generated despite rule having no regex matchPatterns (semantic rule)
- Severity = warning per rule template

**Verification:** Issue found for semantic rule

---

## Section G: Memory System (Spec §七)

### Test Case G1: Memory written when same issue appears 3+ times

**Test ID:** TC-MEM-001
**Priority:** P1
**Preconditions:** Mock MR with 3+ instances of same issue category (e.g., "React Hooks")

**Steps:**
1. Trigger review
2. After review completes, query `agent_memories`

**Expected Result:**
- New `agent_memories` row with `type='pattern'`
- `category='React Hooks'`, `title` describes the pattern
- `project_id` matches reviewed project
- `occurrence_count >= 3`

**Verification:** `evaluate_script` → query `agent_memories WHERE type='pattern'`

---

### Test Case G2: Memory retrieved and injected into system prompt

**Test ID:** TC-MEM-002
**Priority:** P1
**Preconditions:** Pre-existing `agent_memories` rows for Project A

**Steps:**
1. Trigger review on Project A
2. Observe Prepare stage output
3. Verify memories are passed to Analyze stage

**Expected Result:**
- Top 5 memories (sorted by `confidence × occurrence_count`) injected into LLM system prompt
- Worker console shows `relevantMemories.length > 0` in context

**Verification:** `evaluate_script` → log PipelineContext.relevantMemories during review

---

### Test Case G3: Manual "mark as remembered" creates fix memory

**Test ID:** TC-MEM-003
**Priority:** P2
**Preconditions:** An issue visible in MR review detail

**Steps:**
1. Open MR review detail with issues
2. Click "值得记住" (or similar button) on an issue
3. Verify memory row created

**Expected Result:**
- `agent_memories` row with `type='fix'`, `title` = issue title, `content` = issue description + suggestion
- `source_review_id` references the originating review

**Verification:** `evaluate_script` → query `agent_memories WHERE type='fix'`

---

### Test Case G4: 90-day eviction removes stale memories

**Test ID:** TC-MEM-004
**Priority:** P2
**Preconditions:** Memory with `last_accessed_at` > 90 days ago

**Steps:**
1. Manually set `last_accessed_at` on a memory row to 91 days ago
2. Trigger eviction routine (manual trigger or scheduled)
3. Verify memory removed

**Expected Result:**
- Memory row deleted
- No impact on review pipeline

**Verification:** `evaluate_script` → query `agent_memories` count decreases by 1

---

### Test Case G5: 1000-limit eviction triggers 10% cleanup

**Test ID:** TC-MEM-005
**Priority:** P2
**Preconditions:** Memory table populated with 1000+ rows

**Steps:**
1. Insert 1050 memory rows with varying `confidence × occurrence_count`
2. Trigger eviction
3. Verify ~50 lowest-quality memories removed

**Expected Result:**
- Total memory count reduced to ~1000 (or eviction rounds continue until under threshold)
- Lowest `confidence × occurrence_count` rows removed first

**Verification:** Memory count after eviction

---

## Section H: Summary Report (Spec §八)

### Test Case H1: Manual report generation — basic structure

**Test ID:** TC-RPT-001
**Priority:** P0
**Preconditions:** At least one completed `review_task` with issues in DB

**Steps:**
1. Navigate to CodeReview page
2. Click "生成报告" button
3. Select "最近一周" and "全部项目"
4. Click "生成"
5. Verify report renders

**Expected Result:**
- Report contains 6 sections: 概览 / 严重度分布 / 规则分布 Top 10 / 项目分布 / 高频问题模式 / 建议
- Statistics reflect actual DB data
- `agent_reports` row created with `stats_json` populated

**Verification:** Screenshot of report + `evaluate_script` → query `agent_reports`

---

### Test Case H2: Excel export from report

**Test ID:** TC-RPT-002
**Priority:** P1
**Preconditions:** Report rendered

**Steps:**
1. Generate a report
2. Click "导出 Excel"
3. Verify file downloads

**Expected Result:**
- File downloads as `.xlsx`
- 3 sheets: "概览", "问题明细", "趋势"
- "问题明细" has columns: 项目, 文件, 行号, 严重度, 规则, 代码片段, 描述

**Verification:** Download inspector shows `.xlsx`; open with external tool to verify sheets

---

### Test Case H3: Report date range filtering

**Test ID:** TC-RPT-003
**Priority:** P1
**Preconditions:** Review tasks spread across different time periods

**Steps:**
1. Generate report with "最近一周" → verify only recent tasks counted
2. Generate report with "最近一月" → verify more tasks included
3. Generate report with custom date range → verify exact filtering

**Expected Result:**
- Each report's `stats_json` reflects only tasks within selected range
- `time_range_start` and `time_range_end` correctly set in `agent_reports` row

**Verification:** Compare stats between different date ranges

---

### Test Case H4: Top 10 rules ranking

**Test ID:** TC-RPT-004
**Priority:** P2
**Preconditions:** Multiple reviews with various rules triggered

**Steps:**
1. Generate report
2. Inspect "规则分布 Top 10" section

**Expected Result:**
- Rules ranked by occurrence count descending
- Top 10 only displayed (or fewer if <10 rules exist)
- "增长最快的规则" subsection shows recent growth rate

**Verification:** Compare rankings against raw data

---

## Section I: Visualization & Control (Spec §九)

### Test Case I1: Real-time progress updates

**Test ID:** TC-VIZ-001
**Priority:** P0
**Preconditions:** Mock LLM with timed delays, review in progress

**Steps:**
1. Trigger review
2. Open CodeReview page (or navigate to it during review)
3. Observe AgentProgress component

**Expected Result:**
- Progress bar updates smoothly (0% → 100%)
- Phase indicator shows current stage
- "当前文件" updates during Analyze stage
- "已发现: N 个问题" counter increments in real time
- Updates via `agent:progress` messages from Worker

**Verification:** Screenshot at multiple time points during review

---

### Test Case I2: Pause button suspends review

**Test ID:** TC-VIZ-002
**Priority:** P0
**Preconditions:** Review in analyzing phase with multiple MRs

**Steps:**
1. Trigger review
2. Wait for analyzing phase to start
3. Click "暂停" button
4. Wait 5 seconds
5. Observe no further progress

**Expected Result:**
- Worker completes current LLM call, then suspends
- Progress bar frozen at current %
- Status label changes to "已暂停"
- "继续" button replaces "暂停"

**Verification:** Console logs show worker paused; progress unchanged after 5s

---

### Test Case I3: Resume button continues from pause

**Test ID:** TC-VIZ-003
**Priority:** P0
**Preconditions:** Review in paused state

**Steps:**
1. Click "继续" button on paused review
2. Observe progress

**Expected Result:**
- Status changes back to `analyzing` (or current phase)
- Progress resumes from paused % (does NOT restart from 0)
- No re-processing of completed MRs

**Verification:** Progress continues monotonically; total issues count increases

---

### Test Case I4: Skip current MR button

**Test ID:** TC-VIZ-004
**Priority:** P1
**Preconditions:** Multi-MR review in progress

**Steps:**
1. Trigger review with 3+ MRs
2. Mid-progress, click "跳过当前MR"
3. Observe behavior

**Expected Result:**
- Current MR's analysis stops
- Already-found issues for this MR are preserved (saved to `mr_review_records`)
- Worker moves to next MR
- Current MR marked with skipped status

**Verification:** Total completed_mr_count increases; current file pointer moves to next MR

---

### Test Case I5: Cancel terminates review

**Test ID:** TC-VIZ-005
**Priority:** P0
**Preconditions:** Review in progress

**Steps:**
1. Trigger review
2. Click "取消" button
3. Verify termination

**Expected Result:**
- Worker stops processing new MRs
- Status = `cancelled` (terminal)
- Already-completed MR results preserved
- Progress UI hides or shows "已取消" state

**Verification:** `evaluate_script` → check `review_tasks.status = 'cancelled'`

---

### Test Case I6: Mid-task rule toggle

**Test ID:** TC-VIZ-006
**Priority:** P2
**Preconditions:** Review in analyzing phase

**Steps:**
1. Trigger review with multiple MRs
2. Mid-review, toggle off a rule from Rule Management
3. Observe Worker behavior

**Expected Result:**
- `agent:rule-toggle` message sent to Worker
- Worker updates internal rule list
- Current MR completes with old rule set; subsequent MRs use new rule set
- Rule list updates UI without page reload

**Verification:** Issues from new MRs don't match the disabled rule

---

### Test Case I7: Historical task list rendering

**Test ID:** TC-VIZ-007
**Priority:** P1
**Preconditions:** Multiple `review_tasks` rows in DB

**Steps:**
1. Navigate to CodeReview page
2. Scroll to historical task list
3. Inspect task list UI

**Expected Result:**
- All `review_tasks` rows displayed (paginated if many)
- Each row shows: 触发时间, 触发方式, 状态(彩色标签), MR数量, issue数量
- Click row → expand to show details (issues, summary)

**Verification:** Snapshot of historical list + click-to-expand interaction

---

## Section J: Trigger Mechanism (Spec §十)

### Test Case J1: CodeReview page — manual batch review trigger

**Test ID:** TC-TRIG-001
**Priority:** P0
**Preconditions:** At least one project with mock MR data

**Steps:**
1. Navigate to CodeReview page
2. Select project(s) from dropdown
3. Click "开始评审"
4. Observe task creation and worker start

**Expected Result:**
- `review_tasks` row created with `trigger_type='manual'`
- Worker starts processing
- AgentProgress component becomes visible

**Verification:** `evaluate_script` → query `review_tasks WHERE trigger_type='manual' ORDER BY created_at DESC LIMIT 1`

---

### Test Case J2: ProjectDetail page — single-project review trigger

**Test ID:** TC-TRIG-002
**Priority:** P1
**Preconditions:** ProjectDetail page has "代码评审" button

**Steps:**
1. Navigate to `/#/project/<id>` for a specific project
2. Click "代码评审" button on detail page
3. Observe review starts

**Expected Result:**
- Review triggered for the single project
- AgentProgress or status indicator shows review started
- Worker receives `agent:start` with single projectId

**Verification:** `evaluate_script` → query `review_tasks` filtered by project_id

---

### Test Case J3: Schedule configuration UI

**Test ID:** TC-TRIG-003
**Priority:** P1
**Preconditions:** Settings or Schedule page accessible

**Steps:**
1. Navigate to Schedule configuration
2. Verify default cron: each weekday 9:00
3. Modify to a near-future time (e.g., next minute from current time)
4. Save and verify persistence

**Expected Result:**
- Default cron expression visible: `0 9 * * 1-5`
- Quick-select options present (hourly, daily, weekly, custom)
- After save, configuration persists to electron-store
- Main process restarts node-cron with new expression

**Verification:** UI state + close/reopen app, verify config retained

---

### Test Case J4: Scheduled scan runs without user action

**Test ID:** TC-TRIG-004
**Priority:** P1
**Preconditions:** Cron set to `*/2 * * * *` (every 2 minutes), MockProvider configured

**Steps:**
1. Configure schedule to run every 2 minutes
2. Close the app window (tray mode)
3. Wait 3–4 minutes
4. Check `review_tasks` for new entries with `trigger_type='scheduled'`

**Expected Result:**
- Background scan triggered at scheduled time
- `review_tasks` row created with `trigger_type='scheduled'`
- Review completes even with window hidden
- Tray menu "下次扫描" updates to reflect next time

**Verification:** `evaluate_script` (if window restored) → query `review_tasks WHERE trigger_type='scheduled'`

---

### Test Case J5: Scheduled scan skips if previous still running

**Test ID:** TC-TRIG-005
**Priority:** P2
**Preconditions:** Long-running review in progress, schedule tick arrives

**Steps:**
1. Start long review (e.g., 10 mock MRs with slow response)
2. While running, trigger another scheduled tick (or wait for natural tick)
3. Observe behavior

**Expected Result:**
- Scheduler logs: "上次扫描仍在进行"
- No new `review_tasks` row created for this tick
- Original review continues uninterrupted

**Verification:** Console logs + task count unchanged

---

## Section K: Tech Stack & Worker Lifecycle (Spec §十一)

### Test Case K1: node-cron dependency installed

**Test ID:** TC-STK-001
**Priority:** P1
**Preconditions:** `package.json` modified per plan

**Steps:**
1. Open `package.json`
2. Verify `node-cron` listed in dependencies
3. Run `npm install` to confirm

**Expected Result:**
- `node-cron` in `dependencies` (not devDependencies)
- Version compatible with Electron's Node.js version

**Verification:** Inspect `package.json`

---

### Test Case K2: Worker singleton — only one instance

**Test ID:** TC-STK-002
**Priority:** P1
**Preconditions:** App running, multiple reviews triggered sequentially

**Steps:**
1. Trigger review A, complete it
2. Trigger review B
3. Verify same worker instance reused

**Expected Result:**
- `agentWorkerManager` exposes single worker instance
- No "Worker already exists" errors on subsequent triggers
- Worker persists across multiple reviews

**Verification:** `evaluate_script` → check that worker manager singleton identity is preserved

---

## Section L: Security (Spec §十三)

### Test Case L1: API key not exposed in plain text in renderer

**Test ID:** TC-SEC-001
**Priority:** P0
**Preconditions:** LLM configured with real-looking API key

**Steps:**
1. Configure LLM with api_key = "sk-test-12345"
2. Open DevTools → Network → filter `api_key` or check source
3. Verify key not visible in renderer process

**Expected Result:**
- API key stored in main process only (via electron-store / safeStorage)
- Renderer does not have direct access to raw key
- LLM calls proxied through main process IPC if key protection enabled

**Verification:** `evaluate_script` → search window object for key string "sk-test-12345" — should NOT find

---

### Test Case L2: MCP auth_header storage protection

**Test ID:** TC-SEC-002
**Priority:** P1
**Preconditions:** MCP service configured with auth_header

**Steps:**
1. Add MCP service with `auth_header = "Bearer abc123secret"`
2. Check renderer source / window object

**Expected Result:**
- Auth header not directly accessible to renderer
- MCP calls go through main process IPC bridge
- Token not visible in plain text via `evaluate_script`

**Verification:** `evaluate_script` → search for the secret string

---

## Section M: Cross-cutting / Integration

> Spec §十二 (Testing Strategy) describes the layered testing approach (unit + integration + E2E + MockProvider). This Phase 1 test plan covers E2E only; unit/integration tests are validated through `npx tsc --noEmit` clean compile (TC-INT-003). The MockProvider usage throughout Sections A–L exercises §十二 requirement that E2E runs without real LLM keys.

### Test Case M1: Existing legacy code review still functional

**Test ID:** TC-INT-001
**Priority:** P0
**Preconditions:** Agent deployed, but legacy `startBatchReview` still exists

**Steps:**
1. Trigger legacy code review path (if accessible)
2. Verify it still works without Agent Worker

**Expected Result:**
- Legacy review path coexists with Agent
- Both paths write to `mr_review_records`
- No conflicts between two paths

**Verification:** Run both paths in sequence, both produce issues

---

### Test Case M2: Agent Worker persists across soft navigation (no hard refresh)

**Test ID:** TC-INT-002
**Priority:** P1
**Preconditions:** Review in progress, app in dev server (no full reload)

**Steps:**
1. Trigger review
2. Use React Router navigation (e.g. click sidebar Dashboard then back to CodeReview)
3. Verify progress state is preserved (Worker is bound to renderer, not component lifecycle)

**Expected Result:**
- Worker instance ID remains identical across soft navigations
- `review_tasks` row in DB continues to update with progress
- Returning to CodeReview page shows AgentProgress at correct phase/percent
- (Note: A **hard refresh** `Ctrl+R` restarts the renderer process, terminates the Worker, and creates a fresh Worker — rehydration is NOT a spec requirement; user must manually re-trigger after refresh.)

**Verification:** Soft navigate mid-review; verify progress intact

---

### Test Case M3: TypeScript compiles without errors after Agent integration

**Test ID:** TC-INT-003
**Priority:** P0
**Preconditions:** All Agent source files implemented per plan

**Steps:**
1. Run `npx tsc --noEmit` in project root
2. Verify exit code 0

**Expected Result:**
- Zero TypeScript errors
- All discriminated unions properly typed
- Web Worker messages type-safe

**Verification:** Terminal command output

---

## Test Execution Plan

### Execution Sequence

**Phase 1: Foundation Verification (Section C)**
- Run TC-DB-001 → TC-DB-006 first. These verify schema, migration, state machine, and builtin rule seeding. Without these, downstream tests have no foundation.

**Phase 2: Worker & IPC (Sections A, B)**
- TC-AG-001, TC-AG-002, TC-AG-003 (worker boot + persistence + main integration)
- TC-IPC-001 through TC-IPC-005 (IPC channels, tray)
- Critical for verifying the Web Worker + IPC architecture before testing business logic.

**Phase 3: Pipeline & Rules (Sections D, F)**
- TC-PIPE-001, TC-PIPE-002 (basic pipeline execution with MockProvider)
- TC-RULE-001 through TC-RULE-006 (rule matching)
- Verify the core review flow produces correct issues.

**Phase 4: Memory & Token (Sections E, G)**
- TC-TOK-001 through TC-TOK-004
- TC-MEM-001 through TC-MEM-005
- Verify long-running and large-diff scenarios don't break.

**Phase 5: Visualization & Control (Section I)**
- TC-VIZ-001 through TC-VIZ-007
- Pause/resume/skip/cancel flows are user-facing and need careful verification.

**Phase 6: Trigger Mechanism (Section J)**
- TC-TRIG-001 through TC-TRIG-005
- Both manual and scheduled triggers must work end-to-end.

**Phase 7: Reports & Security (Sections H, L)**
- TC-RPT-001 through TC-RPT-004 (reports + Excel export)
- TC-SEC-001, TC-SEC-002 (key isolation)

**Phase 8: Integration (Section M)**
- TC-INT-001 through TC-INT-003 (legacy coexistence, refresh recovery, type safety)

### Test Data Setup

Before running tests, ensure:
1. **LLM configured with MockProvider** in Settings (`api_type = 'mock'`)
2. **At least 3 mock projects** with diverse mock MR data covering:
   - Multiple file types (`.tsx`, `.json`, `.css`, etc.)
   - Code containing `dangerouslySetInnerHTML`, `eval()`, `any` types, etc.
   - Various diff sizes (small <1K tokens, medium ~5K, large >10K)
3. **electron-store has a cron schedule** configured (default `0 9 * * 1-5`)
4. **Clean DB state** OR pre-existing data with known fixture values

### Test Environment

- **Dev server tests (most cases):** `npm run dev` + Chrome DevTools MCP
- **Electron-required tests:** `npm run electron:dev` (TC-AG-003, TC-IPC-001, TC-IPC-002, TC-IPC-005, TC-TRIG-003, TC-TRIG-004, TC-SEC-001)
- **Manual verification:** Tray menu interaction (TC-IPC-005) and Excel download inspection (TC-RPT-002)

### Common Chrome DevTools MCP Tool Usage

```
Query DB:
mcp__chrome-devtools__evaluate_script({ function: "() => Array.from(sqlDB.exec('SELECT * FROM review_tasks ORDER BY created_at DESC LIMIT 5'))" })

Check worker:
mcp__chrome-devtools__evaluate_script({ function: "() => !!window.__agentWorkerManager" })

Monitor network:
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["xhr", "fetch"] })

Console messages:
mcp__chrome-devtools__list_console_messages({ types: ["error", "warn"] })

Screenshot for visual verification:
mcp__chrome-devtools__take_screenshot({ fullPage: true })
```

### Pass/Fail Criteria

- **P0 cases:** Must all pass for release
- **P1 cases:** Must pass for stable release; can defer with documented risks
- **P2 cases:** Edge cases; failure acceptable if documented

### Risk Areas to Watch

1. **Web Worker lifecycle** — Worker reload on Vite HMR may cause issues. Tests TC-AG-002 and TC-INT-002 are critical.
2. **MockProvider behavior parity with real LLM** — Tests passing with mock may not reflect real LLM behavior. Use canned responses matching real LLM output structure.
3. **sql.js in-memory DB reset on app restart** — Some integration tests may need data setup repeated.
4. **node-cron timing in tests** — TC-TRIG-004 requires waiting several minutes. Consider mocking scheduler clock if test cycle time matters.
5. **Concurrent Worker instances from React StrictMode** — Verify Worker singleton handles dev-mode double-mount.
