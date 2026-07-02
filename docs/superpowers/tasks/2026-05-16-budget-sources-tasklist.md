# Budget Sources Implementation Task List

Generated from: `docs/superpowers/plans/2026-05-16-budget-sources-plan.md`

---

## Task 1: 添加 BudgetSource 类型

| Field | Value |
|-------|-------|
| Task ID | 1 |
| Task Name | 添加 BudgetSource 类型 |
| Status | PENDING |
| Agent | dever |
| Dependencies | - |

**Files:** Modify `src/types/index.ts`

**Steps:**
- [ ] Step 1: 添加 BudgetSource 类型
- [ ] Step 2: 提交

---

## Task 2: 创建 budgetSourcesDao

| Field | Value |
|-------|-------|
| Task ID | 2 |
| Task Name | 创建 budgetSourcesDao |
| Status | PENDING |
| Agent | dever |
| Dependencies | 1 |

**Files:** Create `src/db/budgetSourceDao.ts`

**Steps:**
- [ ] Step 1: 创建 DAO 文件
- [ ] Step 2: 提交

---

## Task 3: 初始化 budget_sources 表

| Field | Value |
|-------|-------|
| Task ID | 3 |
| Task Name | 初始化 budget_sources 表 |
| Status | PENDING |
| Agent | dever |
| Dependencies | 1 |

**Files:** Modify `src/db/index.ts`

**Steps:**
- [ ] Step 1: 添加表初始化
- [ ] Step 2: 提交

---

## Task 4: 重构 ProjectDetail 预算区域 UI

| Field | Value |
|-------|-------|
| Task ID | 4 |
| Task Name | 重构 ProjectDetail 预算区域 UI |
| Status | PENDING |
| Agent | dever |
| Dependencies | 2, 3 |

**Files:** Modify `src/pages/ProjectDetail.tsx`

**Steps:**
- [ ] Step 1: 添加来源 state
- [ ] Step 2: 添加来源操作函数
- [ ] Step 3: 计算汇总数据
- [ ] Step 4: 替换预算区域 UI
- [ ] Step 5: 提交

---

## Task 5: 迁移现有项目数据

| Field | Value |
|-------|-------|
| Task ID | 5 |
| Task Name | 迁移现有项目数据 |
| Status | PENDING |
| Agent | dever |
| Dependencies | 3 |

**Files:** Modify `src/db/index.ts`

**Steps:**
- [ ] Step 1: 为现有项目创建默认来源
- [ ] Step 2: 提交

---

## Workflow Summary

| Agent | Tasks |
|-------|-------|
| dever | 1, 2, 3, 4, 5 |
| checker | (review after each task) |
| tester | (verify after all tasks) |