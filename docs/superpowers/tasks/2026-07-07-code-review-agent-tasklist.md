# Code Review Agent Task List

**Spec:** `docs/superpowers/specs/2026-07-07-code-review-agent-design.md`
**Plan:** `docs/superpowers/plans/2026-07-07-code-review-agent-plan.md`
**Generated:** 2026-07-07
**Total Tasks:** 22 across 8 stages
**Branch:** `feat/code-review-agent`

## Stage Overview

| Stage | Tasks | Description | Parallelism | Boundary |
|-------|-------|-------------|------------|----------|
| 1 | 1, 2, 3 | Foundation: Types, DB migration, DAO | ✓ within stage | After: 3 done |
| 2 | 4, 5, 6, 7 | Agent Core: Worker Manager + Message Protocol + LLM Provider + Worker entry | 4+5+6 in parallel; 7 after 4,5 | After: 7 done |
| 3 | 8, 9, 10, 11, 12 | Pipeline: TokenBudget, RuleEngine, MemoryManager, Pipeline, Worker wiring | 8+9+10 in parallel; 11 after 6,8,9,10; 12 after 11,7 | After: 12 done |
| 4 | 13, 14 | Store integration + Progress viz | 14 after 13 | After: 14 done |
| 5 | 15, 16, 17 | UI: RuleEditor, RuleList, CodeReview integration | 15+16 in parallel; 17 after 13,14,15,16 | After: 17 done |
| 6 | 18 | Main Process: Scheduler + Tray + IPC | standalone | After: 18 done |
| 7 | 19, 20 | UI: ScheduleConfig + ReportGenerator | ✓ within stage | After: 19,20 done |
| 8 | 21, 22 | Final: DB proxy + runtime verify | 22 after 21 (verifies all) | Release |

> **Cross-cutting rule:** Tasks 4-22 are dependent on Stage 1 having shipped. Stage 3 starts only after Stage 2's worker manager (`agentWorkerManager.ts`) exists because the pipeline executes inside the worker.

---

## Stage 1 — Foundation

### Task 1: Add Agent types
**Stage:** 1 — Foundation
**Dever:** dever-1
**Files:**
- Create: `src/types/agent.ts`
- Modify: `src/types/index.ts:94-155`
**Depends on:** —
**Acceptance Criteria:**
1. `AgentRule`, `AgentMemory`, `ReviewTask`, `AgentReport` interfaces exported from `src/types/agent.ts`
2. `MRReviewRecord` includes optional `taskId?: string`
3. `Window.electronAPI` declares `getSchedule`, `setSchedule`, `getNextScheduledRun`, `onCloseToTray` methods
**Verification:** `npx tsc --noEmit` (no new errors)

> **Note:** Source code for this task lives in plan § Task 1.

- [ ] **Step 1-5: Create types, extend MRReviewRecord, extend Window, verify, commit**
```bash
git add src/types/agent.ts src/types/index.ts
git commit -m "feat: add Agent types and extend MRReviewRecord with taskId"
```

### Task 2: Database migration and new tables
**Stage:** 1 — Foundation
**Dever:** dever-2
**Files:**
- Modify: `src/db/index.ts`
**Depends on:** —
**Acceptance Criteria:**
1. `mr_review_records` gets `task_id TEXT` column (idempotent ALTER TABLE)
2. 4 new tables: `agent_rules`, `agent_memories`, `review_tasks`, `agent_reports`
3. 16 builtin rules seeded (count guard: only if table empty)
4. App launches twice without "table already exists" errors
**Verification:** `npm run electron:dev` (no errors), check DevTools console on second launch

- [ ] **Step 1-5: Add CREATE TABLEs, ALTER TABLE in try/catch, seed rules, verify, commit**
```bash
git add src/db/index.ts
git commit -m "feat: add agent tables migration and 16 built-in rules seed"
```

### Task 3: Agent DAO layer
**Stage:** 1 — Foundation
**Dever:** dever-3
**Files:**
- Create: `src/db/agentDao.ts`
**Depends on:** Task 1
**Acceptance Criteria:**
1. CRUD for all 4 new tables: `agent_rules`, `agent_memories`, `review_tasks`, `agent_reports`
2. `searchMemories(projectId, filePatterns, limit)` returns `AgentMemory[]` ordered by `confidence × occurrence_count`
3. `findSimilarMemory`, `evictOldMemories` follow spec
4. SELECT with params uses `prepare`/`bind`/`step` pattern (per codeReviewDao precedent)
5. All writes call `persistDatabase()`
**Verification:** `npx tsc --noEmit`

- [ ] **Step 1-3: Create DAO file, verify, commit**
```bash
git add src/db/agentDao.ts
git commit -m "feat: add agent DAO layer for rules, memories, tasks, reports"
```

---

## Stage 2 — Agent Core

### Task 4: Message type definitions
**Stage:** 2 — Agent Core
**Dever:** dever-4
**Files:**
- Create: `src/agents/messageTypes.ts`
**Depends on:** Task 1
**Acceptance Criteria:**
1. `WorkerInMessage` discriminated union (UI → Worker): `agent:start`, `agent:control`, `agent:rule-toggle`, `agent:db-response`, `agent:db-batch-done`
2. `WorkerOutMessage` (Worker → UI): `agent:progress`, `agent:issue-found`, `agent:phase-change`, `agent:completed`, `agent:error` + 6 DB semantic messages
3. Both unions import `ReviewIssue` from `@/types` and `AgentMemory`, `ReviewTask`, `TaskSummary` from `@/types/agent`
**Verification:** `npx tsc --noEmit`

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/messageTypes.ts
git commit -m "feat: add Web Worker message protocol with discriminated unions"
```

### Task 5: Agent Worker Manager
**Stage:** 2 — Agent Core
**Dever:** dever-5
**Files:**
- Create: `src/agents/agentWorkerManager.ts`
**Depends on:** Task 4
**Acceptance Criteria:**
1. Singleton exports `getAgentWorker()`, `sendToWorker()`, `subscribeToWorker(handler) → unsubscribe`
2. Worker `src/agents/worker.ts?worker` instantiated once (lazy or eager at app boot)
3. Reconnection on `worker.onerror`
4. Single message channel (no separate DB pipe)
**Verification:** `npx tsc --noEmit`, console log on Worker ready

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/agentWorkerManager.ts
git commit -m "feat: add Agent Web Worker Manager singleton"
```

### Task 6: LLM Provider abstraction
**Stage:** 2 — Agent Core
**Dever:** dever-6
**Files:**
- Create: `src/agents/llmProvider.ts`
**Depends on:** Task 1
**Acceptance Criteria:**
1. `LLMProvider` interface: `chat(params) → ChatResponse`, `estimateTokens(text) → number`
2. `OpenAIProvider`, `AnthropicProvider` — fetch-based, handle errors gracefully
3. `MockProvider` — regex returns fixed-format issues for `dangerouslySetInnerHTML` / `: any` patterns
4. `getProviderByApiType(apiType)` selects implementation
**Verification:** `npx tsc --noEmit`, manual review shows separate responsibilities

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/llmProvider.ts
git commit -m "feat: add LLM Provider abstraction with OpenAI/Anthropic/Mock implementations"
```

### Task 7: Agent Web Worker entry point
**Stage:** 2 — Agent Core
**Dever:** dever-7
**Files:**
- Create: `src/agents/worker.ts`
**Depends on:** Task 4, Task 5
**Acceptance Criteria:**
1. Worker entry handles `agent:start`, `agent:control`, `agent:rule-toggle`, DB proxy messages
2. Returns `WorkerOutMessage` for progress / issue-found / phase-change / completed / error
3. Caches rules in memory, listens for `rule-toggle` updates
4. Minimal stub; real pipeline logic added in Task 12
**Verification:** `npx tsc --noEmit`, dev server boots without Worker errors

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/worker.ts
git commit -m "feat: add Agent Web Worker entry point (stub)"
```

---

## Stage 3 — Agent Pipeline

### Task 8: Token budget manager
**Stage:** 3 — Agent Pipeline
**Dever:** dever-8
**Files:**
- Create: `src/agents/tokenBudget.ts`
**Depends on:** Task 6
**Acceptance Criteria:**
1. `estimateTokens(text)`: EN 1tok≈4ch, ZH 1tok≈1.5ch, code 1tok≈3ch
2. `planBudget(totalTokens, maxTokens) → { strategy, availableTokens }`
3. Strategies: `full`, `file-split`, `truncate-large`, `compress`, `downgrade`
4. Pure functions, no external deps
**Verification:** `npx tsc --noEmit`, unit-test 3 sample texts

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/tokenBudget.ts
git commit -m "feat: add Token Budget manager with 4 strategies"
```

### Task 9: Rule engine
**Stage:** 3 — Agent Pipeline
**Dever:** dever-9
**Files:**
- Create: `src/agents/ruleEngine.ts`
**Depends on:** Task 1
**Acceptance Criteria:**
1. `matchRules(filePath, diffLines, rules) → RuleMatch[]`
2. File match (glob) + content match (regex) modes
3. Project-scope rules override global when name matches
4. Disabled rules excluded
**Verification:** `npx tsc --noEmit`, run on built-in rules + sample diff

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/ruleEngine.ts
git commit -m "feat: add Rule matching engine with dual-mode filter"
```

### Task 10: Memory manager
**Stage:** 3 — Agent Pipeline
**Dever:** dever-10
**Files:**
- Create: `src/agents/memoryManager.ts`
**Depends on:** Task 1
**Acceptance Criteria:**
1. `retrieve(projectId, filePatterns) → AgentMemory[]` (delegates to DAO `searchMemories`, sorts)
2. `record(issue, projectId, sourceReviewId)` — checks for similar, increments `occurrence_count` if found, inserts new if not
3. `evict()` calls DAO `evictOldMemories`
4. Pure logic; DB calls via DAO
**Verification:** `npx tsc --noEmit`, trace logic with 3 sample memories

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/memoryManager.ts
git commit -m "feat: add Memory manager with retrieve/record/evict"
```

### Task 11: Pipeline orchestrator
**Stage:** 3 — Agent Pipeline
**Dever:** dever-11
**Files:**
- Create: `src/agents/pipeline.ts`
**Depends on:** Task 6, Task 8, Task 9, Task 10
**Acceptance Criteria:**
1. 4 stages implementing `PipelineStage`: `prepare`, `analyze`, `locate`, `reflect`
2. `runPipeline(ctx) → ctx` mutates PipelineContext (mrs → diffFiles → ruleMatches → rawIssues → resolvedIssues)
3. Each stage emits `progress` (0-1) and `phase-change` events via callback
4. 3-tier locate strategy (Hunk match → file scan → fuzzy)
5. LLM analysis uses `LLMProvider.chat()`
**Verification:** `npx tsc --noEmit`, inject mock provider, run on fixture diff

- [ ] **Step 1-N: Create file, verify, commit**
```bash
git add src/agents/pipeline.ts
git commit -m "feat: add 4-stage Pipeline orchestrator"
```

### Task 12: Wire pipeline into Worker
**Stage:** 3 — Agent Pipeline
**Dever:** dever-12
**Files:**
- Modify: `src/agents/worker.ts`
**Depends on:** Task 7, Task 11
**Acceptance Criteria:**
1. `agent:start` invokes `pipeline.runPipeline(ctx)` with worker callbacks
2. Pipeline emits `progress`, `phase-change`, `issue-found`, `completed`/`error` to UI thread
3. Pause/resume/skip/cancel by `agent:control` set internal flags pipeline checks between stages
4. Rule toggle updates cache mid-task
**Verification:** `npx tsc --noEmit`, end-to-end pipe with MockProvider via dev console

- [ ] **Step 1-N: Update worker, verify, commit**
```bash
git add src/agents/worker.ts
git commit -m "feat: wire pipeline execution into Agent Web Worker"
```

---

## Stage 4 — Store Integration & Process Visualization

### Task 13: Add Agent state to codeReviewStore
**Stage:** 4 — Store Integration
**Dever:** dever-13
**Files:**
- Modify: `src/store/codeReviewStore.ts`
**Depends on:** Task 3, Task 5, Task 7
**Acceptance Criteria:**
1. New state: `agentStatus`, `agentTaskId`, `agentLiveIssues`, `agentCurrentPhase`, `agentProgress`, `agentCurrentFile`, `agentFoundCount`, `reviewTasks`
2. New actions: `startAgentReview`, `controlAgent`, `toggleAgentRule`, `loadReviewTasks`, `resetAgentState`
3. `startAgentReview` subscribes to worker, dispatches `agent:start`
4. Listener handles `agent:progress`/`completed`/`error`/`issue-found`/`phase-change` and updates store
**Verification:** `npx tsc --noEmit` (no circular imports)

- [ ] **Step 1-3: Edit store, verify, commit**
```bash
git add src/store/codeReviewStore.ts
git commit -m "feat: add Agent state and actions to codeReviewStore"
```

### Task 14: Process visualization component
**Stage:** 4 — UI
**Dever:** dever-14
**Files:**
- Create: `src/components/AgentProgress.tsx`
**Depends on:** Task 13
**Acceptance Criteria:**
1. Shows only when `agentStatus !== 'idle'`
2. Phase bar with 4 segments (preparing/analyzing/locating/reflecting); current segment highlighted
3. Current file, found count, percent
4. Live issues list (max-height overflow), pause/resume/cancel buttons
5. Uses `Icon` from `./Icon`, follows existing color tokens
**Verification:** `npx tsc --noEmit`, render in browser via dev server

- [ ] **Step 1-N: Create component, verify, commit**
```bash
git add src/components/AgentProgress.tsx
git commit -m "feat: add AgentProgress visualization component"
```

---

## Stage 5 — UI: Rules + Integration

### Task 15: RuleEditor component
**Stage:** 5 — UI
**Dever:** dever-15
**Files:**
- Create: `src/components/RuleEditor.tsx`
**Depends on:** Task 3
**Acceptance Criteria:**
1. Form: name, description, severity (radio), scope (global/project), filePatterns, matchPatterns (textarea, one per line)
2. Examples good/bad (textarea, one per line)
3. Save calls insertAgentRule / updateAgentRule from store
4. Validation: name required, cron expression optional
**Verification:** `npx tsc --noEmit`, browser render

- [ ] **Step 1-N: Create component, verify, commit**
```bash
git add src/components/RuleEditor.tsx
git commit -m "feat: add RuleEditor component for rule CRUD"
```

### Task 16: RuleList component
**Stage:** 5 — UI
**Dever:** dever-16
**Files:**
- Create: `src/components/RuleList.tsx`
**Depends on:** Task 3
**Acceptance Criteria:**
1. Lists all rules (sort: builtin first, then by createdAt desc)
2. Toggle switch per rule (calls `toggleAgentRule` in store; non-builtin rules also editable via pencil icon)
3. Built-in rules: toggle works, delete is hidden
4. Custom rules: toggle + edit + delete (with confirm dialog)
**Verification:** `npx tsc --noEmit`, browser render

- [ ] **Step 1-N: Create component, verify, commit**
```bash
git add src/components/RuleList.tsx
git commit -m "feat: add RuleList component with toggle/edit/delete"
```

### Task 17: Integrate into CodeReview page
**Stage:** 5 — UI
**Dever:** dever-17
**Files:**
- Modify: `src/pages/CodeReview.tsx`
**Depends on:** Task 13, Task 14, Task 15, Task 16
**Acceptance Criteria:**
1. Show `<AgentProgress />` above existing review UI when `agentStatus !== 'idle'`
2. Add tabs for "Rules" / "History" / "Report" alongside existing review area
3. "Rules" tab renders `<RuleList />` + button to open `<RuleEditor />` modal
4. "History" tab renders tasks list (status + count + click expand)
5. "Report" tab shows button to open `<ReportGenerator />` modal (added in Task 20)
**Verification:** `npx tsc --noEmit`, browser smoke test

- [ ] **Step 1-N: Edit page, verify, commit**
```bash
git add src/pages/CodeReview.tsx
git commit -m "feat: integrate Agent UI components into CodeReview page"
```

---

## Stage 6 — Main Process

### Task 18: Add scheduler and IPC handlers to main process
**Stage:** 6 — Main Process
**Dever:** dever-18
**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `package.json` (add node-cron dependency)
- Modify: `src/types/index.ts` (add `agentBridge`)
**Depends on:** Task 1
**Acceptance Criteria:**
1. `npm install node-cron @types/node-cron` succeeds
2. `initScheduler()` reads `store.get('agent-schedule')` (default `'0 9 * * 1-5'`) and starts cron job
3. IPC: `agent:get-schedule`, `agent:set-schedule`, `agent:get-next-run`, `agent:confirm-close`
4. Tray menu shows "下次扫描: ..." (disabled item) and "立即扫描" item
5. `window-all-closed` keeps app alive for non-darwin (returns `tray` action via confirm-close)
6. `agentBridge.onScheduleTick` exposed for renderer subscription
**Verification:** `npm run electron:dev`, check tray menu, change cron in tests

- [ ] **Step 1-5: Install dep, edit main, edit preload, edit types, commit**
```bash
git add electron/main.ts electron/preload.ts src/types/index.ts package.json package-lock.json
git commit -m "feat: add node-cron scheduler, tray menu updates, and new IPC handlers"
```

---

## Stage 7 — Schedule Config & Report Components

### Task 19: ScheduleConfig component
**Stage:** 7 — UI
**Dever:** dever-19
**Files:**
- Create: `src/components/ScheduleConfig.tsx`
**Depends on:** Task 1 (type defs); 18 is parallel — render uses optional chaining for safety
**Acceptance Criteria:**
1. Reads schedule via `electronAPI.getSchedule()`; shows loading state
2. Preset buttons (每小时, 每天 9:00, 工作日 9:00, 每周一 9:00) toggle cron expression
3. Cron text input editable
4. "启用定时扫描" checkbox
5. Save calls `electronAPI.setSchedule()`, refreshes "下次扫描" timestamp
**Verification:** `npx tsc --noEmit`, browser render

- [ ] **Step 1-N: Create component, verify, commit**
```bash
git add src/components/ScheduleConfig.tsx
git commit -m "feat: add ScheduleConfig component with cron presets"
```

### Task 20: ReportGenerator component
**Stage:** 7 — UI
**Dever:** dever-20
**Files:**
- Create: `src/components/ReportGenerator.tsx`
**Depends on:** Task 3 (DAO); Task 13 (store)
**Acceptance Criteria:**
1. Modal with time-range picker (近一周 / 近一月 / 自定义) and project scope (could skip if v1)
2. Generate: queries `getAllMRReviewRecords()`, `getAllMemories()`, computes stats, calls `insertAgentReport()`
3. Summary text: total MRs, total issues by severity
4. `topIssuesJson` from `agent_memories` with `type='pattern'`, sorted by `occurrence_count`
5. `onGenerated` callback bubbles up to CodeReview page
**Verification:** `npx tsc --noEmit`, browser render; smoke test in dev

- [ ] **Step 1-N: Create component, verify, commit**
```bash
git add src/components/ReportGenerator.tsx
git commit -m "feat: add ReportGenerator dialog with time range selection"
```

---

## Stage 8 — Final Integration

### Task 21: Wire DB request handling in store
**Stage:** 8 — Integration
**Dever:** dever-21
**Files:**
- Modify: `src/store/codeReviewStore.ts`
**Depends on:** Task 12 (worker emits DB requests), Task 13 (store exists)
**Acceptance Criteria:**
1. `setupDbProxy()` subscribes to worker, handles: `agent:db-search-memories`, `agent:db-write-memory`, `agent:db-task-create`, `agent:db-task-update`, `agent:db-batch`, `agent:db-query`
2. `agent:db-batch` wraps statements in `BEGIN ... COMMIT` (`ROLLBACK` on error)
3. Each reply via `agent:db-response` or `agent:db-batch-done`
**Verification:** `npx tsc --noEmit`, run agent with MockProvider and observe DB rows

- [ ] **Step 1-2: Edit store, commit**
```bash
git add src/store/codeReviewStore.ts
git commit -m "feat: wire DB request proxy for Agent Web Worker in store"
```

### Task 22: Final compilation and runtime verification
**Stage:** 8 — Integration
**Dever:** dever-22 (final integration pass)
**Files:** All (verification only, no new code unless bug discovered)
**Depends on:** All prior tasks
**Acceptance Criteria:**
1. `npx tsc --noEmit` exits 0
2. `npm run dev` boots; console shows `[App] Database and Agent Worker initialized` (or equivalent)
3. Web Worker chunk loads (Network tab)
4. With MockProvider: navigate to CodeReview, click "开始评审", observe 4-phase progress, mock issues appear, task completes with summary
5. Controls: pause/resume/cancel work
6. **Smoke test report generation** + schedule config save/load
**Verification:** As above + observer for new console errors

- [ ] **Step 1-4: Tsc clean, dev server clean, smoke test, fix-and-commit**
```bash
git add -A
git commit -m "fix: resolve compilation errors and integration issues"
```

---

## Cross-Stage Dependencies (machine-readable)

```json
{
  "stages": [
    { "name": "Foundation", "tasks": [1, 2, 3], "blockedBy": [], "devers": ["dever-1", "dever-2", "dever-3"] },
    { "name": "Agent Core", "tasks": [4, 5, 6, 7], "blockedBy": ["Foundation"], "devers": ["dever-4", "dever-5", "dever-6", "dever-7"] },
    { "name": "Pipeline", "tasks": [8, 9, 10, 11, 12], "blockedBy": ["Agent Core"], "devers": ["dever-8", "dever-9", "dever-10", "dever-11", "dever-12"] },
    { "name": "Store+UI", "tasks": [13, 14], "blockedBy": ["Pipeline"], "devers": ["dever-13", "dever-14"] },
    { "name": "Rules UI", "tasks": [15, 16, 17], "blockedBy": ["Store+UI"], "devers": ["dever-15", "dever-16", "dever-17"] },
    { "name": "Main Process", "tasks": [18], "blockedBy": ["Foundation"], "devers": ["dever-18"] },
    { "name": "Config+Report UI", "tasks": [19, 20], "blockedBy": ["Foundation", "Store+UI"], "devers": ["dever-19", "dever-20"] },
    { "name": "Final Integration", "tasks": [21, 22], "blockedBy": ["Pipeline", "Store+UI", "Rules UI", "Main Process", "Config+Report UI"], "devers": ["dever-21", "dever-22"] }
  ],
  "executionStrategy": {
    "parallel_devers_per_stage": true,
    "max_concurrent_devvers": 6,
    "within_stage_dependencies": {
      "1": { "3": [1] },
      "2": { "5": [4], "6": [], "7": [4, 5] },
      "3": { "11": [6, 8, 9, 10], "12": [11, 7] },
      "4": { "13": [3, 5, 7], "14": [13] },
      "5": { "17": [13, 14, 15, 16] },
      "6": { "18": [1] },
      "7": { "20": [13] },
      "8": { "22": [21] }
    }
  },
  "issue_handling": {
    "max_retry": 3,
    "on_max_retry": "Write issue file to docs/superpowers/issues/, move on (coordinator logs unresolved issues for user follow-up)"
  }
}
```

---

## Tracking

Use the Plan document's `- [ ]` checkboxes for in-progress tracking. Each checkbox will be marked `[x]` by the responsible dever after they pass `npx tsc --noEmit` and the test assigned by tester passes.

| Progress | Total | Completed | In Progress |
|----------|-------|-----------|-------------|
| Stage 1 | 3 | 0 | 0 |
| Stage 2 | 4 | 0 | 0 |
| Stage 3 | 5 | 0 | 0 |
| Stage 4 | 2 | 0 | 0 |
| Stage 5 | 3 | 0 | 0 |
| Stage 6 | 1 | 0 | 0 |
| Stage 7 | 2 | 0 | 0 |
| Stage 8 | 2 | 0 | 0 |
| **ALL**  | **22** | **0** | **0** |
