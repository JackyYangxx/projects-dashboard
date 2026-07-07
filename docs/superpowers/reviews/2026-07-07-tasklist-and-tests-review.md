# Code Review: Task List + Test Cases for Code Review Agent

**Date:** 2026-07-08
**Artifacts Reviewed:**
- `docs/superpowers/tasks/2026-07-07-code-review-agent-tasklist.md`
- `docs/superpowers/tests/2026-07-07-code-review-agent-test-cases.md`

**Reference Documents:**
- Spec: `docs/superpowers/specs/2026-07-07-code-review-agent-design.md` (13 sections, status: v3 approved)
- Plan: `docs/superpowers/plans/2026-07-07-code-review-agent-plan.md` (2906 lines, 22 tasks across 8 phases)

---

## Findings

### ISSUE-001: Test count claimed (42) does not match actual count (57)
**Artifact:** test-cases.md
**Severity:** HIGH
**Description:** The document header states "Total Cases: 42", but the file contains **57** distinct `### Test Case` sections with unique `TC-*` IDs. Counting per prefix:
- TC-AG (3) + TC-IPC (5) + TC-DB (6) + TC-PIPE (5) + TC-TOK (4) + TC-RULE (6) + TC-MEM (5) + TC-RPT (4) + TC-VIZ (7) + TC-TRIG (5) + TC-STK (2) + TC-SEC (2) + TC-INT (3) = **57**

The "Execution Sequence" phase lists at the bottom also reference TC counts in ranges (e.g. "TC-INT-001 through TC-INT-003" — that's 3, correct), but the header total is wrong by 15. This is a critical accuracy error that affects planning/budget decisions.

**Suggestion:** Update line 6 to `**Total Cases:** 57` (and double-check the phase counts in the Execution Plan section if any are off).

---

### ISSUE-002: Builtin rules count mismatch — spec (17) vs tasklist (16) vs actual seed (16)
**Artifact:** tasklist.md (Task 2) and test-cases.md (TC-DB-003)
**Severity:** HIGH
**Description:** Spec §三 states "内置 17 条预设规则" (17 builtin rules). Test C3 asserts "Exactly 17 rows with `is_builtin = 1`". However:
- Tasklist Task 2 AC #3 says "**16** builtin rules seeded"
- The plan's actual code (lines 326-341) seeds **16** rules (counted: 通用 4 + PC Web 3 + 大屏 3 + 移动 3 + 安全 3 = 16, NOT 17 — missing one 通用 or one 安全 rule)
- Plan commit message also says "16 built-in rules seed"

The spec's `|` table at line 528-545 lists 17 rules (including "用户输入未 XSS 过滤" as a separate critical rule), but the plan dropped this duplicate-of-dangerouslySetInnerHTML rule and seeded only 16.

**Suggestion:** Reconcile in one of two ways:
1. **Option A (preferred):** Update spec §三 line 295 + §六 rule table to reflect 16 actual rules. Update test C3 expected count to 16 and the category breakdown (currently lists "通用 (4), PC Web (3), 大屏 (3), 移动 (3), 安全 (4) — totaling 17" but actual seed is 安全 (3)).
2. **Option B:** Add the missing 17th rule back into the plan seed and update spec to confirm.

Both artifacts have stale/wrong numbers — neither matches the other nor the plan's seed code.

---

### ISSUE-003: Spec §十二 (Testing Strategy) has no dedicated test section
**Artifact:** test-cases.md
**Severity:** MEDIUM
**Description:** The spec has 13 numbered sections; tests cover §一, §二, §三, §四, §五, §六, §七, §八, §九, §十, §十一, §十三 — but §十二 (Testing Strategy, lines 721-731 in spec) is not covered. Section §十二 describes test layers (unit, integration, E2E, mock LLM). Coverage is **12/13** sections (the test cases skip §十二 because it's meta, but it should be acknowledged).

**Suggestion:** Either (a) add a brief Section M note "Spec §十二 describes test strategy — implementation strategies validated via M3 (tsc clean) + MockProvider use throughout", or (b) rename Section M to "Cross-cutting / Integration (Spec §十二 + §一-§十一)".

---

### ISSUE-004: Tasklist Task 2 AC #2 says "16 builtin rules seeded" but commit message also says 16 — verify Task 19 spec-mismatch
**Artifact:** tasklist.md
**Severity:** LOW
**Description:** Looking at Stage 7 Task 19 (ScheduleConfig), `Depends on: Task 1 (type defs); 18 is parallel — render uses optional chaining for safety`. This is fine, but the parenthetical comment is informal and the wording "render uses optional chaining for safety" is implementation guidance rather than a dependency statement. Reads slightly awkward.

**Suggestion:** Move implementation guidance to acceptance criteria or remove. Keep "Depends on" line clean: `**Depends on:** Task 1`.

---

### ISSUE-005: Test C1 preconditions are vague — "Fresh app launch (or DB file deleted)"
**Artifact:** test-cases.md, TC-DB-001
**Severity:** LOW
**Description:** The precondition says "Fresh app launch (or DB file deleted), LLM configured". This mixes two scenarios (first-run vs explicit delete) without clarifying the path. Test C2 explicitly mentions "Pre-Agent version DB", suggesting the team distinguishes migration paths.

**Suggestion:** Clarify: `Preconditions: First-time launch with no projects-dashboard.db in userData directory (or DB file explicitly deleted). Other tests may pre-seed data.`

---

### ISSUE-006: Test M2 (TC-INT-002) claims state recovery from DB but spec does not mandate this
**Artifact:** test-cases.md, TC-M2
**Severity:** MEDIUM
**Description:** TC-INT-002 expects "After refresh, AgentProgress component rehydrates from `review_tasks` row". Spec §一 states "Worker 生命周期绑定到渲染进程，不绑定到任何 React 组件" — but does NOT mandate rehydration on refresh. The Worker is browser-side, so a hard refresh (`Ctrl+R`) restarts the renderer process, terminates the Worker, and re-creates everything. A `review_task` row exists in sql.js but the in-memory state in the new Worker won't have progress info — Worker rehydration on refresh is **not specified** in the spec.

**Suggestion:** Either (a) verify with plan/spec that this rehydration is actually designed — if not, change test expected result to "Review task row exists in DB; on refresh, user must manually trigger new review". Or (b) split this into two tests: TC-INT-002a (Worker survives soft navigation = no refresh, no state loss) and TC-INT-002b (refresh behavior per actual design).

---

### ISSUE-007: Tasklist tracking table shows "0 completed" — review note for context
**Artifact:** tasklist.md
**Severity:** LOW (informational)
**Description:** The Tracking section (line 530-539) shows "ALL: 22 / 0 / 0". This is the initial state. No issue, just noting this is a baseline snapshot rather than a problem.

**Suggestion:** No fix needed; this is the expected starting state.

---

### ISSUE-008: Test J5 (TC-TRIG-005) "Scheduled scan skips if previous still running" duplicates TC-PIPE-003 semantically
**Artifact:** test-cases.md
**Severity:** LOW
**Description:** TC-PIPE-003 ("Concurrency control — single Agent instance") and TC-TRIG-005 ("Scheduled scan skips if previous still running") test the same core behavior (single-instance enforcement) from different trigger angles. They are not redundant per se — TC-PIPE-003 tests manual-trigger path, TC-TRIG-005 tests scheduler-trigger path. Both should remain, but the relationship could be clearer.

**Suggestion:** No fix needed. Tests are correctly differentiated by trigger source. (Low-severity informational note.)

---

### ISSUE-009: Task 2 verification mentions "16" but spec says 17 (cross-ref to ISSUE-002)
**Artifact:** tasklist.md
**Severity:** HIGH (duplicate of ISSUE-002)
**Description:** Same root cause as ISSUE-002 — spec/plan/test count mismatch propagates to tasklist. Task 2 AC #3 says "16 builtin rules seeded (count guard: only if table empty)".

**Suggestion:** Covered by ISSUE-002 fix.

---

## Coverage Matrix

### Spec Section Coverage by Tasklist (Plan Tasks 1-22)

| Spec Section | Plan Tasks | Tasklist Coverage | Notes |
|--------------|------------|-------------------|-------|
| §一 Architecture | T7 (worker), T5 (manager), T4 (messages) | T1 (types), T4 (msgs), T5 (mgr), T6 (LLM), T7 (worker) | Fully covered |
| §二 IPC | T18 (IPC + scheduler) | T18 (IPC), T1 (Window typing) | Fully covered |
| §三 Database | T1 (types), T2 (migration), T3 (DAO) | T1, T2, T3 | Fully covered |
| §四 Pipeline | T8, T9, T10, T11, T12 | T8, T9, T10, T11, T12 | Fully covered |
| §五 Token Budget | T8 (TokenBudget) | T8 | Fully covered |
| §六 Rule System | T9 (RuleEngine) | T9, T15 (UI), T16 (UI) | Fully covered |
| §七 Memory System | T10 (MemoryMgr) | T10 | Fully covered |
| §八 Summary Report | T20 (Report UI) | T20 | Covered (UI only; DAO in T3, store in T13) |
| §九 Visualization & Control | T13 (store), T14 (component) | T13, T14 | Fully covered |
| §十 Trigger Mechanism | T18 (scheduler), T17 (page integration) | T17, T18, T19 (config UI) | Fully covered |
| §十一 Tech Stack | T18 (node-cron dep) | T18 | Fully covered |
| §十二 Test Strategy | — | — | Not in tasklist (it's meta) |
| §十三 Security | T1 (Window typing), T18 (IPC) | T1, T18 | Covered (existing code has safeStorage in pipeline; spec §十三 is mostly existing notes) |

**Tasklist Coverage:** 22/22 tasks present. Dever assignments unique (dever-1 through dever-22). Stage grouping correct (8 stages).

### Spec Section Coverage by Test Cases

| Spec Section | Test Section | Test Count | Coverage |
|--------------|--------------|-----------|----------|
| §一 Architecture | A | 3 | Full |
| §二 IPC | B | 5 | Full |
| §三 Database | C | 6 | Full (but C3 has wrong count — see ISSUE-002) |
| §四 Pipeline | D | 5 | Full |
| §五 Token Budget | E | 4 | Full |
| §六 Rule System | F | 6 | Full |
| §七 Memory System | G | 5 | Full |
| §八 Summary Report | H | 4 | Full |
| §九 Visualization & Control | I | 7 | Full |
| §十 Trigger Mechanism | J | 5 | Full |
| §十一 Tech Stack | K | 2 | Adequate (only 2 cases for stack; reasonable) |
| §十二 Test Strategy | — | 0 | None (see ISSUE-003) |
| §十三 Security | L | 2 | Adequate |
| (Cross-cutting) | M | 3 | Adequate |

**Spec sections covered by tests:** 12/13 (§十二 missing)

### Priority Distribution
- P0: 20 (35%)
- P1: 27 (47%)
- P2: 10 (18%)

Priority allocation is reasonable. P0 covers critical paths: Worker boot (A1, A3), IPC (B1, B4), DB foundation (C1-C4), pipeline execution (D1, D2), rule matching (F1), reports (H1), visualization (I1-I3, I5), triggers (J1), integration (M1, M3), security (L1).

---

## Counts

| Metric | Claimed | Actual | Status |
|--------|---------|--------|--------|
| Plan tasks | 22 | 22 | OK |
| Tasks in tasklist | 22 | 22 | OK |
| Test cases | 42 | **57** | **MISMATCH (HIGH)** |
| Unique devers | 22 (dever-1 to dever-22) | 22 | OK |
| Stages | 8 | 8 | OK |
| Spec sections covered by tests | 13/13 | 12/13 | Partial (missing §十二) |
| Builtin rule count | spec=17, plan=16, tasklist=16, test=17 | 16 | **MISMATCH (HIGH)** |

---

## Verdict

| Status | Description |
|--------|-------------|
| REQUEST_CHANGES | 2 HIGH issues need fixing before approval |

**Top issues requiring fixes:**

1. **Test count mismatch (HIGH):** Update test-cases.md header from "42" to "57" and verify phase execution sequence numbers are correct.

2. **Builtin rule count inconsistency (HIGH):** Spec says 17, plan seeds 16, tasklist says 16, test asserts 17. Pick a number and align all four documents.

3. **Spec §十二 not tested (MEDIUM):** Either add a Section M acknowledgement or accept §十二 as out-of-scope (test strategy is meta, not a feature).

4. **TC-INT-002 may assert non-specified behavior (MEDIUM):** "Hard refresh rehydrates state from DB" — verify this is in spec or correct the test.

**Reviewed by:** Checker Agent

---

## Appendix A: Tasklist Quality Notes (Positive)

- Each task has clear Dever assignment (dever-1 through dever-22, all unique).
- Dependencies use machine-readable JSON at line 491-520.
- Each task has `Verification` step (mostly `npx tsc --noEmit` + smoke test).
- Commit messages provided per task — consistent style.
- Stage overview table is clear with parallelism annotations.

## Appendix B: Test Cases Quality Notes (Positive)

- Most cases have explicit Preconditions, Steps, Expected Result, Verification sections.
- P0 cases (20) align with critical paths (Worker init, IPC channels, DB foundation, pipeline execution).
- MockProvider assumption is stated upfront (line 8).
- Phase-based Execution Plan at end helps test ordering.
- Common Chrome DevTools MCP usage examples at line 1248+ reduce reviewer friction.
- Risk Areas (line 1273+) shows awareness of flakiness sources.