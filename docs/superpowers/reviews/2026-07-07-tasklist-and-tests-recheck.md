# Code Review Re-check: Task List + Test Cases

**Date:** 2026-07-08
**Previous review:** docs/superpowers/reviews/2026-07-07-tasklist-and-tests-review.md

## Fixes Verified

| Issue ID | Original Severity | Description | Status |
|----------|-------------------|-------------|--------|
| ISSUE-001 | HIGH | Test count 42→57 | APPLIED |
| ISSUE-002 | HIGH | Rule count alignment | APPLIED |
| ISSUE-003 | MEDIUM | Spec §十二 acknowledgement | APPLIED |
| ISSUE-006 | MEDIUM | TC-INT-002 rephrased | APPLIED |

### Verification Details

**ISSUE-001 (Test count):** `docs/superpowers/tests/2026-07-07-code-review-agent-test-cases.md` line 6 now reads `**Total Cases:** 57`. Matches the actual count of `### Test Case` sections (TC-AG 3 + TC-IPC 5 + TC-DB 6 + TC-PIPE 5 + TC-TOK 4 + TC-RULE 6 + TC-MEM 5 + TC-RPT 4 + TC-VIZ 7 + TC-TRIG 5 + TC-STK 2 + TC-SEC 2 + TC-INT 3 = 57).

**ISSUE-002 (Rule count alignment):**
- Spec §三 line 295: now reads "内置 16 条预设规则" (was "17 条").
- Spec §六 line 525: now reads "（前端场景，16 条）" (was "17 条").
- Spec §六 rule table: duplicate "用户输入未 XSS 过滤" row removed. Row count matches 16 with category breakdown 通用 5 / PC Web 3 / 大屏 3 / 移动 3 / 安全 2.
- TC-DB-003 (test-cases.md line 232): asserts "Exactly 16 rows with `is_builtin = 1`" (was 17), with corrected category breakdown "通用 (5), PC Web (3), 大屏 (3), 移动 (3), 安全 (2) — totaling 16". Verification text (line 237) also says "should equal 16".

**ISSUE-003 (Spec §十二 acknowledgement):** test-cases.md Section M header (line 1137) now opens with a blockquote: "> Spec §十二 (Testing Strategy) describes the layered testing approach (unit + integration + E2E + MockProvider). This Phase 1 test plan covers E2E only; unit/integration tests are validated through `npx tsc --noEmit` clean compile (TC-INT-003). The MockProvider usage throughout Sections A–L exercises §十二 requirement that E2E runs without real LLM keys." This satisfies the "acknowledge §十二 as meta" suggestion.

**ISSUE-006 (TC-INT-002 rephrased):** test-cases.md line 1158 — title changed to "Agent Worker persists across soft navigation (no hard refresh)". Expected result (line 1173) now ends with "(Note: A **hard refresh** `Ctrl+R` restarts the renderer process, terminates the Worker, and creates a fresh Worker — rehydration is NOT a spec requirement; user must manually re-trigger after refresh.)". This aligns the test with spec §一 (no rehydration mandate) without splitting the test into two cases.

## Verdict

| Status | Description |
|--------|-------------|
| APPROVE | All HIGH and MEDIUM issues resolved |

All 4 fixes from the previous review (2 HIGH + 2 MEDIUM) have been correctly applied. Both HIGH issues (test count and rule count) are now consistent across spec, test cases, and the underlying plan seed code. Both MEDIUM issues (Spec §十二 acknowledgement, TC-INT-002 rehydration claim) have been rewritten to match actual spec/design behavior.

**Reviewed by:** Checker Agent
