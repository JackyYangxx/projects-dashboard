# 导入导出功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Dashboard 页面新增"导入"/"导出"按钮，支持 Excel 批量导入导出项目；新增 `leader` 字段并与 `team[0]` 联动。

**Architecture:**
- `leader` 作为独立字段存入数据库，与 `team[0]` 始终保持同步
- 使用 `xlsx` (SheetJS) 客户端处理 Excel 解析和生成
- DAO 层新增 `upsert` 方法支持按 name 覆盖或新建

**Tech Stack:** React + TypeScript + sql.js + xlsx (SheetJS) + Zustand

---

## 1. 安装 xlsx 依赖

- Modify: `package.json`

- [ ] **Step 1: 安装 xlsx 包**

Run: `npm install xlsx && npm install -D @types/xlsx`

---

## 2. 数据库新增 leader 列

- Modify: `src/db/index.ts:34-54`（CREATE TABLE 部分）
- Modify: `src/db/index.ts:57-98`（seed 逻辑中插入 leader）

- [ ] **Step 1: 在 CREATE TABLE 中新增 leader 列**

在 `db/index.ts` 表创建语句中添加 `leader TEXT DEFAULT ''`：

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_line TEXT DEFAULT '',
  status TEXT DEFAULT 'ongoing',
  tag TEXT DEFAULT '',
  total_amount REAL DEFAULT 0,
  used_amount REAL DEFAULT 0,
  progress INTEGER DEFAULT 0,
  sub_progress TEXT DEFAULT '{}',
  notes TEXT DEFAULT '',
  note_history TEXT DEFAULT '[]',
  team TEXT DEFAULT '[]',
  scope TEXT DEFAULT '[]',
  milestones TEXT DEFAULT '[]',
  timeline TEXT DEFAULT '[]',
  leader TEXT DEFAULT '',   -- 新增
  created_at TEXT,
  updated_at TEXT
)
```

- [ ] **Step 2: 确认 seed 数据插入语句包含 leader 列**

在 seed 插入部分，确认 INSERT 语句列出了 `leader` 字段（第 70 行附近），VALUES 中添加 `project.leader`。

---

## 3. types/index.ts 新增 leader 字段

- Modify: `src/types/index.ts`

- [ ] **Step 1: 在 Project 接口中添加 leader 字段**

在 `src/types/index.ts` 的 `Project` 接口中添加：

```typescript
export interface Project {
  id: string
  name: string
  productLine: string
  status: 'ongoing' | 'completed' | 'paused'
  tag: string
  totalAmount: number
  usedAmount: number
  progress: number
  subProgress: SubProgress
  notes: string
  noteHistory: NoteHistory[]
  team: TeamMember[]
  scope: ScopeItem[]
  milestones: Milestone[]
  timeline: TimelineEvent[]
  leader: string  // 新增：项目负责人
  createdAt: string
  updatedAt: string
}
```

---

## 4. projectDao.ts 支持 leader 字段和 upsert 方法

- Modify: `src/db/projectDao.ts`

- [ ] **Step 1: 更新 findAll 解析 leader 字段**

在 `src/db/projectDao.ts:39-57` 的 findAll 中，添加：

```typescript
return {
  // ...existing fields
  leader: rowObj.leader as string,
}
```

- [ ] **Step 2: 更新 findById 解析 leader 字段**

在 `src/db/projectDao.ts:76-93` 的 findById 中，添加：

```typescript
return {
  // ...existing fields
  leader: row.leader as string,
}
```

- [ ] **Step 3: 更新 create 支持 leader 和 team 联动**

在 `src/db/projectDao.ts:97-130` 的 create 中，INSERT 语句添加 `leader` 列，VALUES 添加 `project.leader`。

同时，在创建项目时，如果 `project.team` 为空但 `project.leader` 有值，应自动创建一个 TeamMember 作为 team[0]。

- [ ] **Step 4: 更新 update 支持 leader 字段**

在 `src/db/projectDao.ts:133-201` 的 update 中，添加 leader 的处理：

```typescript
if (updates.leader !== undefined) {
  setClauses.push('leader = ?')
  values.push(updates.leader)
}
```

- [ ] **Step 5: 新增 upsert 方法（按 name 覆盖或新建）**

在 `src/db/projectDao.ts` 末尾添加：

```typescript
export function upsert(projectData: {
  name: string
  productLine: string
  leader: string
  status: Project['status']
  progress: number
  totalAmount: number
  usedAmount: number
}): Project {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  // 按 name 查找现有项目
  const existing = db.exec(
    'SELECT id, team FROM projects WHERE name = ?',
    [projectData.name]
  )

  // 联动 leader 与 team[0]
  const leaderAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(projectData.leader)}`
  const now = new Date().toISOString()

  if (existing.length > 0 && existing[0].values.length > 0) {
    // 存在 → 覆盖更新（保留 id, created_at，同步 leader 和 team[0]）
    const existingId = existing[0].values[0][0] as string
    let existingTeam: TeamMember[] = []
    try {
      existingTeam = JSON.parse(existing[0].values[0][1] as string || '[]')
    } catch {}

    const updatedTeam: TeamMember[] = existingTeam.length > 0
      ? [{ ...existingTeam[0], name: projectData.leader, avatar: leaderAvatar }]
      : [{ id: crypto.randomUUID(), name: projectData.leader, role: '负责人', avatar: leaderAvatar }]

    db.run(
      `UPDATE projects SET product_line = ?, status = ?, total_amount = ?, used_amount = ?,
       progress = ?, leader = ?, team = ?, updated_at = ? WHERE id = ?`,
      [
        projectData.productLine,
        projectData.status,
        projectData.totalAmount,
        projectData.usedAmount,
        projectData.progress,
        projectData.leader,
        JSON.stringify(updatedTeam),
        now,
        existingId,
      ]
    )
    return { ...findById(existingId)! }
  } else {
    // 不存在 → 新建
    const newTeam: TeamMember[] = [{
      id: crypto.randomUUID(),
      name: projectData.leader,
      role: '负责人',
      avatar: leaderAvatar,
    }]
    const newProject = {
      name: projectData.name,
      productLine: projectData.productLine,
      status: projectData.status,
      tag: '',
      totalAmount: projectData.totalAmount,
      usedAmount: projectData.usedAmount,
      progress: projectData.progress,
      subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
      notes: '',
      noteHistory: [],
      team: newTeam,
      scope: [],
      milestones: [],
      timeline: [],
      leader: projectData.leader,
    }
    return create(newProject)
  }
}
```

---

## 5. seedData.ts 补充 leader 字段

- Modify: `src/data/seedData.ts`

- [ ] **Step 1: 为每个 seed 项目添加 leader 字段**

在 `src/data/seedData.ts` 中，为每个项目添加 `leader` 字段（取 team[0].name）：

| 项目 | leader |
|---|---|
| 战略品牌重塑 | 张明 |
| 次世代界面设计 | 王芳 |
| 全球扩张路线图 | 空字符串 |

```typescript
export const seedProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    // ...
    team: [/* ... */],
    leader: '张明',  // 新增
  },
  {
    // ...
    team: [/* ... */],
    leader: '王芳',  // 新增
  },
  {
    // ...
    team: [],
    leader: '',  // 新增
  },
]
```

---

## 6. ProjectTable.tsx 显示 leader 字段

- Modify: `src/components/ProjectTable.tsx:217`

- [ ] **Step 1: 将 team[0]?.name 改为 leader**

将 `project.team[0]?.name || '-'` 替换为 `project.leader || '-'`

```typescript
// 原来
{project.team[0]?.name || '-'}

// 改为
{project.leader || '-'}
```

---

## 7. ProjectForm.tsx 实现 leader 与 team[0] 联动

- Modify: `src/pages/ProjectForm.tsx`

- [ ] **Step 1: 确认 formData 已有 leader 字段**

检查 `formData` 是否有 `leader` 字段（应该已有），确认表单 JSX 中有 leader 输入框。

- [ ] **Step 2: 修改提交逻辑，同步 leader 到 team[0]**

在表单提交处理中，确保 `leader` 写入 leader 字段，同时同步 team[0]：

```typescript
const leaderAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.leader.trim())}`
const updatedTeam: TeamMember[] = formData.leader.trim()
  ? [{
      id: team[0]?.id || crypto.randomUUID(),
      name: formData.leader.trim(),
      role: team[0]?.role || '负责人',
      avatar: leaderAvatar,
    }]
  : []

// 提交时同时更新 leader 和 team
await updateProject(projectId, {
  ...formData,
  leader: formData.leader.trim(),
  team: updatedTeam,
})
```

如果表单是新建项目，同样逻辑。

---

## 8. ProjectDetail.tsx 新增项目负责人展示

- Modify: `src/pages/ProjectDetail.tsx`

- [ ] **Step 1: 找到战略团队区块，在其上方或附近新增负责人展示区**

在 ProjectDetail 页面找到"战略团队"区块，在其上方添加"项目负责人"展示行：

```tsx
{project.leader && (
  <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-surface-base rounded-xl">
    <span className="material-symbols-outlined text-primary-500">person</span>
    <div>
      <p className="text-xs font-body text-on-surface-tertiary">项目负责人</p>
      <p className="text-sm font-body font-medium text-on-surface-primary">{project.leader}</p>
    </div>
  </div>
)}
```

---

## 9. Dashboard.tsx 新增导入导出按钮

- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: 安装 xlsx 后，在 Dashboard.tsx 顶部添加 import**

```typescript
import * as XLSX from 'xlsx'
```

- [ ] **Step 2: 在新增项目按钮旁添加导入/导出按钮**

在 Dashboard 标题栏区域（第 87-93 行附近），新增两个按钮：

```tsx
<button
  onClick={handleImport}
  className="flex items-center gap-2 px-4 py-2 bg-white border border-outline text-on-surface-primary rounded-xl text-sm font-body font-medium hover:bg-surface-hover transition-all duration-200 cursor-pointer"
>
  <span className="material-symbols-outlined text-lg">upload_file</span>
  导入
</button>

<button
  onClick={handleExport}
  className="flex items-center gap-2 px-4 py-2 bg-white border border-outline text-on-surface-primary rounded-xl text-sm font-body font-medium hover:bg-surface-hover transition-all duration-200 cursor-pointer"
>
  <span className="material-symbols-outlined text-lg">download</span>
  导出
</button>
```

- [ ] **Step 3: 实现 handleImport 函数**

```typescript
const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

        // 验证表头
        const requiredHeaders = ['项目名称', '产品线', '负责人', '状态', '项目进展', '总预算', '已用预算']
        const headers = Object.keys(json[0] || {})
        const missing = requiredHeaders.filter(h => !headers.includes(h))
        if (missing.length > 0) {
          alert(`缺少必要字段：${missing.join(', ')}`)
          return
        }

        // 状态映射
        const statusMap: Record<string, Project['status']> = {
          '进行中': 'ongoing',
          '已完成': 'completed',
          '暂停中': 'paused',
        }

        let successCount = 0
        let skipCount = 0

        for (const row of json) {
          const name = String(row['项目名称'] || '').trim()
          const leader = String(row['负责人'] || '').trim()
          if (!name || !leader) { skipCount++; continue }

          const statusKey = String(row['状态'] || '进行中')
          const status = statusMap[statusKey] || 'ongoing'
          if (!['ongoing', 'completed', 'paused'].includes(status)) { skipCount++; continue }

          const progress = Number(row['项目进展']) || 0
          const totalAmount = Number(row['总预算']) || 0
          const usedAmount = Number(row['已用预算']) || 0

          upsert({ name, productLine: String(row['产品线'] || ''), leader, status, progress, totalAmount, usedAmount })
          successCount++
        }

        loadProjects()
        alert(`导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条`)
      } catch {
        alert('文件解析失败，请确认是有效的 Excel 文件')
      }
    }
    reader.readAsArrayBuffer(file)
  }
  input.click()
}
```

- [ ] **Step 4: 实现 handleExport 函数**

```typescript
const handleExport = () => {
  const exportData = projects.map(p => ({
    '项目名称': p.name,
    '产品线': p.productLine,
    '负责人': p.leader,
    '状态': p.status === 'ongoing' ? '进行中' : p.status === 'completed' ? '已完成' : '暂停中',
    '项目进展': p.progress,
    '总预算': p.totalAmount,
    '已用预算': p.usedAmount,
    '预算执行率': p.totalAmount > 0 ? Math.round((p.usedAmount / p.totalAmount) * 100) : 0,
  }))

  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '项目列表')
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `projects_${date}.xlsx`)
}
```

- [ ] **Step 5: 导入 upsert 方法**

在 Dashboard.tsx 顶部添加：

```typescript
import { upsert } from '@/db/projectDao'
```

---

## 10. 验证与提交

- [ ] **Step 1: 运行构建验证 TypeScript 无错误**

Run: `npm run build`
Expected: 无 TypeScript 错误

- [ ] **Step 2: 提交所有更改**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add import/export Excel support and leader field

- Add xlsx dependency for Excel parsing/generation
- Add leader field to Project type and database
- Sync leader with team[0] on import and form submit
- ProjectTable displays leader field
- ProjectDetail shows leader section
- Dashboard: import (upsert by name) and export buttons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Spec 覆盖自查

| Spec 需求 | 对应任务 |
|---|---|
| leader 字段与 team[0] 联动 | Task 4, 7 |
| 数据库新增 leader 列 | Task 2 |
| types/index.ts 新增 leader | Task 3 |
| ProjectTable 显示 leader | Task 6 |
| ProjectDetail 新增负责人展示 | Task 8 |
| 导入：按 name 覆盖或新建 | Task 4 Step 5, Task 9 Step 3 |
| 导出：全部项目 + 计算列 | Task 9 Step 4 |
| 按钮位置在新增项目旁 | Task 9 Step 2 |
| 状态中文→英文映射 | Task 9 Step 3 |
| 错误处理（缺少字段、跳过行） | Task 9 Step 3 |

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-18-import-export-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
