# Custom Project ID & Ext Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `projectId` (custom project number) + 5 reserved ext fields (`ext1`~`ext5`) to the Project model across all layers.

**Architecture:** Straightforward column additions flowing through sql.js DB → Zustand store → React components. `projectId` appears in forms, detail view, table, and import/export. Ext fields are data-layer only, reserving space for future UI use.

**Tech Stack:** TypeScript, sql.js (SQLite), Zustand, React

---

### Task 1: Types — Add fields to Project interface

**Files:**
- Modify: `src/types/index.ts:64-84`

- [ ] **Add `projectId` and `ext1`~`ext5` to the Project interface**

Edit the `Project` interface in `src/types/index.ts`:

```typescript
export interface Project {
  id: string
  projectId: string    // <-- add after id
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
  repositories: Repository[]
  ext1: string         // <-- add after repositories (before createdAt)
  ext2: string
  ext3: string
  ext4: string
  ext5: string
  createdAt: string
  updatedAt: string
}
```

### Task 2: DB schema — Add columns to projects table

**Files:**
- Modify: `src/db/index.ts:48-70`

- [ ] **Add `project_id`, `ext1`~`ext5` columns to CREATE TABLE**

Edit the CREATE TABLE statement in `src/db/index.ts`:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_id TEXT DEFAULT '',  -- <-- add after id
  name TEXT NOT NULL,
  ...
  repositories TEXT DEFAULT '[]',
  ext1 TEXT DEFAULT '',        -- <-- add after repositories
  ext2 TEXT DEFAULT '',
  ext3 TEXT DEFAULT '',
  ext4 TEXT DEFAULT '',
  ext5 TEXT DEFAULT '',
  created_at TEXT,
  updated_at TEXT
)
```

### Task 3: DAO — Handle all new fields in CRUD

**Files:**
- Modify: `src/db/projectDao.ts`

- [ ] **Update `findAll()` — map new columns (around line 40-60)**

Add to the rowObj mapping:
```typescript
projectId: rowObj.project_id as string,
ext1: rowObj.ext1 as string,
ext2: rowObj.ext2 as string,
ext3: rowObj.ext3 as string,
ext4: rowObj.ext4 as string,
ext5: rowObj.ext5 as string,
```

- [ ] **Update `findById()` — map new columns (around line 79-99)**

Same additions:
```typescript
projectId: row.project_id as string,
ext1: row.ext1 as string,
ext2: row.ext2 as string,
ext3: row.ext3 as string,
ext4: row.ext4 as string,
ext5: row.ext5 as string,
```

- [ ] **Update `create()` — include new columns in INSERT (around line 120-147)**

Add to the INSERT column list:
```sql
project_id, ext1, ext2, ext3, ext4, ext5
```

Add to the VALUES array:
```typescript
project.projectId || '',
project.ext1 || '',
project.ext2 || '',
project.ext3 || '',
project.ext4 || '',
project.ext5 || '',
```

- [ ] **Update `update()` — handle new fields (around line 151-228)**

Add after the `repositories` block:
```typescript
if (updates.projectId !== undefined) {
  setClauses.push('project_id = ?')
  values.push(updates.projectId)
}
if (updates.ext1 !== undefined) {
  setClauses.push('ext1 = ?')
  values.push(updates.ext1)
}
if (updates.ext2 !== undefined) {
  setClauses.push('ext2 = ?')
  values.push(updates.ext2)
}
if (updates.ext3 !== undefined) {
  setClauses.push('ext3 = ?')
  values.push(updates.ext3)
}
if (updates.ext4 !== undefined) {
  setClauses.push('ext4 = ?')
  values.push(updates.ext4)
}
if (updates.ext5 !== undefined) {
  setClauses.push('ext5 = ?')
  values.push(updates.ext5)
}
```

- [ ] **Update `upsert()` — handle new fields (around line 237-335)**

No changes needed to the function signature. The `projectId`, `ext1`~`ext5` are already on the `Project` type and will flow through the stored procedure via `create()` and `update()` as they're covered above.

### Task 4: Seed data — Add projectIds to demo projects

**Files:**
- Modify: `src/data/seedData.ts`

- [ ] **Add `projectId` to each seed project**

```typescript
export const seedProjects = [
  {
    projectId: 'PRJ-2026-001',   // <-- add
    name: '战略品牌重塑',
    ...
  },
  {
    projectId: 'PRJ-2026-002',   // <-- add
    name: '次世代界面设计',
    ...
  },
  {
    projectId: 'PRJ-2026-003',   // <-- add
    name: '全球扩张路线图',
    ...
  },
]
```

### Task 5: Constants — Add projectId to import headers

**Files:**
- Modify: `src/constants/project.ts`

- [ ] **Add `项目编号` to IMPORT_OPTIONAL_HEADERS**

```typescript
export const IMPORT_OPTIONAL_HEADERS = [
  '项目编号',           // <-- add
  '代码仓1', '分支1', '备注1',
  '代码仓2', '分支2', '备注2',
  '代码仓3', '分支3', '备注3',
] as const
```

### Task 6: ProjectForm — Add projectId input field

**Files:**
- Modify: `src/pages/ProjectForm.tsx`

- [ ] **Add `projectId` to form state (around line 12-21)**

```typescript
const [formData, setFormData] = useState({
  projectId: '',       // <-- add
  name: '',
  ...
})
```

- [ ] **Add input field to form JSX after "项目名称" field (after line 91)**

```tsx
<div>
  <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">
    项目编号
  </label>
  <input
    type="text"
    value={formData.projectId}
    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
    className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
    placeholder="输入项目编号，如 PRJ-2026-001"
  />
</div>
```

- [ ] **Pass `projectId` to `addProject` call (around line 37-56)**

```typescript
await addProject({
  projectId: formData.projectId,
  name: formData.name,
  ...
})
```

### Task 7: ProjectDetail — Show projectId in header

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

- [ ] **Display projectId next to the truncated UUID (around line 263-265)**

Replace the UUID-only display:
```tsx
<span className="text-xs font-body text-on-surface-tertiary font-mono">
  #{project.id.slice(0, 8)}
</span>
```

With projectId + UUID:
```tsx
<span className="text-xs font-body text-on-surface-tertiary font-mono">
  {project.projectId ? `${project.projectId} · ` : ''}#{project.id.slice(0, 8)}
</span>
```

### Task 8: ProjectTable — Add projectId column

**Files:**
- Modify: `src/components/ProjectTable.tsx`

- [ ] **Add "项目编号" column header after "项目" (after line 126)**

```tsx
<th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
  项目编号
</th>
```

- [ ] **Add projectId cell data after the project name cell (after line 193)**

```tsx
<td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
  <span className="text-xs font-mono text-on-surface-secondary">
    {project.projectId || '—'}
  </span>
</td>
```

- [ ] **Update colSpan from 7 to 8 in empty row**

```tsx
<td colSpan={8} ...>
```

### Task 9: Dashboard import/export — Handle projectId

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Read `项目编号` from imported rows (around line 168-218)**

In the import loop, after reading `name`:
```typescript
const projectCode = String(row['项目编号'] || '').trim()
```

Pass to `upsert()`:
```typescript
upsert({
  projectId: projectCode,
  ...
})
```

- [ ] **Include projectId in export data (around line 252-283)**

```typescript
const exportData = projects.map(p => ({
  '项目编号': p.projectId || '',
  '项目名称': p.name,
  ...
}))
```

- [ ] **Include projectId in download template (around line 232-249)**

```typescript
const requiredHeaders = ['项目名称', '项目编号', '产品线', '负责人', '总预算', '已用预算']
const sampleRow = ['示例项目', 'PRJ-2026-001', '示例产品线', '张三', 100000, 50000, ...]
```

### Task 10: Update import template constants

**Files:**
- Modify: `src/constants/project.ts`

- [ ] **Add `项目编号` to `IMPORT_OPTIONAL_HEADERS`** (already done in Task 5, just verify)
