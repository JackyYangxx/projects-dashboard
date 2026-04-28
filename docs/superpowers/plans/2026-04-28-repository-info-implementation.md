# 代码仓信息功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为项目详情页添加代码仓和分支信息字段，支持创建、编辑、导入导出时管理

**Architecture:** 在 Project 类型中添加 repository 和 branch 字段；在 ProjectDetail 页面添加展示/编辑卡片；在 ProjectForm 添加输入框；更新导入导出逻辑

**Tech Stack:** React + TypeScript + sql.js (SQLite in WASM)

---

## 文件结构

- Modify: `src/types/index.ts` - 添加 repository, branch 字段
- Modify: `src/constants/project.ts` - 添加导入可选列
- Modify: `src/pages/ProjectDetail.tsx` - 添加代码仓信息卡片
- Modify: `src/pages/ProjectForm.tsx` - 添加代码仓和分支输入框
- Modify: `src/db/projectDao.ts` - 处理新字段的 CRUD
- Modify: `src/data/seedData.ts` - 添加 repository 和 branch

---

## Task 1: 修改 Project 类型

**Files:**
- Modify: `src/types/index.ts:45-64`

- [ ] **Step 1: 添加 repository 和 branch 字段到 Project 接口**

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
  leader: string
  repository: string   // 新增
  branch: string       // 新增
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add repository and branch fields to Project type"
```

---

## Task 2: 修改 seedData 添加默认值

**Files:**
- Modify: `src/data/seedData.ts`

- [ ] **Step 1: 为每个示例项目添加 repository 和 branch 字段**

从 seedData.ts 中找到三个示例项目，添加：
```typescript
repository: 'https://github.com/example/project-a',
branch: 'main',
```

- [ ] **Step 2: Commit**

```bash
git add src/data/seedData.ts
git commit -m "feat: add repository and branch to seed data"
```

---

## Task 3: 修改 projectDao 处理新字段

**Files:**
- Read: `src/db/projectDao.ts`

- [ ] **Step 1: 检查 projectDao 的 CREATE TABLE 和 INSERT 语句**

确保 SQL 表包含 repository 和 branch 列，INSERT 语句包含这两个字段。

- [ ] **Step 2: 如需要，添加迁移或更新 SQL**

- [ ] **Step 3: Commit**

```bash
git add src/db/projectDao.ts
git commit -m "feat: support repository and branch in projectDao"
```

---

## Task 4: 修改 ProjectForm 添加输入框

**Files:**
- Modify: `src/pages/ProjectForm.tsx`

- [ ] **Step 1: 在 formData 中添加 repository 和 branch**

```typescript
const [formData, setFormData] = useState({
  name: '',
  productLine: '',
  status: 'ongoing' as Project['status'],
  leader: '',
  totalAmount: 0,
  usedAmount: 0,
  repository: '',  // 新增
  branch: '',     // 新增
})
```

- [ ] **Step 2: 在 handleSubmit 中包含 repository 和 branch**

```typescript
await addProject({
  // ... existing fields
  repository: formData.repository,
  branch: formData.branch,
})
```

- [ ] **Step 3: 在 JSX 中添加两个输入框**

在"负责人"输入框之后添加：
```tsx
<div>
  <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">代码仓</label>
  <input
    type="text"
    value={formData.repository}
    onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
    className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
    placeholder="https://github.com/org/repo"
  />
</div>

<div>
  <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">分支</label>
  <input
    type="text"
    value={formData.branch}
    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
    className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
    placeholder="main"
  />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectForm.tsx
git commit -m "feat: add repository and branch fields to ProjectForm"
```

---

## Task 5: 修改 ProjectDetail 添加代码仓信息卡片

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

- [ ] **Step 1: 在 ProjectDetail 中添加编辑状态和相关处理函数**

添加：
```typescript
const [repoEditRepository, setRepoEditRepository] = useState('')
const [repoEditBranch, setRepoEditBranch] = useState('')
const [isRepoEditing, setIsRepoEditing] = useState(false)

// 初始化编辑状态
useEffect(() => {
  if (project) {
    setRepoEditRepository(project.repository || '')
    setRepoEditBranch(project.branch || '')
  }
}, [project])
```

- [ ] **Step 2: 在顶部导航栏下方添加代码仓信息卡片（在"进度跟踪"卡片上方）**

在 return JSX 中找到 `<main>` 内部，在 Row 1 (Progress Tracking) 之前添加：

```tsx
{/* Row 0: Repository Info Card */}
<div className="col-span-12">
  <div className="bg-surface-elevated rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-body font-medium text-on-surface-secondary flex items-center gap-2">
        <span className="material-symbols-outlined">folder_copy</span>
        代码仓信息
      </h3>
      {!isReadOnly && !isRepoEditing && (
        <button
          onClick={() => setIsRepoEditing(true)}
          className="px-3 py-1.5 text-xs font-body font-medium text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
        >
          编辑
        </button>
      )}
    </div>

    {isRepoEditing ? (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-body text-on-surface-tertiary mb-1.5">代码仓</label>
          <input
            type="text"
            value={repoEditRepository}
            onChange={(e) => setRepoEditRepository(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateProject(project.id, { repository: repoEditRepository, branch: repoEditBranch, updatedAt: new Date().toISOString() })
                setIsRepoEditing(false)
              } else if (e.key === 'Escape') {
                setRepoEditRepository(project.repository || '')
                setRepoEditBranch(project.branch || '')
                setIsRepoEditing(false)
              }
            }}
            className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
            placeholder="https://github.com/org/repo"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-body text-on-surface-tertiary mb-1.5">分支</label>
          <input
            type="text"
            value={repoEditBranch}
            onChange={(e) => setRepoEditBranch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateProject(project.id, { repository: repoEditRepository, branch: repoEditBranch, updatedAt: new Date().toISOString() })
                setIsRepoEditing(false)
              } else if (e.key === 'Escape') {
                setRepoEditRepository(project.repository || '')
                setRepoEditBranch(project.branch || '')
                setIsRepoEditing(false)
              }
            }}
            className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
            placeholder="main"
          />
        </div>
        <div className="col-span-2 flex justify-end gap-2 mt-2">
          <button
            onClick={() => {
              setRepoEditRepository(project.repository || '')
              setRepoEditBranch(project.branch || '')
              setIsRepoEditing(false)
            }}
            className="px-3 py-1.5 border border-outline rounded-lg text-xs font-body text-on-surface-primary hover:bg-surface-container"
          >
            取消
          </button>
          <button
            onClick={() => {
              updateProject(project.id, { repository: repoEditRepository, branch: repoEditBranch, updatedAt: new Date().toISOString() })
              setIsRepoEditing(false)
            }}
            className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-body font-medium hover:bg-primary-600"
          >
            保存
          </button>
        </div>
      </div>
    ) : (
      <div className="text-sm font-body text-on-surface-primary">
        {project.repository || project.branch ? (
          <span>
            {project.repository && <span className="font-mono">{project.repository}</span>}
            {project.repository && project.branch && <span className="text-on-surface-tertiary mx-1">@</span>}
            {project.branch && <span className="font-mono">{project.branch}</span>}
          </span>
        ) : (
          <span className="text-on-surface-tertiary">未设置代码仓</span>
        )}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat: add repository info card to ProjectDetail"
```

---

## Task 6: 更新导入逻辑

**Files:**
- Find import handling code (likely in a utility or Dashboard page)

- [ ] **Step 1: 找到导入逻辑代码**

搜索 `import` 关键词找到导入处理位置。

- [ ] **Step 2: 添加对 repository 和 branch 字段的处理**

确保导入时这两个字段为选填，缺失则为空字符串。

- [ ] **Step 3: Commit**

```bash
git add [找到的导入文件]
git commit -m "feat: support repository and branch in import"
```

---

## Task 7: 更新导出逻辑

**Files:**
- Find export handling code

- [ ] **Step 1: 找到导出逻辑代码**

搜索 `export` 关键词找到导出处理位置。

- [ ] **Step 2: 添加 repository 和 branch 到 CSV 导出列**

- [ ] **Step 3: Commit**

```bash
git add [找到的导出文件]
git commit -m "feat: support repository and branch in export"
```

---

## Task 8: 更新 IMPORT_REQUIRED_HEADERS

**Files:**
- Modify: `src/constants/project.ts`

- [ ] **Step 1: 添加可选导入列常量（如果需要区分必填和选填）**

```typescript
export const IMPORT_OPTIONAL_HEADERS = [
  '代码仓',
  '分支',
] as const
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/project.ts
git commit -m "feat: add optional import headers for repository and branch"
```

---

## 验证清单

- [ ] 项目创建时可填写代码仓和分支
- [ ] 项目详情页查看态显示代码仓信息（格式：`repo @ branch` 或"未设置代码仓"）
- [ ] 项目详情页编辑态可编辑代码仓和分支
- [ ] 导入时代码仓和分支非必填
- [ ] 导出时包含代码仓和分支列
