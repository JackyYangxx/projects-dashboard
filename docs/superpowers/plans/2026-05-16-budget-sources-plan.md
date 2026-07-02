# 预算来源功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在项目详情页支持多预算来源，每个来源有 label 和金额，执行率从来源汇总计算

**Architecture:** 新建 budget_sources 表存储来源明细，ProjectDetail 页面重构预算区域 UI，DAO 层新增来源 CRUD

**Tech Stack:** TypeScript, sql.js, React

---

## 文件结构

- `src/db/budgetSourceDao.ts` - 新建：来源 CRUD
- `src/types/index.ts` - 修改：添加 BudgetSource 类型
- `src/db/index.ts` - 修改：初始化 budget_sources 表
- `src/pages/ProjectDetail.tsx` - 修改：预算区域 UI
- `src/store/projectStore.ts` - 修改：来源相关 state

---

### Task 1: 添加 BudgetSource 类型

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 添加 BudgetSource 类型**

在 `Project` 接口后添加：

```typescript
export interface BudgetSource {
  id: string
  projectId: string
  label: string
  amount: number
  usedAmount: number
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat(budget): add BudgetSource type"
```

---

### Task 2: 创建 budgetSourcesDao

**Files:**
- Create: `src/db/budgetSourceDao.ts`

- [ ] **Step 1: 创建 DAO 文件**

```typescript
import type { BudgetSource } from '@/types'

export function getAllBudgetSources(projectId: string): BudgetSource[] {
  const stmt = window.db.prepare(`
    SELECT id, project_id as projectId, label, amount, used_amount as usedAmount,
           created_at as createdAt, updated_at as updatedAt
    FROM budget_sources WHERE project_id = ? ORDER BY created_at ASC
  `)
  return stmt.bind([projectId]).all() as BudgetSource[]
}

export function insertBudgetSource(source: Omit<BudgetSource, 'createdAt' | 'updatedAt'>): void {
  const now = new Date().toISOString()
  const stmt = window.db.prepare(`
    INSERT INTO budget_sources (id, project_id, label, amount, used_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run([source.id, source.projectId, source.label, source.amount, source.usedAmount, now, now])
}

export function updateBudgetSource(id: string, updates: Partial<BudgetSource>): void {
  const sets: string[] = []
  const values: (string | number)[] = []

  if (updates.label !== undefined) {
    sets.push('label = ?')
    values.push(updates.label)
  }
  if (updates.amount !== undefined) {
    sets.push('amount = ?')
    values.push(updates.amount)
  }
  if (updates.usedAmount !== undefined) {
    sets.push('used_amount = ?')
    values.push(updates.usedAmount)
  }

  if (sets.length === 0) return

  sets.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  const stmt = window.db.prepare(`UPDATE budget_sources SET ${sets.join(', ')} WHERE id = ?`)
  stmt.run(values)
}

export function deleteBudgetSource(id: string): void {
  const stmt = window.db.prepare('DELETE FROM budget_sources WHERE id = ?')
  stmt.run([id])
}

export function deleteBudgetSourcesByProject(projectId: string): void {
  const stmt = window.db.prepare('DELETE FROM budget_sources WHERE project_id = ?')
  stmt.run([projectId])
}
```

- [ ] **Step 2: 提交**

```bash
git add src/db/budgetSourceDao.ts
git commit -m "feat(budget): add budgetSourcesDao for source CRUD"
```

---

### Task 3: 初始化 budget_sources 表

**Files:**
- Modify: `src/db/index.ts`

- [ ] **Step 1: 添加表初始化**

找到表初始化代码，添加：

```typescript
window.db.run(`
  CREATE TABLE IF NOT EXISTS budget_sources (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    amount REAL DEFAULT 0,
    used_amount REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)
```

- [ ] **Step 2: 提交**

```bash
git add src/db/index.ts
git commit -m "feat(budget): add budget_sources table initialization"
```

---

### Task 4: 重构 ProjectDetail 预算区域 UI

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

- [ ] **Step 1: 添加来源 state**

在组件内添加：

```typescript
const [budgetSources, setBudgetSources] = useState<BudgetSource[]>([])
const [editingSourceId, setEditingSourceId] = useState<string | null>(null)

// 加载来源
useEffect(() => {
  if (project) {
    const sources = getAllBudgetSources(project.id)
    setBudgetSources(sources)
  }
}, [project])
```

- [ ] **Step 2: 添加来源操作函数**

```typescript
const addBudgetSource = () => {
  const newSource: BudgetSource = {
    id: crypto.randomUUID(),
    projectId: project.id,
    label: '新来源',
    amount: 0,
    usedAmount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  insertBudgetSource(newSource)
  setBudgetSources([...budgetSources, newSource])
}

const updateSource = (id: string, updates: Partial<BudgetSource>) => {
  updateBudgetSource(id, updates)
  setBudgetSources(budgetSources.map(s => s.id === id ? { ...s, ...updates } : s))
}

const removeSource = (id: string) => {
  if (budgetSources.length <= 1) return // 至少保留一项
  deleteBudgetSource(id)
  setBudgetSources(budgetSources.filter(s => s.id !== id))
}
```

- [ ] **Step 3: 计算汇总数据**

```typescript
const totalBudget = budgetSources.reduce((sum, s) => sum + s.amount, 0)
const totalUsed = budgetSources.reduce((sum, s) => sum + s.usedAmount, 0)
const budgetPercent = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0
```

- [ ] **Step 4: 替换预算区域 UI**

将原来显示 totalAmount/usedAmount 的部分替换为来源列表：

```typescript
<div className="bg-white border border-outline rounded-xl p-6 h-full flex flex-col justify-between shadow-card">
  <div>
    <h3 className="text-sm font-body font-medium text-on-surface-secondary mb-4">预算统计</h3>

    {/* 来源列表 */}
    <div className="space-y-3">
      {budgetSources.map(source => (
        <div key={source.id} className="flex items-center gap-2">
          {isReadOnly ? (
            <>
              <span className="text-sm flex-1">{source.label}</span>
              <span className="text-sm text-on-surface-tertiary">
                {formatCurrency(source.usedAmount)}
              </span>
            </>
          ) : (
            <>
              <input
                value={source.label}
                onChange={e => updateSource(source.id, { label: e.target.value })}
                className="flex-1 px-2 py-1 border border-outline rounded text-sm"
              />
              <input
                value={source.usedAmount}
                onChange={e => updateSource(source.id, { usedAmount: Number(e.target.value) })}
                className="w-24 px-2 py-1 border border-outline rounded text-sm text-right"
              />
              <button
                onClick={() => removeSource(source.id)}
                className="text-red-500 text-xs hover:underline"
              >
                删除
              </button>
            </>
          )}
        </div>
      ))}

      {!isReadOnly && (
        <button
          onClick={addBudgetSource}
          className="text-xs text-primary-500 hover:underline mt-2"
        >
          + 新增来源
        </button>
      )}
    </div>

    {/* 汇总信息 */}
    <div className="mt-6 pt-4 border-t border-outline">
      <div className="flex justify-between text-xs text-on-surface-tertiary mb-2">
        <span>总额</span>
        <span className="text-sm font-medium text-on-surface-primary">
          {formatCurrency(totalBudget)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-on-surface-tertiary mb-2">
        <span>已使用</span>
        <span className="text-sm font-medium text-on-surface-primary">
          {formatCurrency(totalUsed)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-on-surface-tertiary">执行率</span>
        <span className="text-lg font-heading font-bold text-primary-500">
          {budgetPercent}%
        </span>
      </div>
      <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden mt-2">
        <div
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${budgetPercent}%` }}
        />
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 5: 提交**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat(budget): refactor budget section with multiple sources"
```

---

### Task 5: 迁移现有项目数据

**Files:**
- Modify: `src/db/index.ts`

- [ ] **Step 1: 为现有项目创建默认来源**

在数据库初始化时，为已有项目添加默认来源：

```typescript
// 为没有来源的已有项目创建默认来源
const existingProjects = window.db.prepare('SELECT id, totalAmount, usedAmount FROM projects').all() as Project[]
const existingSources = window.db.prepare('SELECT DISTINCT project_id FROM budget_sources').all() as { project_id: string }[]

const projectsWithSources = new Set(existingSources.map(s => s.project_id))
for (const project of existingProjects) {
  if (!projectsWithSources.has(project.id)) {
    const now = new Date().toISOString()
    window.db.run(`
      INSERT INTO budget_sources (id, project_id, label, amount, used_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [crypto.randomUUID(), project.id, '默认来源', project.totalAmount || 0, project.usedAmount || 0, now, now])
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/db/index.ts
git commit -m "feat(budget): migrate existing projects to budget sources"
```

---

## 验证步骤

1. 打开项目详情页
2. 点击编辑按钮进入编辑状态
3. 验证预算区域显示来源列表
4. 测试新增来源
5. 测试编辑 label 和金额
6. 测试删除来源（至少保留一项）
7. 验证执行率正确计算
8. 切换只读模式验证显示正确