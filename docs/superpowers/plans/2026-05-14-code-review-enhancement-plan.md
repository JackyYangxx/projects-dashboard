# AI 代码评审功能增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 AI 辅助代码评审功能的增强，支持批量项目选择、MCP 获取 MR、问题记录和 Excel 导出

**Architecture:**
- 使用已有的 LLM 配置和 MCP 配置（富文本 JSON）
- AI 通过 MCP 工具获取 MR 列表和详情，分析代码问题
- 评审结果存入数据库，支持按项目 tab 切换查看
- 支持导出 Excel 和清理数据

**Tech Stack:** React + Zustand + sql.js + xlsx

---

## 文件结构

```
src/
├── pages/CodeReview.tsx           # 重构主页面
├── components/
│   ├── ProjectSelector.tsx        # 项目选择表格（新建）
│   ├── ReviewProgress.tsx         # 评审进度（新建）
│   ├── MRReviewTabs.tsx           # MR 评审结果 tabs（新建）
│   └── MCPConfigPanel.tsx         # MCP 富文本配置（新建）
├── store/codeReviewStore.ts       # 重构 store
├── types/index.ts                 # 新增 MRReviewRecord, ReviewReport 类型
├── db/
│   ├── index.ts                   # 新增表
│   └── codeReviewDao.ts           # 新增 DAO
└── utils/excel.ts                 # Excel 导出（新建）
```

---

## Task 1: 数据库和类型定义

**Files:**
- Modify: `src/types/index.ts` — 新增 MRReviewRecord, ReviewReport, MCPConfig 类型
- Modify: `src/db/index.ts` — 新增 mr_review_records, review_reports 表
- Modify: `src/db/codeReviewDao.ts` — 新增 DAO 函数

- [ ] **Step 1: 添加类型定义到 types/index.ts**

```typescript
export interface MRReviewRecord {
  id: string
  projectId: string
  projectName: string
  mrId: string
  mrTitle: string
  mrUrl: string
  status: 'pending' | 'reviewing' | 'completed' | 'failed'
  issues: Array<{
    severity: 'critical' | 'warning' | 'suggestion'
    title: string
    description: string
    filePath?: string
    lineRange?: string
  }>
  reviewedAt: string
  createdAt: string
}

export interface ReviewReport {
  id: string
  name: string
  projectIds: string
  totalMrCount: number
  totalIssueCount: number
  issuesPreview: string
  createdAt: string
}

export interface MCPConfig {
  name: string
  endpoint: string
  authHeader?: string
  tools: string[]
}
```

- [ ] **Step 2: 在 db/index.ts 添加新表**

在 `createTables()` 函数中添加：

```typescript
// mr_review_records table
db.run(`
  CREATE TABLE IF NOT EXISTS mr_review_records (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    mr_id TEXT NOT NULL,
    mr_title TEXT NOT NULL,
    mr_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    issues TEXT DEFAULT '[]',
    reviewed_at TEXT,
    created_at TEXT
  )
`)

// review_reports table
db.run(`
  CREATE TABLE IF NOT EXISTS review_reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_ids TEXT NOT NULL,
    total_mr_count INTEGER DEFAULT 0,
    total_issue_count INTEGER DEFAULT 0,
    issues_preview TEXT DEFAULT '',
    created_at TEXT
  )
`)
```

- [ ] **Step 3: 在 codeReviewDao.ts 添加 DAO 函数**

```typescript
// MR Review Records
export function insertMRReviewRecord(record: MRReviewRecord): void { ... }
export function getMRReviewRecordsByProject(projectId: string): MRReviewRecord[] { ... }
export function updateMRReviewRecord(id: string, updates: Partial<MRReviewRecord>): void { ... }
export function deleteMRReviewRecord(id: string): void { ... }
export function deleteAllMRReviewRecords(): void { ... }
export function getAllMRReviewRecords(): MRReviewRecord[] { ... }

// Review Reports
export function insertReviewReport(report: ReviewReport): void { ... }
export function getAllReviewReports(): ReviewReport[] { ... }
export function deleteReviewReport(id: string): void { ... }
```

- [ ] **Step 4: 提交**

```bash
git add src/types/index.ts src/db/index.ts src/db/codeReviewDao.ts
git commit -m "feat(code-review): add MR review types and database tables"
```

---

## Task 2: 重构 MCP 配置面板为富文本

**Files:**
- Create: `src/components/MCPConfigPanel.tsx`
- Modify: `src/pages/CodeReview.tsx` — 替换原有 MCPPanel

- [ ] **Step 1: 创建 MCPConfigPanel 组件**

```tsx
import React, { useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import Icon from './Icon'
import type { MCPConfig } from '@/types'

export default function MCPConfigPanel() {
  const { mcps, loadMCPs, addMCP, toggleMCP, removeMCP } = useCodeReviewStore()
  const [showForm, setShowForm] = useState(false)
  const [configJson, setConfigJson] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => { loadMCPs() }, [])

  const handleSave = () => {
    setParseError(null)
    try {
      const config = JSON.parse(configJson) as MCPConfig
      if (!config.name || !config.endpoint) {
        setParseError('配置必须包含 name 和 endpoint')
        return
      }
      addMCP({
        name: config.name,
        url: config.endpoint,
        authHeader: config.authHeader || '',
        tools: config.tools || [],
        enabled: true,
      })
      setConfigJson('')
      setShowForm(false)
    } catch {
      setParseError('JSON 格式错误')
    }
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">MCP 服务配置</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-primary-500 hover:underline">
          {showForm ? '取消' : '+ 新增'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          <textarea
            placeholder='粘贴 MCP 配置 JSON，例如：&#10;{"name": "GitLab MCP", "endpoint": "https://...", "authHeader": "Bearer xxx", "tools": ["listMRs", "getMRDetails"]}'
            value={configJson}
            onChange={e => { setConfigJson(e.target.value); setParseError(null) }}
            rows={8}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm font-mono"
          />
          {parseError && <div className="text-xs text-red-500">{parseError}</div>}
          <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">保存</button>
        </div>
      )}
      <ul className="space-y-2">
        {mcps.map(mcp => (
          <li key={mcp.id} className="flex items-center gap-2">
            <input type="checkbox" checked={mcp.enabled} onChange={e => toggleMCP(mcp.id, e.target.checked)} />
            <div className="flex-1">
              <span className="text-sm">{mcp.name}</span>
              <span className="block text-xs text-on-surface-tertiary truncate">{mcp.url}</span>
            </div>
            <button onClick={() => removeMCP(mcp.id)} className="text-xs text-red-500 hover:underline">删除</button>
          </li>
        ))}
        {mcps.length === 0 && <li className="text-sm text-on-surface-tertiary">暂无 MCP 配置</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: 更新 types/index.ts 中的 MCPService 类型**

```typescript
export interface MCPService {
  id: string
  name: string
  url: string
  authHeader?: string
  tools: string[]  // 新增
  enabled: boolean
  createdAt: string
}
```

- [ ] **Step 3: 更新 codeReviewDao.ts 的 MCP 相关函数**

在 `insertMCPService` 和 `getAllMCPServices` 中添加 `tools` 字段处理

- [ ] **Step 4: 更新 CodeReview.tsx 导入新组件**

```tsx
import MCPConfigPanel from '@/components/MCPConfigPanel'
// 替换原来的 MCPPanel
```

- [ ] **Step 5: 提交**

```bash
git add src/components/MCPConfigPanel.tsx src/types/index.ts src/db/codeReviewDao.ts src/pages/CodeReview.tsx
git commit -m "feat(code-review): add MCP rich config panel with JSON paste"
```

---

## Task 3: 创建项目选择表格组件

**Files:**
- Create: `src/components/ProjectSelector.tsx`

- [ ] **Step 1: 创建 ProjectSelector 组件**

```tsx
import React from 'react'
import { useProjectStore } from '@/store/projectStore'
import Icon from './Icon'

interface Props {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function ProjectSelector({ selectedIds, onChange }: Props) {
  const { projects } = useProjectStore()
  const ongoingProjects = projects.filter(p => p.status === 'ongoing')

  const allSelected = ongoingProjects.length > 0 && ongoingProjects.every(p => selectedIds.includes(p.id))
  const someSelected = ongoingProjects.some(p => selectedIds.includes(p.id))

  const toggleAll = () => {
    if (allSelected) {
      onChange([])
    } else {
      onChange(ongoingProjects.map(p => p.id))
    }
  }

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline bg-surface-secondary">
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={toggleAll}
                className="w-4 h-4"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">项目名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">产品线</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">仓库地址</th>
          </tr>
        </thead>
        <tbody>
          {ongoingProjects.map(project => (
            <tr key={project.id} className="border-b border-outline hover:bg-surface-secondary/50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(project.id)}
                  onChange={() => toggleOne(project.id)}
                  className="w-4 h-4"
                />
              </td>
              <td className="px-4 py-3 text-sm font-medium text-on-surface-primary">{project.name}</td>
              <td className="px-4 py-3 text-sm text-on-surface-secondary">{project.productLine}</td>
              <td className="px-4 py-3 text-sm text-on-surface-tertiary font-mono truncate max-w-[300px]">
                {project.repository || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ongoingProjects.length === 0 && (
        <div className="p-4 text-center text-sm text-on-surface-tertiary">暂无进行中的项目</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/ProjectSelector.tsx
git commit -m "feat(code-review): add project selector table component"
```

---

## Task 4: 创建评审进度组件

**Files:**
- Create: `src/components/ReviewProgress.tsx`

- [ ] **Step 1: 创建 ReviewProgress 组件**

```tsx
import React from 'react'

interface Props {
  currentProject: string
  currentMR: string
  progress: number // 0-100
  completedCount: number
  totalCount: number
}

export default function ReviewProgress({ currentProject, currentMR, progress, completedCount, totalCount }: Props) {
  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-on-surface-secondary">当前评审</span>
        <span className="text-xs text-on-surface-tertiary">{completedCount}/{totalCount} MR</span>
      </div>
      <div className="text-sm font-medium text-on-surface-primary mb-3">
        {currentProject} / {currentMR}
      </div>
      <div className="w-full bg-surface-secondary rounded-full h-2 mb-2">
        <div
          className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-on-surface-tertiary">{Math.round(progress)}%</div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/ReviewProgress.tsx
git commit -m "feat(code-review): add review progress component"
```

---

## Task 5: 创建 MR 评审结果 Tabs 组件

**Files:**
- Create: `src/components/MRReviewTabs.tsx`

- [ ] **Step 1: 创建 MRReviewTabs 组件**

```tsx
import React, { useState } from 'react'
import Icon from './Icon'
import type { MRReviewRecord } from '@/types'

interface Props {
  recordsByProject: Map<string, MRReviewRecord[]>
  onViewOnline: (url: string) => void
}

export default function MRReviewTabs({ recordsByProject, onViewOnline }: Props) {
  const projectNames = Array.from(recordsByProject.keys())
  const [activeProject, setActiveProject] = useState(projectNames[0] || '')
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'suggestion'>('all')

  const records = recordsByProject.get(activeProject) || []
  const filtered = filter === 'all' ? records : records.filter(r =>
    r.issues.some(i => i.severity === filter)
  )

  const issueCounts = {
    all: records.reduce((sum, r) => sum + r.issues.length, 0),
    critical: records.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0),
    warning: records.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0),
    suggestion: records.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'suggestion').length, 0),
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {projectNames.map(name => {
          const count = recordsByProject.get(name)?.reduce((sum, r) => sum + r.issues.length, 0) || 0
          return (
            <button
              key={name}
              onClick={() => setActiveProject(name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeProject === name
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-secondary text-on-surface-secondary hover:bg-surface-container'
              }`}
            >
              {name} ({count})
            </button>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'critical', 'warning', 'suggestion'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === f
                ? f === 'critical' ? 'bg-red-500 text-white'
                  : f === 'warning' ? 'bg-yellow-500 text-white'
                  : f === 'suggestion' ? 'bg-blue-500 text-white'
                  : 'bg-primary-500 text-white'
                : 'bg-surface-secondary text-on-surface-secondary'
            }`}
          >
            {f === 'all' ? '全部' : f === 'critical' ? '严重' : f === 'warning' ? '警告' : '建议'} ({issueCounts[f]})
          </button>
        ))}
      </div>

      {/* MR List */}
      <div className="space-y-3">
        {filtered.map(record => (
          <div key={record.id} className="bg-surface-elevated border border-outline rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                record.issues.some(i => i.severity === 'critical') ? 'bg-red-500'
                  : record.issues.some(i => i.severity === 'warning') ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{record.mrTitle}</div>
                <div className="text-xs text-on-surface-tertiary mt-1 flex items-center gap-2">
                  <a href={record.mrUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                    {record.mrUrl}
                  </a>
                  <span>|</span>
                  <span>{record.issues.length} 个问题</span>
                </div>
                <div className="mt-2 space-y-2">
                  {record.issues.map((issue, idx) => (
                    <div key={idx} className="text-sm bg-surface-secondary rounded-lg p-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                        issue.severity === 'critical' ? 'bg-red-500/10 text-red-600'
                          : issue.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-600'
                          : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {issue.severity === 'critical' ? '严重' : issue.severity === 'warning' ? '警告' : '建议'}
                      </span>
                      <span className="font-medium">{issue.title}</span>
                      {issue.filePath && (
                        <span className="text-xs text-on-surface-tertiary ml-2 font-mono">
                          {issue.filePath}{issue.lineRange ? `:${issue.lineRange}` : ''}
                        </span>
                      )}
                      <div className="text-xs text-on-surface-secondary mt-1">{issue.description}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onViewOnline(record.mrUrl)}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-primary-500 hover:bg-surface-container"
              >
                <Icon name="open_in_new" size={14} />
                查看线上
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-on-surface-tertiary text-center py-8">暂无问题记录</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/MRReviewTabs.tsx
git commit -m "feat(code-review): add MR review tabs component"
```

---

## Task 6: 创建 Excel 导出工具

**Files:**
- Create: `src/utils/excel.ts`
- Install: `xlsx` package

- [ ] **Step 1: 安装 xlsx**

```bash
npm install xlsx
```

- [ ] **Step 2: 创建 Excel 导出工具**

```typescript
import * as XLSX from 'xlsx'
import type { MRReviewRecord } from '@/types'

export function exportToExcel(records: MRReviewRecord[], filename: string = 'review-report.xlsx') {
  // Flatten records to rows
  const rows: Array<{
    项目名称: string
    MR链接: string
    MR标题: string
    问题标题: string
    严重程度: string
    问题描述: string
    评审时间: string
  }> = []

  for (const record of records) {
    for (const issue of record.issues) {
      rows.push({
        项目名称: record.projectName,
        MR链接: record.mrUrl,
        MR标题: record.mrTitle,
        问题标题: issue.title,
        严重程度: issue.severity === 'critical' ? '严重' : issue.severity === 'warning' ? '警告' : '建议',
        问题描述: issue.description,
        评审时间: record.reviewedAt,
      })
    }
  }

  if (rows.length === 0) {
    // Add empty row if no issues
    rows.push({
      项目名称: '', MR链接: '', MR标题: '',
      问题标题: '', 严重程度: '', 问题描述: '', 评审时间: '',
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '评审报告')
  XLSX.writeFile(workbook, filename)
}
```

- [ ] **Step 3: 提交**

```bash
git add src/utils/excel.ts
git commit -m "feat(code-review): add Excel export utility with xlsx"
```

---

## Task 7: 重构 codeReviewStore

**Files:**
- Modify: `src/store/codeReviewStore.ts`

- [ ] **Step 1: 重构 store**

```typescript
interface CodeReviewStore {
  // LLM
  llmConfigs: LLMConfig[]
  loadLLMConfigs: () => void
  addLLMConfig: (cfg: Omit<LLMConfig, 'id' | 'createdAt'>) => void
  toggleLLMConfig: (id: string, enabled: boolean) => void
  removeLLMConfig: (id: string) => void
  testLLMConfig: (url: string, apiKey: string) => Promise<{ success: boolean; message: string }>

  // MCP
  mcps: MCPService[]
  loadMCPs: () => void
  addMCP: (mcp: Omit<MCPService, 'id' | 'createdAt'>) => void
  toggleMCP: (id: string, enabled: boolean) => void
  removeMCP: (id: string) => void

  // Skills
  skills: Skill[]
  loadSkills: () => void
  addSkill: (skill: Omit<Skill, 'id' | 'createdAt'>) => void
  toggleSkill: (id: string, enabled: boolean) => void
  removeSkill: (id: string) => void

  // Project Selection
  selectedProjectIds: string[]
  selectProjects: (ids: string[]) => void

  // Review State
  isReviewing: boolean
  reviewProgress: { projectId: string; projectName: string; mrTitle: string; progress: number; completed: number; total: number } | null
  mrReviewRecords: MRReviewRecord[]
  
  startBatchReview: (projectIds: string[]) => Promise<void>
  updateReviewProgress: (progress: ReviewProgress) => void
  
  // Results
  loadMRReviewRecords: (projectId?: string) => void
  deleteMRReviewRecord: (id: string) => void
  clearAllReviewData: () => void
}

startBatchReview: async (projectIds) => {
  set({ isReviewing: true, mrReviewRecords: [], reviewProgress: null })
  
  const { mcps, skills } = get()
  const enabledMCPs = mcps.filter(m => m.enabled)
  const enabledSkills = skills.filter(s => s.enabled)
  
  if (enabledMCPs.length === 0) {
    set({ isReviewing: false, reviewError: '请配置并启用 MCP 服务' })
    return
  }
  
  // Get LLM config
  const enabledLLMs = llmConfigs.filter(c => c.enabled)
  if (enabledLLMs.length === 0) {
    set({ isReviewing: false, reviewError: '请配置并启用 LLM' })
    return
  }
  
  const llmConfig = enabledLLMs[0]
  const mcpConfig = enabledMCPs[0]
  
  const skillContent = enabledSkills.map(s => s.content).join('\n\n')
  const systemPrompt = `You are an expert code reviewer specializing in MR code review.${skillContent ? '\n\n' + skillContent : ''}`
  
  for (const projectId of projectIds) {
    const project = get().projects.find(p => p.id === projectId)
    if (!project || !project.repository) continue
    
    // 1. Get MR list via MCP
    set({ reviewProgress: { projectId, projectName: project.name, mrTitle: '获取 MR 列表...', progress: 0, completed: 0, total: 0 } })
    
    let mrs: Array<{id: string; title: string; url: string; state: string}> = []
    try {
      const listResult = await window.mcpAPI?.listTools({ url: mcpConfig.url, authHeader: mcpConfig.authHeader })
      // Parse and call listMRs tool
      const mrListResult = await window.mcpAPI?.invokeTool({
        url: mcpConfig.url,
        authHeader: mcpConfig.authHeader,
        toolName: 'listMRs',
        toolArgs: { repository: project.repository, branch: project.branch }
      })
      mrs = mrListResult?.mrs || []
    } catch (err) {
      console.error('[Review] Failed to get MR list for', project.name, err)
      continue
    }
    
    set(state => ({
      reviewProgress: { ...state.reviewProgress!, total: mrs.length }
    }))
    
    // 2. Review each MR
    for (let i = 0; i < mrs.length; i++) {
      const mr = mrs[i]
      set(state => ({
        reviewProgress: { ...state.reviewProgress!, mrTitle: mr.title, progress: (i / mrs.length) * 100, completed: i }
      }))
      
      // Get MR details
      let diff = ''
      try {
        const detailResult = await window.mcpAPI?.invokeTool({
          url: mcpConfig.url,
          authHeader: mcpConfig.authHeader,
          toolName: 'getMRDetails',
          toolArgs: { mrId: mr.id, repository: project.repository }
        })
        diff = detailResult?.diff || ''
      } catch (err) {
        console.error('[Review] Failed to get MR details', mr.id, err)
      }
      
      // 3. Send to LLM for analysis
      const response = await fetch(llmConfig.modelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmConfig.apiKey}` },
        body: JSON.stringify({
          model: llmConfig.modelName || 'claude',
          max_tokens: 4096,
          stream: false,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `请分析以下 MR 的代码变更，识别问题：\n\nMR: ${mr.title}\nURL: ${mr.url}\n\nDiff:\n${diff}`
          }]
        })
      })
      
      const data = await response.json()
      const issues = parseIssuesFromResponse(data)
      
      // 4. Save record
      const record: MRReviewRecord = {
        id: crypto.randomUUID(),
        projectId,
        projectName: project.name,
        mrId: mr.id,
        mrTitle: mr.title,
        mrUrl: mr.url,
        status: 'completed',
        issues,
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      insertMRReviewRecord(record)
      
      set(state => ({
        mrReviewRecords: [...state.mrReviewRecords, record],
        reviewProgress: { ...state.reviewProgress!, completed: i + 1, progress: ((i + 1) / mrs.length) * 100 }
      }))
    }
  }
  
  set({ isReviewing: false })
}
```

- [ ] **Step 2: 提交**

```bash
git commit -m "refactor(code-review): rewrite store for batch MR review"
```

---

## Task 8: 重构 CodeReview 页面

**Files:**
- Modify: `src/pages/CodeReview.tsx`

- [ ] **Step 1: 重构主页面**

```tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import Icon from '@/components/Icon'
import ProjectSelector from '@/components/ProjectSelector'
import ReviewProgress from '@/components/ReviewProgress'
import MRReviewTabs from '@/components/MRReviewTabs'
import MCPConfigPanel from '@/components/MCPConfigPanel'
import LLMConfigPanel from '@/components/LLMConfigPanel'
import SkillPanel from '@/components/SkillPanel'
import { exportToExcel } from '@/utils/excel'

export default function CodeReview() {
  const navigate = useNavigate()
  const { projects } = useProjectStore()
  const { loadLLMConfigs, loadMCPs, loadSkills, isReviewing, reviewProgress, mrReviewRecords, selectedProjectIds, selectProjects, startBatchReview, clearAllReviewData } = useCodeReviewStore()
  const [configOpen, setConfigOpen] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    loadLLMConfigs()
    loadMCPs()
    loadSkills()
  }, [])

  const handleStartReview = () => {
    if (selectedProjectIds.length === 0) return
    startBatchReview(selectedProjectIds)
  }

  const handleExport = () => {
    exportToExcel(mrReviewRecords)
  }

  const handleClearData = () => {
    if (mrReviewRecords.length === 0) return
    exportToExcel(mrReviewRecords)
    clearAllReviewData()
    setShowClearConfirm(false)
  }

  // Group records by project
  const recordsByProject = new Map<string, MRReviewRecord[]>()
  for (const record of mrReviewRecords) {
    const list = recordsByProject.get(record.projectName) || []
    list.push(record)
    recordsByProject.set(record.projectName, list)
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors" title="返回仪表盘">
          <Icon name="arrow_back" />
        </button>
        <div className="h-5 w-px bg-outline" />
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">AI 代码评审</h1>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6 pb-20">
        {/* Config Section */}
        <div className="border-b border-outline pb-4 mb-4">
          <button onClick={() => setConfigOpen(!configOpen)} className="flex items-center gap-2 text-sm font-medium mb-3">
            <Icon name="settings" size={20} />
            LLM / MCP / Skill 配置
            <Icon name={configOpen ? 'expand_less' : 'expand_more'} size={20} />
          </button>
          {configOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LLMConfigPanel />
              <MCPConfigPanel />
              <SkillPanel />
            </div>
          )}
        </div>

        {/* Project Selection */}
        <div className="mb-4">
          <h3 className="font-heading text-sm font-medium mb-3">评审项目选择</h3>
          <ProjectSelector selectedIds={selectedProjectIds} onChange={selectProjects} />
          <button
            onClick={handleStartReview}
            disabled={selectedProjectIds.length === 0 || isReviewing}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {isReviewing ? '评审中...' : '开始评审'}
          </button>
        </div>

        {/* Review Progress */}
        {reviewProgress && (
          <div className="mb-4">
            <ReviewProgress
              currentProject={reviewProgress.projectName}
              currentMR={reviewProgress.mrTitle}
              progress={reviewProgress.progress}
              completedCount={reviewProgress.completed}
              totalCount={reviewProgress.total}
            />
          </div>
        )}

        {/* MR Review Results */}
        {mrReviewRecords.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-medium">评审结果</h3>
              <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-primary-500 hover:bg-surface-container">
                <Icon name="download" size={14} />
                导出 Excel
              </button>
            </div>
            <MRReviewTabs recordsByProject={recordsByProject} onViewOnline={(url) => window.open(url, '_blank')} />
          </div>
        )}
      </main>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-heading font-semibold mb-2">确认清理</h3>
            <p className="text-sm text-on-surface-secondary mb-4">清理前会先导出 Excel，确定要清理吗？</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-surface-secondary rounded-lg text-sm">取消</button>
              <button onClick={handleClearData} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">确认清理</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git commit -m "refactor(code-review): rewrite main page for batch review"
```

---

## Task 9: 完整测试

- [ ] **Step 1: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: 启动开发服务器测试**

```bash
npm run dev
```

- [ ] **Step 3: 手动测试流程**
1. 访问 /code-review 页面
2. 配置 LLM（模型名称、URL、API Key）
3. 配置 MCP（粘贴 JSON 配置）
4. 选择多个项目
5. 点击开始评审
6. 观察评审进度
7. 查看评审结果
8. 导出 Excel

- [ ] **Step 4: 提交最终版本**

```bash
git add -A && git commit -m "feat(code-review): complete MR review batch feature"
```

---

## 实施顺序

1. **Task 1** - 数据库和类型定义（基础）
2. **Task 2** - MCP 富文本配置面板
3. **Task 3** - 项目选择表格
4. **Task 4** - 评审进度组件
5. **Task 5** - MR 评审结果 Tabs
6. **Task 6** - Excel 导出工具
7. **Task 7** - 重构 codeReviewStore
8. **Task 8** - 重构 CodeReview 页面
9. **Task 9** - 完整测试

**Plan complete and saved to `docs/superpowers/plans/2026-05-14-code-review-enhancement-plan.md`**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**