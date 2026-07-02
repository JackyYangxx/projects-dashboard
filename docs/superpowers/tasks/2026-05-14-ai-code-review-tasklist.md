# AI Code Review Feature Task List

**Date:** 2026-05-14
**Feature:** AI 代码评审
**Spec:** `docs/superpowers/specs/2026-05-14-ai-code-review-design.md`
**Plan:** `docs/superpowers/plans/2026-05-14-ai-code-review-plan.md`

## Task 1: 类型定义

**Files:**
- Modify: `src/types/index.ts`

**Changes:**
- Add `CodeReview` interface
- Add `MCPService` interface
- Add `Skill` interface

**Status:** PENDING

---

## Task 2: 数据库 — 新增三张表

**Files:**
- Modify: `src/db/index.ts`

**Changes:**
- Add `mcp_services` table CREATE
- Add `skills` table CREATE
- Add `code_reviews` table CREATE

**Status:** PENDING

---

## Task 3: DAO 层

**Files:**
- Create: `src/db/codeReviewDao.ts`
- Create: `src/db/codeReviewDao.test.ts`

**Changes:**
- `insertMCPService`, `getAllMCPServices`, `updateMCPService`, `deleteMCPService`
- `insertSkill`, `getAllSkills`, `updateSkill`, `deleteSkill`
- `insertCodeReview`, `getCodeReviewsByProject`, `deleteCodeReview`

**Status:** PENDING

---

## Task 4: Electron IPC — MCP 调用 + 加密存储

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/index.ts` (window type extension)

**Changes:**
- Add `mcp:list-tools` IPC handler
- Add `mcp:invoke-tool` IPC handler
- Add `store:get`, `store:set`, `store:delete` handlers with electron-store
- Expose `mcpAPI` and `secureStore` in preload

**Status:** PENDING

---

## Task 5: Zustand Store — 状态管理

**Files:**
- Create: `src/store/codeReviewStore.ts`

**Changes:**
- MCP services state + load/add/toggle/remove
- Skills state + load/add/toggle/remove
- `startReview` with LLM streaming + MCP tool_calls
- Streaming events append/clear
- Code review records CRUD

**Status:** PENDING

---

## Task 6: Icon 组件 — 添加 code 图标

**Files:**
- Modify: `src/components/Icon.tsx`

**Changes:**
- Add `code` icon mapping to Material Symbols `code`

**Status:** PENDING

---

## Task 7: 路由和导航

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

**Changes:**
- Add `<Route path="/code-review" element={<CodeReview />} />`
- Add `{ label: '代码评审', icon: 'code', path: '/code-review' }` to navItems

**Status:** PENDING

---

## Task 8: CodeReview 页面组件

**Files:**
- Create: `src/pages/CodeReview.tsx`

**Changes:**
- `MCPPanel` — MCP service CRUD UI
- `SkillPanel` — Skill upload/manage UI
- `StreamOutput` — Streaming output display
- `IssueList` — Problem list with severity filter
- Main page — layout assembling all above

**Status:** PENDING

---

## Task 9: 全局验证

**Files:**
- None (verification only)

**Checks:**
- Run `npm run electron:dev` — app starts without errors
- Sidebar navigation to `/code-review` works
- All new files committed

**Status:** PENDING