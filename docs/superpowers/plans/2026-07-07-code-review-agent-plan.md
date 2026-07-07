# Code Review Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the one-shot code review tool into a Code Review Agent with rules, memory, pipeline orchestration, scheduled scanning, progress visualization, and report generation.

**Architecture:** Agent runs in a Web Worker within the renderer process. UI thread holds sql.js and proxies DB operations. Main process manages node-cron scheduling and tray. Agent pipeline: Prepare (TS) -> Analyze (LLM) -> Locate (TS) -> Reflect (LLM+TS).

**Tech Stack:** TypeScript, React, Zustand, sql.js (SQLite WASM), Web Worker API, Electron (node-cron, electron-store)

---

## File Map

```
Create:
  src/types/agent.ts              — Agent-specific types
  src/db/agentDao.ts              — CRUD for new tables
  src/agents/agentWorkerManager.ts — Worker lifecycle singleton
  src/agents/worker.ts             — Web Worker entry point
  src/agents/pipeline.ts           — 4-stage pipeline orchestrator
  src/agents/llmProvider.ts        — LLMProvider interface + implementations
  src/agents/ruleEngine.ts         — Rule matching engine
  src/agents/memoryManager.ts      — Memory retrieval, writing, eviction
  src/agents/tokenBudget.ts        — Token estimation and budget management
  src/agents/messageTypes.ts       — Discriminated union message types
  src/components/AgentProgress.tsx  — Process visualization component
  src/components/AgentTaskList.tsx  — Historical task list
  src/components/RuleEditor.tsx    — Rule CRUD UI
  src/components/RuleList.tsx      — Rule list with toggle
  src/components/ReportGenerator.tsx — Report generation dialog
  src/components/ReportView.tsx    — Report display
  src/components/ScheduleConfig.tsx — Scheduler configuration UI

Modify:
  src/types/index.ts               — Add task_id to MRReviewRecord, extend Window
  src/db/index.ts                   — Add 4 new CREATE TABLE statements + migration
  electron/main.ts                  — Scheduler, tray, window-close behavior, new IPC
  electron/preload.ts               — New IPC bridges
  src/store/codeReviewStore.ts      — Agent state + worker integration
  src/pages/CodeReview.tsx          — Agent UI integration
  src/main.tsx                      — Initialize agentWorkerManager

  package.json                      — Add node-cron dependency
```

---

## Phase 1: Foundation — Types, DB Migration, DAO

### Task 1: Add Agent types

**Files:**
- Create: `src/types/agent.ts`
- Modify: `src/types/index.ts:94-155`

- [x] **Step 1: Create agent types file**

```typescript
// src/types/agent.ts — Agent-specific types

export interface AgentRule {
  id: string
  name: string
  description: string
  content: string
  examplesGood: string[]    // JSON'd in DB
  examplesBad: string[]     // JSON'd in DB
  severity: 'critical' | 'warning' | 'suggestion'
  scope: 'global' | 'project'
  projectId?: string
  filePatterns: string[]    // glob patterns, JSON'd in DB
  matchPatterns: string[]   // regex patterns, JSON'd in DB
  enabled: boolean
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

export type MemoryType = 'pattern' | 'project' | 'rule_link' | 'fix'

export interface AgentMemory {
  id: string
  type: MemoryType
  category: string
  title: string
  content: string
  projectId?: string
  filePattern?: string
  sourceReviewId?: string
  occurrenceCount: number
  confidence: number        // 0-1
  lastAccessedAt?: string
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 'pending' | 'preparing' | 'analyzing' | 'locating' | 'reflecting' | 'completed' | 'paused' | 'failed' | 'cancelled'
export type TriggerType = 'manual' | 'scheduled'

export interface ReviewTask {
  id: string
  projectId: string
  triggerType: TriggerType
  status: TaskStatus
  phase?: string
  progress: number          // 0-1
  totalMrCount: number
  completedMrCount: number
  totalIssueCount: number
  summary?: string           // JSON
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface AgentReport {
  id: string
  timeRangeStart: string
  timeRangeEnd: string
  projectIds: string[]       // JSON'd in DB
  summary: string
  statsJson: string
  topIssuesJson: string
  createdAt: string
}

// Pipeline types
export interface MRToReview {
  mrId: string
  mrTitle: string
  mrUrl: string
  repository: string
  branch: string
}

export interface RuleMatch {
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'suggestion'
  filePath: string
  matchedLine: number
  matchedContent: string
}

export interface RawIssue {
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath: string
  codeSnippet: string
  suggestion?: string
}

export interface TaskSummary {
  totalMrs: number
  completedMrs: number
  failedMrs: number
  totalIssues: number
  bySeverity: { critical: number; warning: number; suggestion: number }
  byRule: Record<string, number>
}
```

- [x] **Step 2: Extend MRReviewRecord in types/index.ts**

Open `src/types/index.ts`, find `MRReviewRecord` interface (around line 140), add `taskId`:

```typescript
export interface MRReviewRecord {
  id: string
  projectId: string
  projectName: string
  mrId: string
  mrTitle: string
  mrUrl: string
  status: 'pending' | 'reviewing' | 'completed' | 'failed'
  diff: string
  issues: ReviewIssue[]
  taskId?: string           // NEW: link to review_tasks
  reviewedAt: string
  createdAt: string
}
```

- [x] **Step 3: Extend Window interface for new IPC channels**

In `src/types/index.ts`, add to `Window` interface:

```typescript
interface Window {
  electronAPI?: {
    platform: string
    getAppVersion?: () => Promise<string>
    getPlatform?: () => Promise<string>
    getWasmBinary?: () => Promise<Uint8Array>
    loadDatabase?: () => Promise<Uint8Array | null>
    saveDatabase?: (data: number[]) => boolean
    getSchedule?: () => Promise<{ cronExpression: string; enabled: boolean } | null>  // NEW
    setSchedule?: (config: { cronExpression: string; enabled: boolean }) => Promise<void> // NEW
    onScheduleTick?: (callback: () => void) => void     // NEW
    removeScheduleTick?: () => void                      // NEW
    getNextScheduledRun?: () => Promise<string | null>   // NEW
    onCloseToTray?: (callback: () => void) => void       // NEW
  }
  // ... rest unchanged
}
```

- [x] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No new type errors introduced.

- [x] **Step 5: Commit** (commit 8e1d4fd)

```bash
git add src/types/agent.ts src/types/index.ts
git commit -m "feat: add Agent types and extend MRReviewRecord with taskId"
```

### Task 2: Database migration and new tables

**Files:**
- Modify: `src/db/index.ts`

- [x] **Step 1: Read current table creation in db/index.ts to locate insertion point**

Read `src/db/index.ts`, find the last `CREATE TABLE IF NOT EXISTS` statement. New tables go after all existing tables, before the seed data section.

- [x] **Step 2: Add 4 new CREATE TABLE statements**

Insert after the last existing `CREATE TABLE` statement in the `doInitDatabase()` function:

```sql
-- Migration: add task_id to mr_review_records
ALTER TABLE mr_review_records ADD COLUMN task_id TEXT;

-- Agent rules
CREATE TABLE IF NOT EXISTS agent_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT NOT NULL,
  examples_good TEXT DEFAULT '[]',
  examples_bad TEXT DEFAULT '[]',
  severity TEXT NOT NULL DEFAULT 'warning',
  scope TEXT NOT NULL DEFAULT 'global',
  project_id TEXT,
  file_patterns TEXT DEFAULT '[]',
  match_patterns TEXT DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Agent memories
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project_id TEXT,
  file_pattern TEXT,
  source_review_id TEXT,
  occurrence_count INTEGER DEFAULT 1,
  confidence REAL DEFAULT 0.5,
  last_accessed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Review tasks
CREATE TABLE IF NOT EXISTS review_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  phase TEXT,
  progress REAL DEFAULT 0,
  total_mr_count INTEGER DEFAULT 0,
  completed_mr_count INTEGER DEFAULT 0,
  total_issue_count INTEGER DEFAULT 0,
  summary TEXT,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Agent reports
CREATE TABLE IF NOT EXISTS agent_reports (
  id TEXT PRIMARY KEY,
  time_range_start TEXT NOT NULL,
  time_range_end TEXT NOT NULL,
  project_ids TEXT DEFAULT '[]',
  summary TEXT DEFAULT '',
  stats_json TEXT DEFAULT '{}',
  top_issues_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Important:** The ALTER TABLE must be wrapped in a try/catch to handle the case where `task_id` already exists (idempotent re-run):

```typescript
try {
  db.run('ALTER TABLE mr_review_records ADD COLUMN task_id TEXT')
} catch (e) {
  // Column already exists, ignore
}
```

- [x] **Step 3: Add built-in rules seed**

In the seed data section (after the `seedProjects` block), add seed rules insertion guarded by a count check:

```typescript
// Seed built-in agent rules if empty
const ruleCount = db.exec('SELECT COUNT(*) as c FROM agent_rules')
if ((ruleCount[0]?.values[0]?.[0] as number) === 0) {
  const builtinRules = [
    { name: '避免 any 类型', severity: 'warning', category: '通用', content: '使用具体的 TypeScript 类型而非 any。any 类型会绕过类型检查，导致潜在的类型错误。', matchPatterns: [':\\s*any\\b'], filePatterns: ['*.ts', '*.tsx'], examplesGood: ['const user: User = fetchUser()'], examplesBad: ['const user: any = fetchUser()'] },
    { name: '避免 dangerouslySetInnerHTML', severity: 'critical', category: '通用', content: '直接使用 dangerouslySetInnerHTML 或 innerHTML 赋值可能导致 XSS 攻击。使用 React 安全渲染或 DOMPurify。', matchPatterns: ['dangerouslySetInnerHTML', '\\.innerHTML\\s*='], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['<div>{userContent}</div>', '<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />'], examplesBad: ['document.getElementById(\'content\').innerHTML = userInput', '<div dangerouslySetInnerHTML={{ __html: userInput }} />'] },
    { name: '避免 eval()/new Function()', severity: 'critical', category: '通用', content: '使用 eval() 或 new Function() 执行动态代码存在严重安全风险（代码注入）。', matchPatterns: ['eval\\(.*\\)', 'new Function\\('], filePatterns: ['*.ts', '*.tsx', '*.js', '*.jsx'], examplesGood: ['const result = JSON.parse(data)'], examplesBad: ['const result = eval("(" + data + ")")'] },
    { name: 'useEffect 缺少依赖项或未清理', severity: 'warning', category: '通用', content: 'useEffect 应声明所有依赖项，并在需要时返回 cleanup 函数。缺少依赖项可能导致使用过期闭包值，缺少 cleanup 可能导致内存泄漏。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['useEffect(() => { const id = setInterval(fn, 1000); return () => clearInterval(id); }, [fn])'], examplesBad: ['useEffect(() => { fetchData() }) // 无依赖数组，每次渲染都执行'] },
    { name: '循环/条件中调用 Hooks', severity: 'critical', category: '通用', content: 'React Hooks 必须在组件顶层调用，不能在条件语句、循环或嵌套函数中使用。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['const [count, setCount] = useState(0); if (count > 0) { /* ... */ }'], examplesBad: ['if (condition) { const [count, setCount] = useState(0) }'] },
    { name: '大列表未使用虚拟滚动', severity: 'suggestion', category: 'PC Web', content: '渲染超过 500 项的列表时应使用虚拟滚动，避免创建大量 DOM 节点导致性能问题。', matchPatterns: ['\\.map\\(.*=>'], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['<VirtualList items={data} itemHeight={40} />'], examplesBad: ['{data.map(item => <Row key={item.id} {...item} />)} // data 可能有 1000+ 项'] },
    { name: '图片未设置懒加载', severity: 'suggestion', category: 'PC Web', content: '图片应设置 loading="lazy" 以延迟加载视口外的图片，减少初始页面加载时间。', matchPatterns: ['<img(?!.*loading=)'], filePatterns: ['*.tsx', '*.jsx', '*.html'], examplesGood: ['<img src={url} alt="..." loading="lazy" />'], examplesBad: ['<img src={url} alt="..." />'] },
    { name: '未处理接口竞态', severity: 'warning', category: 'PC Web', content: '在 useEffect 中发起异步请求时，应使用 AbortController 或 cleanup flag 取消请求，避免组件卸载后更新状态。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['useEffect(() => { const ctrl = new AbortController(); fetch(url, { signal: ctrl.signal }).then(setData); return () => ctrl.abort() }, [])'], examplesBad: ['useEffect(() => { fetch(url).then(setData) }, [])'] },
    { name: '未使用 ResizeObserver', severity: 'warning', category: '大屏', content: '大屏场景下应使用 ResizeObserver 监听容器尺寸变化，而非 window.resize 事件，以获得更精确的尺寸响应。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['const observer = new ResizeObserver(entries => { /* update size */ }); observer.observe(containerRef.current)'], examplesBad: ['window.addEventListener(\'resize\', handleResize)'] },
    { name: '动画帧性能隐患', severity: 'suggestion', category: '大屏', content: 'requestAnimationFrame 中的回调应保持轻量。嵌套或连续的 rAF 可能导致主线程阻塞。', matchPatterns: ['requestAnimationFrame'], filePatterns: ['*.tsx', '*.tsx', '*.js'], examplesGood: ['const animate = () => { /* single lightweight update */; rafId = requestAnimationFrame(animate) }'], examplesBad: ['requestAnimationFrame(() => { requestAnimationFrame(() => { /* heavy work */ }) })'] },
    { name: '图表未按需加载', severity: 'suggestion', category: '大屏', content: 'ECharts 等大型图表库应动态导入（React.lazy + Suspense），减少首屏 JS bundle 体积。', matchPatterns: ['import.*echarts', 'import.*chart'], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['const Chart = React.lazy(() => import(\'./Chart\'))'], examplesBad: ['import * as echarts from \'echarts\' // 顶层静态导入'] },
    { name: '未使用 touch 事件兼容', severity: 'warning', category: '移动', content: '移动端应同时处理 click 和 touch 事件，仅使用 click 会有 300ms 延迟。使用 onTouchEnd 或 CSS touch-action。', matchPatterns: ['onClick(?!.*onTouch)'], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['<button onClick={fn} onTouchEnd={fn}>...</button>'], examplesBad: ['<button onClick={fn}>...</button> // 移动端 300ms 延迟'] },
    { name: 'viewport 设置不当', severity: 'warning', category: '移动', content: '应正确设置 viewport meta 标签以支持响应式布局，避免固定宽度导致横滚。', matchPatterns: ['<meta.*viewport'], filePatterns: ['*.html', '*.tsx'], examplesGood: ['<meta name="viewport" content="width=device-width, initial-scale=1.0" />'], examplesBad: ['<meta name="viewport" content="width=1024" />'] },
    { name: '点击区域 < 44x44px', severity: 'suggestion', category: '移动', content: '移动端可点击元素的最小尺寸应为 44x44px（iOS HIG），过小的点击区域降低可用性。', matchPatterns: [], filePatterns: ['*.css', '*.scss', '*.tsx'], examplesGood: ['.btn { min-width: 44px; min-height: 44px }'], examplesBad: ['.btn { width: 24px; height: 24px }'] },
    { name: '敏感数据存 localStorage', severity: 'warning', category: '安全', content: '不应将 token、密码、个人信息等敏感数据存储在 localStorage 中，因其可被 XSS 攻击读取。', matchPatterns: ['localStorage\\.setItem'], filePatterns: ['*.ts', '*.tsx', '*.js'], examplesGood: ['// 使用 httpOnly cookie 存储 token'], examplesBad: ['localStorage.setItem(\'token\', userToken)'] },
    { name: '第三方脚本未 SRI', severity: 'suggestion', category: '安全', content: '加载第三方 CDN 脚本时应添加 integrity 属性（Subresource Integrity），防止 CDN 被篡改。', matchPatterns: ['<script.*src=(?!.*integrity)'], filePatterns: ['*.html'], examplesGood: ['<script src="..." integrity="sha384-..." crossorigin="anonymous"></script>'], examplesBad: ['<script src="https://cdn.example.com/lib.js"></script>'] },
  ]

  for (const rule of builtinRules) {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO agent_rules (id, name, description, content, examples_good, examples_bad, severity, scope, file_patterns, match_patterns, enabled, is_builtin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'global', ?, ?, 1, 1, ?, ?)`,
      [id, rule.name, '', rule.content, JSON.stringify(rule.examplesGood), JSON.stringify(rule.examplesBad), rule.severity, JSON.stringify(rule.filePatterns), JSON.stringify(rule.matchPatterns), now, now]
    )
  }
  persistDatabase()
}
```

**Important:** Use the exact `db.run()` with `?` placeholders pattern from existing seed code. Do not use template literals for values.

- [x] **Step 4: Verify DB init works**

Run: `npm run electron:dev`
Expected: App starts without errors. Check DevTools console — no "table already exists" errors on second launch.

- [x] **Step 5: Commit** (commit 161e7f4)

```bash
git add src/db/index.ts
git commit -m "feat: add agent tables migration and 16 built-in rules seed"
```

### Task 3: Agent DAO layer

**Files:**
- Create: `src/db/agentDao.ts`

- [x] **Step 1: Create agentDao.ts with CRUD for all 4 new tables**

```typescript
// src/db/agentDao.ts
import { getDatabase, persistDatabase } from './index'
import type { AgentRule, AgentMemory, ReviewTask, AgentReport, TaskStatus } from '@/types/agent'

// ─── Agent Rules ─────────────────────────────────

export function getAllAgentRules(): AgentRule[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM agent_rules ORDER BY is_builtin DESC, created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string,
    name: row[idx('name')] as string,
    description: row[idx('description')] as string,
    content: row[idx('content')] as string,
    examplesGood: JSON.parse(row[idx('examples_good')] as string || '[]'),
    examplesBad: JSON.parse(row[idx('examples_bad')] as string || '[]'),
    severity: row[idx('severity')] as AgentRule['severity'],
    scope: row[idx('scope')] as AgentRule['scope'],
    projectId: (row[idx('project_id')] as string) || undefined,
    filePatterns: JSON.parse(row[idx('file_patterns')] as string || '[]'),
    matchPatterns: JSON.parse(row[idx('match_patterns')] as string || '[]'),
    enabled: !!row[idx('enabled')],
    isBuiltin: !!row[idx('is_builtin')],
    createdAt: row[idx('created_at')] as string,
    updatedAt: row[idx('updated_at')] as string,
  }))
}

export function insertAgentRule(rule: AgentRule): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO agent_rules (id, name, description, content, examples_good, examples_bad, severity, scope, project_id, file_patterns, match_patterns, enabled, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rule.id, rule.name, rule.description, rule.content,
     JSON.stringify(rule.examplesGood), JSON.stringify(rule.examplesBad),
     rule.severity, rule.scope, rule.projectId || null,
     JSON.stringify(rule.filePatterns), JSON.stringify(rule.matchPatterns),
     rule.enabled ? 1 : 0, rule.isBuiltin ? 1 : 0,
     rule.createdAt, rule.updatedAt]
  )
  persistDatabase()
}

export function updateAgentRule(id: string, updates: Partial<AgentRule>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  const fields: string[] = []
  const values: unknown[] = []
  const map: Record<string, string> = { name: 'name', description: 'description', content: 'content', severity: 'severity', scope: 'scope', projectId: 'project_id' }
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = ?`); values.push((updates as Record<string, unknown>)[key]) }
  }
  if ('filePatterns' in updates) { fields.push('file_patterns = ?'); values.push(JSON.stringify(updates.filePatterns)) }
  if ('matchPatterns' in updates) { fields.push('match_patterns = ?'); values.push(JSON.stringify(updates.matchPatterns)) }
  if ('examplesGood' in updates) { fields.push('examples_good = ?'); values.push(JSON.stringify(updates.examplesGood)) }
  if ('examplesBad' in updates) { fields.push('examples_bad = ?'); values.push(JSON.stringify(updates.examplesBad)) }
  if ('enabled' in updates) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0) }
  if ('isBuiltin' in updates) { fields.push('is_builtin = ?'); values.push(updates.isBuiltin ? 1 : 0) }
  if (fields.length === 0) return
  fields.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
  db.run(`UPDATE agent_rules SET ${fields.join(', ')} WHERE id = ?`, values)
  persistDatabase()
}

export function deleteAgentRule(id: string): void {
  getDatabase()?.run('DELETE FROM agent_rules WHERE id = ?', [id])
  persistDatabase()
}

// ─── Agent Memories ──────────────────────────────

export function getAllMemories(): AgentMemory[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM agent_memories ORDER BY updated_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string,
    type: row[idx('type')] as AgentMemory['type'],
    category: (row[idx('category')] as string) || '',
    title: row[idx('title')] as string,
    content: row[idx('content')] as string,
    projectId: (row[idx('project_id')] as string) || undefined,
    filePattern: (row[idx('file_pattern')] as string) || undefined,
    sourceReviewId: (row[idx('source_review_id')] as string) || undefined,
    occurrenceCount: row[idx('occurrence_count')] as number,
    confidence: row[idx('confidence')] as number,
    lastAccessedAt: (row[idx('last_accessed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string,
    updatedAt: row[idx('updated_at')] as string,
  }))
}

export function searchMemories(projectId?: string, filePatterns?: string[], limit = 5): AgentMemory[] {
  const db = getDatabase()
  if (!db) return []
  let sql = 'SELECT * FROM agent_memories WHERE 1=1'
  const params: unknown[] = []
  if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }
  sql += ' ORDER BY (confidence * occurrence_count) DESC LIMIT ?'
  params.push(limit)
  const result = db.exec({ sql, params } as unknown as string)
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string,
    type: row[idx('type')] as AgentMemory['type'],
    category: (row[idx('category')] as string) || '',
    title: row[idx('title')] as string,
    content: row[idx('content')] as string,
    projectId: (row[idx('project_id')] as string) || undefined,
    filePattern: (row[idx('file_pattern')] as string) || undefined,
    sourceReviewId: (row[idx('source_review_id')] as string) || undefined,
    occurrenceCount: row[idx('occurrence_count')] as number,
    confidence: row[idx('confidence')] as number,
    lastAccessedAt: (row[idx('last_accessed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string,
    updatedAt: row[idx('updated_at')] as string,
  }))
}

export function insertMemory(memory: AgentMemory): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO agent_memories (id, type, category, title, content, project_id, file_pattern, source_review_id, occurrence_count, confidence, last_accessed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [memory.id, memory.type, memory.category, memory.title, memory.content,
     memory.projectId || null, memory.filePattern || null, memory.sourceReviewId || null,
     memory.occurrenceCount, memory.confidence, memory.lastAccessedAt || null,
     memory.createdAt, memory.updatedAt]
  )
  persistDatabase()
}

export function updateMemory(id: string, updates: Partial<AgentMemory>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  const fields: string[] = []
  const values: unknown[] = []
  const map: Record<string, string> = { type: 'type', category: 'category', title: 'title', content: 'content', projectId: 'project_id', filePattern: 'file_pattern', sourceReviewId: 'source_review_id', lastAccessedAt: 'last_accessed_at' }
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = ?`); values.push((updates as Record<string, unknown>)[key]) }
  }
  if ('occurrenceCount' in updates) { fields.push('occurrence_count = ?'); values.push(updates.occurrenceCount) }
  if ('confidence' in updates) { fields.push('confidence = ?'); values.push(updates.confidence) }
  if (fields.length === 0) return
  fields.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
  db.run(`UPDATE agent_memories SET ${fields.join(', ')} WHERE id = ?`, values)
  persistDatabase()
}

export function findSimilarMemory(category: string, title: string, projectId?: string): AgentMemory | null {
  const db = getDatabase()
  if (!db) return null
  const result = db.exec('SELECT * FROM agent_memories WHERE category = ? AND title = ? AND project_id = ?', [category, title, projectId || null])
  if (!result[0] || !result[0].values[0]) return null
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  const row = result[0].values[0]
  return {
    id: row[idx('id')] as string, type: row[idx('type')] as AgentMemory['type'], category: (row[idx('category')] as string) || '',
    title: row[idx('title')] as string, content: row[idx('content')] as string,
    projectId: (row[idx('project_id')] as string) || undefined, filePattern: (row[idx('file_pattern')] as string) || undefined,
    sourceReviewId: (row[idx('source_review_id')] as string) || undefined, occurrenceCount: row[idx('occurrence_count')] as number,
    confidence: row[idx('confidence')] as number, lastAccessedAt: (row[idx('last_accessed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string, updatedAt: row[idx('updated_at')] as string,
  }
}

export function evictOldMemories(): void {
  const db = getDatabase()
  if (!db) return
  // Evict by age (90 days)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  db.run('DELETE FROM agent_memories WHERE last_accessed_at < ? AND last_accessed_at IS NOT NULL', [cutoff])
  // Evict by count (keep top 1000)
  const countResult = db.exec('SELECT COUNT(*) as c FROM agent_memories')
  const count = countResult[0]?.values[0]?.[0] as number
  if (count > 1000) {
    const toDelete = Math.floor(count * 0.1)
    db.run('DELETE FROM agent_memories WHERE id IN (SELECT id FROM agent_memories ORDER BY (confidence * occurrence_count) ASC LIMIT ?)', [toDelete])
  }
  persistDatabase()
}

// ─── Review Tasks ────────────────────────────────

export function getAllReviewTasks(): ReviewTask[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM review_tasks ORDER BY created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string, projectId: row[idx('project_id')] as string,
    triggerType: row[idx('trigger_type')] as ReviewTask['triggerType'],
    status: row[idx('status')] as TaskStatus, phase: (row[idx('phase')] as string) || undefined,
    progress: row[idx('progress')] as number, totalMrCount: row[idx('total_mr_count')] as number,
    completedMrCount: row[idx('completed_mr_count')] as number, totalIssueCount: row[idx('total_issue_count')] as number,
    summary: (row[idx('summary')] as string) || undefined, errorMessage: (row[idx('error_message')] as string) || undefined,
    startedAt: (row[idx('started_at')] as string) || undefined, completedAt: (row[idx('completed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string,
  }))
}

export function getActiveReviewTask(): ReviewTask | null {
  const tasks = getAllReviewTasks()
  return tasks.find(t => !['completed', 'failed', 'cancelled'].includes(t.status)) || null
}

export function insertReviewTask(task: ReviewTask): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO review_tasks (id, project_id, trigger_type, status, phase, progress, total_mr_count, completed_mr_count, total_issue_count, summary, error_message, started_at, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.projectId, task.triggerType, task.status, task.phase || null,
     task.progress, task.totalMrCount, task.completedMrCount, task.totalIssueCount,
     task.summary || null, task.errorMessage || null, task.startedAt || null, task.completedAt || null, task.createdAt]
  )
  persistDatabase()
}

export function updateReviewTask(id: string, updates: Partial<ReviewTask>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  const fields: string[] = []
  const values: unknown[] = []
  const map: Record<string, string> = { triggerType: 'trigger_type', status: 'status', phase: 'phase', summary: 'summary', errorMessage: 'error_message', startedAt: 'started_at', completedAt: 'completed_at' }
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = ?`); values.push((updates as Record<string, unknown>)[key]) }
  }
  if ('progress' in updates) { fields.push('progress = ?'); values.push(updates.progress) }
  if ('totalMrCount' in updates) { fields.push('total_mr_count = ?'); values.push(updates.totalMrCount) }
  if ('completedMrCount' in updates) { fields.push('completed_mr_count = ?'); values.push(updates.completedMrCount) }
  if ('totalIssueCount' in updates) { fields.push('total_issue_count = ?'); values.push(updates.totalIssueCount) }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE review_tasks SET ${fields.join(', ')} WHERE id = ?`, values)
  persistDatabase()
}

// ─── Agent Reports ───────────────────────────────

export function getAllAgentReports(): AgentReport[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM agent_reports ORDER BY created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string, timeRangeStart: row[idx('time_range_start')] as string,
    timeRangeEnd: row[idx('time_range_end')] as string, projectIds: JSON.parse(row[idx('project_ids')] as string || '[]'),
    summary: (row[idx('summary')] as string) || '', statsJson: row[idx('stats_json')] as string,
    topIssuesJson: row[idx('top_issues_json')] as string, createdAt: row[idx('created_at')] as string,
  }))
}

export function insertAgentReport(report: AgentReport): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO agent_reports (id, time_range_start, time_range_end, project_ids, summary, stats_json, top_issues_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [report.id, report.timeRangeStart, report.timeRangeEnd, JSON.stringify(report.projectIds), report.summary, report.statsJson, report.topIssuesJson, report.createdAt]
  )
  persistDatabase()
}

export function deleteAgentReport(id: string): void {
  getDatabase()?.run('DELETE FROM agent_reports WHERE id = ?', [id])
  persistDatabase()
}
```

**Note:** The sql.js `db.exec()` with parameterized queries uses an undocumented overload. If the parameterized version fails, use string interpolation with `escapeSQL()` helper or switch to `db.run()` for queries without result rows. For SELECT with params, use this pattern instead:

```typescript
const stmt = db.prepare('SELECT * FROM agent_memories WHERE project_id = ? ORDER BY (confidence * occurrence_count) DESC LIMIT ?')
stmt.bind([projectId || '', limit])
const rows: unknown[][] = []
while (stmt.step()) { rows.push(stmt.getAsObject() as unknown as unknown[]) }
stmt.free()
```

- [x] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [x] **Step 3: Commit** (commit e47e705)

```bash
git add src/db/agentDao.ts
git commit -m "feat: add agent DAO layer for rules, memories, tasks, reports"
```

---

## Phase 2: Agent Core — Worker Manager, Message Protocol, LLM Provider

### Task 4: Message type definitions

**Files:**
- Create: `src/agents/messageTypes.ts`

- [ ] **Step 1: Create typed message protocol file**

```typescript
// src/agents/messageTypes.ts
import type { ReviewIssue } from '@/types'
import type { AgentMemory, ReviewTask, TaskSummary } from '@/types/agent'

// ─── UI → Worker ─────────────────────────────────

export type WorkerInMessage =
  | { type: 'agent:start'; taskId: string; projectId: string; mrIds: string[] }
  | { type: 'agent:control'; action: 'pause' | 'resume' | 'skip' | 'cancel' }
  | { type: 'agent:rule-toggle'; ruleId: string; enabled: boolean }
  | { type: 'agent:db-response'; requestId: string; result: unknown }
  | { type: 'agent:db-batch-done'; requestId: string; error?: string }

// ─── Worker → UI ─────────────────────────────────

export type WorkerOutMessage =
  | { type: 'agent:progress'; taskId: string; phase: string; percent: number; currentFile: string; foundCount: number }
  | { type: 'agent:issue-found'; taskId: string; issue: ReviewIssue }
  | { type: 'agent:phase-change'; taskId: string; fromPhase: string; toPhase: string }
  | { type: 'agent:completed'; taskId: string; summary: TaskSummary }
  | { type: 'agent:error'; taskId: string; error: string }
  // DB semantic API
  | { type: 'agent:db-search-memories'; requestId: string; projectId: string; filePatterns: string[]; limit: number }
  | { type: 'agent:db-write-memory'; requestId: string; memory: Omit<AgentMemory, 'id' | 'createdAt'> }
  | { type: 'agent:db-task-create'; requestId: string; task: Omit<ReviewTask, 'id'> }
  | { type: 'agent:db-task-update'; requestId: string; id: string; updates: Partial<ReviewTask> }
  | { type: 'agent:db-batch'; requestId: string; statements: Array<{ sql: string; params?: unknown[] }> }
  | { type: 'agent:db-query'; requestId: string; sql: string; params?: unknown[] }
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/messageTypes.ts
git commit -m "feat: add typed message protocol for Worker-UI communication"
```

### Task 5: Agent Worker Manager

**Files:**
- Create: `src/agents/agentWorkerManager.ts`

- [ ] **Step 1: Create the Worker lifecycle singleton**

```typescript
// src/agents/agentWorkerManager.ts
import type { WorkerInMessage, WorkerOutMessage } from './messageTypes'

type MessageHandler = (msg: WorkerOutMessage) => void

let worker: Worker | null = null
let handlers: Set<MessageHandler> = new Set()
let pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void }> = new Map()
let requestIdCounter = 0

export function initAgentWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

  worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
    const msg = event.data
    // Handle DB request responses
    if (msg.type === 'agent:db-response' || msg.type === 'agent:db-batch-done') {
      const pending = pendingRequests.get(msg.requestId)
      if (pending) {
        pendingRequests.delete(msg.requestId)
        if (msg.type === 'agent:db-batch-done' && msg.error) {
          pending.reject(new Error(msg.error))
        } else {
          pending.resolve(msg.type === 'agent:db-response' ? msg.result : undefined)
        }
      }
      return
    }
    // Forward to registered handlers
    handlers.forEach(h => h(msg))
  }

  worker.onerror = (event: ErrorEvent) => {
    console.error('[AgentWorker] Worker error:', event.error)
    handlers.forEach(h => h({ type: 'agent:error', taskId: '', error: event.error?.message || 'Unknown worker error' }))
  }

  return worker
}

export function getAgentWorker(): Worker | null {
  return worker
}

export function sendToWorker(msg: WorkerInMessage): void {
  worker?.postMessage(msg)
}

export function subscribeToWorker(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => { handlers.delete(handler) }
}

export function terminateAgentWorker(): void {
  worker?.terminate()
  worker = null
  handlers.clear()
  pendingRequests.clear()
}

// Called by UI thread to handle DB requests from Worker
export async function handleDbRequest(msg: WorkerOutMessage & { requestId: string }): Promise<void> {
  // This function is imported and called from the UI thread message handler
  // The actual DB operations are performed by the store/DAO layer
  // This is a router that the UI thread uses
  // Each specific DB operation is handled in the store
}
```

- [ ] **Step 2: Initialize Worker in main.tsx**

In `src/main.tsx`, add after `initDatabase()` call:

```typescript
import { initAgentWorker } from './agents/agentWorkerManager'

// After initDatabase():
initDatabase().then(() => {
  initAgentWorker()
  console.log('[App] Database and Agent Worker initialized')
}).catch((err) => {
  console.error('[App] Initialization failed:', err)
})
```

- [ ] **Step 3: Verify Worker starts**

Run: `npm run dev`
Expected: Check browser console — "[App] Database and Agent Worker initialized" logged. No Worker errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/agents/agentWorkerManager.ts src/main.tsx
git commit -m "feat: add agentWorkerManager singleton initialized at app bootstrap"
```

### Task 6: LLM Provider abstraction

**Files:**
- Create: `src/agents/llmProvider.ts`

- [ ] **Step 1: Create LLMProvider interface and implementations**

```typescript
// src/agents/llmProvider.ts

export interface ChatParams {
  systemPrompt: string
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
}

export interface ChatResponse {
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface LLMProvider {
  chat(params: ChatParams): Promise<ChatResponse>
  estimateTokens(text: string): number
}

export class OpenAIProvider implements LLMProvider {
  constructor(private config: { modelUrl: string; apiKey: string; modelName: string }) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    const messages = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ]
    const res = await fetch(this.config.modelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages,
        max_tokens: params.maxTokens,
        temperature: 0.1,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${errBody.slice(0, 200)}`)
    }
    const data = await res.json()
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  }

  estimateTokens(text: string): number {
    // Character-level estimation: ~4 chars per token for English/code
    return Math.ceil(text.length / 4)
  }
}

export class AnthropicProvider implements LLMProvider {
  constructor(private config: { modelUrl: string; apiKey: string; modelName: string }) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    const messages = [
      ...params.messages,
    ]
    const res = await fetch(this.config.modelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        system: params.systemPrompt,
        messages,
        max_tokens: params.maxTokens || 4096,
        temperature: 0.1,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 200)}`)
    }
    const data = await res.json()
    return {
      content: data.content?.[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

export class MockProvider implements LLMProvider {
  async chat(params: ChatParams): Promise<ChatResponse> {
    // Return mock issues for testing — basic regex matching against the last message
    const lastMsg = params.messages[params.messages.length - 1]?.content || ''
    const hasInnerHTML = /\.innerHTML\s*=|dangerouslySetInnerHTML/.test(lastMsg)
    const hasAny = /:\s*any\b/.test(lastMsg)
    const hasEval = /eval\(/.test(lastMsg)

    const issues: Array<Record<string, string>> = []
    if (hasInnerHTML) issues.push({ severity: 'critical', title: '避免直接使用 innerHTML/dangerouslySetInnerHTML', description: '可能导致 XSS 攻击，应使用 DOMPurify 或 React 安全渲染', filePath: 'unknown', codeSnippet: lastMsg.slice(0, 100) })
    if (hasAny) issues.push({ severity: 'warning', title: '避免使用 any 类型', description: '应使用具体类型以利用 TypeScript 类型检查', filePath: 'unknown', codeSnippet: lastMsg.slice(0, 100) })
    if (hasEval) issues.push({ severity: 'critical', title: '避免使用 eval()', description: 'eval() 存在代码注入风险', filePath: 'unknown', codeSnippet: lastMsg.slice(0, 100) })

    const content = JSON.stringify(issues)
    return {
      content,
      usage: { promptTokens: 1000, completionTokens: 200, totalTokens: 1200 },
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

export function createLLMProvider(config: { modelUrl: string; apiKey: string; modelName: string; apiType: 'openai' | 'anthropic' }): LLMProvider {
  if (config.apiType === 'anthropic') return new AnthropicProvider(config)
  return new OpenAIProvider(config)
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/agents/llmProvider.ts
git commit -m "feat: add LLMProvider abstraction with OpenAI, Anthropic, and Mock implementations"
```

### Task 7: Agent Web Worker entry point

**Files:**
- Create: `src/agents/worker.ts`

- [ ] **Step 1: Create the Worker message handler skeleton**

```typescript
// src/agents/worker.ts — Web Worker entry point
import type { WorkerInMessage, WorkerOutMessage } from './messageTypes'

function post(msg: WorkerOutMessage): void {
  self.postMessage(msg)
}

// Handle DB response messages from UI thread
function dbRequest(msg: WorkerOutMessage): Promise<unknown> {
  const requestId = 'db_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent<WorkerInMessage>) => {
      if (e.data.type === 'agent:db-response' && e.data.requestId === requestId) {
        self.removeEventListener('message', handler)
        resolve(e.data.result)
      }
      if (e.data.type === 'agent:db-batch-done' && e.data.requestId === requestId) {
        self.removeEventListener('message', handler)
        if (e.data.error) reject(new Error(e.data.error))
        else resolve(undefined)
      }
    }
    self.addEventListener('message', handler)
    self.postMessage(msg)
  })
}

// Placeholder — pipeline will be wired in Task 8
async function runPipeline(taskId: string, projectId: string, _mrIds: string[]): Promise<void> {
  post({ type: 'agent:progress', taskId, phase: 'preparing', percent: 0, currentFile: '', foundCount: 0 })
  post({ type: 'agent:error', taskId, error: 'Pipeline not yet implemented' })
}

// ─── Message handler ──────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data
  switch (msg.type) {
    case 'agent:start':
      runPipeline(msg.taskId, msg.projectId, msg.mrIds)
      break
    case 'agent:control':
      // Will be handled by pipeline in Task 8
      console.log('[Worker] Control:', msg.action)
      break
    case 'agent:rule-toggle':
      console.log('[Worker] Rule toggle:', msg.ruleId, msg.enabled)
      break
    default:
      break
  }
}

export {}
```

- [ ] **Step 2: Verify Worker loads without errors**

Run: `npm run dev`
Open browser console. Expected: No Worker errors. If you see "[Worker]" imports resolving, the Worker is bundling correctly.

**Note:** Vite bundles `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` as a separate chunk. Verify the chunk loads by checking Network tab for a `worker-*.js` file.

- [ ] **Step 3: Commit**

```bash
git add src/agents/worker.ts
git commit -m "feat: add Agent Web Worker skeleton with message handling"
```

---

## Phase 3: Agent Pipeline — Token Budget, Rule Engine, Memory Manager, 4-Stage Pipeline

### Task 8: Token budget manager

**Files:**
- Create: `src/agents/tokenBudget.ts`

- [ ] **Step 1: Create tokenBudget.ts**

```typescript
// src/agents/tokenBudget.ts

export interface TokenPlan {
  strategy: 'normal' | 'shard' | 'degraded'
  availableTokens: number
  estimatedTotal: number
  shards?: Array<Array<{ path: string; content: string }>>
  skippedFiles?: string[]
}

export function estimateTokens(text: string): number {
  // Character-level estimation
  return Math.ceil(text.length / 3) // code ~3 chars/token
}

export function calculateTokenPlan(
  diffFiles: Array<{ path: string; content: string }>,
  modelMaxTokens: number
): TokenPlan {
  const reserved = 8500 // system prompt + rules + memories + output
  const available = modelMaxTokens - reserved
  const totalEstimated = diffFiles.reduce((sum, f) => sum + estimateTokens(f.content), 0)

  if (totalEstimated <= available) {
    return { strategy: 'normal', availableTokens: available, estimatedTotal: totalEstimated }
  }

  // Check single file exceeds 80% of available
  const largeFiles = diffFiles.filter(f => estimateTokens(f.content) > available * 0.8)
  const skippedFiles = largeFiles.map(f => f.path)
  const remainingFiles = diffFiles.filter(f => !largeFiles.includes(f))

  if (totalEstimated > available * 2) {
    // Degraded: only files matching core patterns
    return {
      strategy: 'degraded',
      availableTokens: available,
      estimatedTotal: totalEstimated,
      skippedFiles: diffFiles.map(f => f.path),
    }
  }

  // Shard: split files into groups that fit within available tokens
  const shards: Array<Array<{ path: string; content: string }>> = []
  let currentShard: Array<{ path: string; content: string }> = []
  let currentTokens = 0

  for (const file of remainingFiles) {
    const fileTokens = estimateTokens(file.content)
    if (currentTokens + fileTokens > available && currentShard.length > 0) {
      shards.push(currentShard)
      currentShard = []
      currentTokens = 0
    }
    currentShard.push(file)
    currentTokens += fileTokens
  }
  if (currentShard.length > 0) shards.push(currentShard)

  return {
    strategy: 'shard',
    availableTokens: available,
    estimatedTotal: totalEstimated,
    shards,
    skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
  }
}

export function shouldCompress(promptTokens: number, modelMaxTokens: number): boolean {
  return promptTokens > modelMaxTokens * 0.6
}

export function compressToXml(history: string): string {
  // Simple compression: extract key findings as structured XML
  return `<summary>${history.slice(0, 2000)}...</summary>`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/tokenBudget.ts
git commit -m "feat: add token budget manager with shard/degrade strategies"
```

### Task 9: Rule engine

**Files:**
- Create: `src/agents/ruleEngine.ts`

- [ ] **Step 1: Create ruleEngine.ts**

```typescript
// src/agents/ruleEngine.ts
import type { AgentRule } from '@/types/agent'
import type { ParsedDiff } from '@/utils/diffParser'

export interface RuleMatch {
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'suggestion'
  filePath: string
  matchedLine: number
  matchedContent: string
}

export function matchGlob(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true // empty = match all
  return patterns.some(p => {
    const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
    return regex.test(filePath)
  })
}

export function matchRules(
  parsedDiff: ParsedDiff,
  rules: AgentRule[]
): RuleMatch[] {
  const matches: RuleMatch[] = []

  for (const file of parsedDiff.files) {
    for (const rule of rules) {
      if (!matchGlob(file.path, rule.filePatterns)) continue
      if (rule.matchPatterns.length === 0) continue // LLM-only rule

      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'context') continue
          for (const pattern of rule.matchPatterns) {
            try {
              const regex = new RegExp(pattern, 'i')
              if (regex.test(line.content)) {
                matches.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  severity: rule.severity,
                  filePath: file.path,
                  matchedLine: line.num,
                  matchedContent: line.content.trim(),
                })
              }
            } catch {
              // Invalid regex, skip
            }
          }
        }
      }
    }
  }

  return matches
}

export function buildRuleContextPrompt(rules: AgentRule[]): string {
  if (rules.length === 0) return ''
  const lines = ['## 评审规则', '', '请根据以下规则审查代码：', '']
  for (const rule of rules) {
    lines.push(`### ${rule.name} [${rule.severity}]`)
    lines.push(rule.content)
    if (rule.examplesGood.length > 0) {
      lines.push('正面示例：')
      rule.examplesGood.forEach(e => lines.push(`  ${e}`))
    }
    if (rule.examplesBad.length > 0) {
      lines.push('反面示例：')
      rule.examplesBad.forEach(e => lines.push(`  ${e}`))
    }
    lines.push('')
  }
  return lines.join('\n')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/ruleEngine.ts
git commit -m "feat: add rule matching engine with glob + regex dual-mode"
```

### Task 10: Memory manager

**Files:**
- Create: `src/agents/memoryManager.ts`

- [ ] **Step 1: Create memoryManager.ts**

```typescript
// src/agents/memoryManager.ts
import type { AgentMemory, RawIssue } from '@/types/agent'

export function buildMemoryPrompt(memories: AgentMemory[]): string {
  if (memories.length === 0) return ''
  const lines = ['## 历史相关记忆', '', '以下是该项目历史上发现的问题模式，请关注类似问题：', '']
  for (const mem of memories) {
    lines.push(`- [${mem.type}] ${mem.title}: ${mem.content.slice(0, 200)}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function shouldCreateMemory(
  category: string,
  existingMemory: AgentMemory | null,
  projectId: string,
  issues: RawIssue[]
): AgentMemory | null {
  if (!existingMemory || existingMemory.occurrenceCount < 2) return null

  // Auto-create pattern memory when same issue appears >= 3 times
  const now = new Date().toISOString()
  const sampleIssue = issues[0]

  return {
    id: '', // assigned by caller
    type: 'pattern',
    category,
    title: sampleIssue?.title || category,
    content: sampleIssue?.description || '',
    projectId,
    occurrenceCount: existingMemory.occurrenceCount + 1,
    confidence: Math.min(existingMemory.confidence + 0.1, 1.0),
    lastAccessedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

export function needsEviction(): boolean {
  // Called periodically, returns true if cleanup needed
  // evictOldMemories() handles the actual logic (in DAO)
  return true
}
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/memoryManager.ts
git commit -m "feat: add memory manager with retrieval prompt and auto-write logic"
```

### Task 11: Pipeline orchestrator

**Files:**
- Create: `src/agents/pipeline.ts`

- [ ] **Step 1: Create the 4-stage pipeline**

```typescript
// src/agents/pipeline.ts
import type { WorkerInMessage, WorkerOutMessage } from './messageTypes'
import type { AgentRule, AgentMemory, ReviewTask, TaskSummary } from '@/types/agent'
import type { LLMProvider } from './llmProvider'
import type { ReviewIssue } from '@/types'
import type { ParsedDiff } from '@/utils/diffParser'
import { parseDiff } from '@/utils/diffParser'
import { resolveIssues, type AIResponseIssue } from '@/utils/issueResolver'
import { matchRules, buildRuleContextPrompt } from './ruleEngine'
import { calculateTokenPlan } from './tokenBudget'

type PostFn = (msg: WorkerOutMessage) => void

interface PipelineContext {
  taskId: string
  projectId: string
  mcpUrl: string
  mcpAuthHeader?: string
  llmProvider: LLMProvider
  rules: AgentRule[]
  memories: AgentMemory[]
  modelMaxTokens: number
}

export async function runPipeline(
  ctx: PipelineContext,
  mrIds: string[],
  post: PostFn,
  dbRequest: (msg: WorkerOutMessage) => Promise<unknown>
): Promise<TaskSummary> {
  const { taskId, projectId } = ctx
  let totalIssues = 0
  const bySeverity = { critical: 0, warning: 0, suggestion: 0 }
  const byRule: Record<string, number> = {}
  let completedMrs = 0
  let failedMrs = 0

  // Update task status
  await dbRequest({ type: 'agent:db-task-create', requestId: '', task: { projectId, triggerType: 'manual', status: 'preparing', progress: 0, totalMrCount: mrIds.length, completedMrCount: 0, totalIssueCount: 0, phase: 'preparing', startedAt: new Date().toISOString() } } as WorkerOutMessage)

  // ─── Stage 1: Prepare (per MR) ───────────────────
  post({ type: 'agent:phase-change', taskId, fromPhase: '', toPhase: 'preparing' })
  post({ type: 'agent:progress', taskId, phase: 'preparing', percent: 0.1, currentFile: '', foundCount: 0 })

  for (const mrId of mrIds) {
    try {
      // Fetch diff via MCP
      const mcpRes = await fetch(ctx.mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(ctx.mcpAuthHeader ? { 'Authorization': ctx.mcpAuthHeader } : {}) },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'tools/call',
          params: { name: 'getMRDetails', arguments: { mrId } },
        }),
      })
      const mcpData = await mcpRes.json()
      const diffText = mcpData?.result?.content?.[0]?.text || ''

      // Parse diff
      const parsedDiff: ParsedDiff = parseDiff(diffText)

      // Rule matching
      const ruleMatches = matchRules(parsedDiff, ctx.rules)
      const activeRules = ctx.rules.filter(r => r.enabled)

      // Token budget
      const diffFiles = parsedDiff.files.map(f => ({
        path: f.path,
        content: f.hunks.map(h => h.lines.map(l => l.content).join('\n')).join('\n'),
      }))
      const tokenPlan = calculateTokenPlan(diffFiles, ctx.modelMaxTokens)

      // Build system prompt
      const rulePrompt = buildRuleContextPrompt(activeRules)
      const memoryPrompt = ctx.memories.length > 0
        ? '## 历史相关记忆\n\n' + ctx.memories.map(m => `- ${m.title}: ${m.content.slice(0, 200)}`).join('\n')
        : ''
      const systemPrompt = [
        '你是一名代码评审专家。分析以下 git diff，以 JSON 数组格式输出发现的问题。',
        '每个问题格式: {"severity":"critical|warning|suggestion","title":"","description":"","filePath":"","codeSnippet":"","suggestion":""}',
        rulePrompt,
        memoryPrompt,
      ].join('\n\n')

      // ─── Stage 2: Analyze (LLM) ─────────────────
      post({ type: 'agent:phase-change', taskId, fromPhase: 'preparing', toPhase: 'analyzing' })
      post({ type: 'agent:progress', taskId, phase: 'analyzing', percent: 0.2, currentFile: parsedDiff.files[0]?.path || '', foundCount: 0 })

      const llmResponse = await ctx.llmProvider.chat({
        systemPrompt,
        messages: [{ role: 'user', content: `Git Diff:\n\`\`\`diff\n${diffText.slice(0, 50000)}\n\`\`\`` }],
        maxTokens: 4096,
      })

      // Parse issues from LLM response
      const rawIssues = parseIssuesFromResponse(llmResponse.content)

      // ─── Stage 3: Locate (TS) ───────────────────
      post({ type: 'agent:phase-change', taskId, fromPhase: 'analyzing', toPhase: 'locating' })
      post({ type: 'agent:progress', taskId, phase: 'locating', percent: 0.6, currentFile: '', foundCount: rawIssues.length })

      const resolvedIssues: ReviewIssue[] = resolveIssues(rawIssues, parsedDiff)

      // ─── Stage 4: Reflect (LLM self-check + TS merge) ──
      post({ type: 'agent:phase-change', taskId, fromPhase: 'locating', toPhase: 'reflecting' })

      // Self-check via LLM
      if (resolvedIssues.length > 0) {
        const checkPrompt = `请检查以下代码审查发现问题是否为误报（false positive）。对于每个问题，判断是否为真正的代码问题，用 JSON 数组返回：[{"issueTitle": "...", "isFalsePositive": true/false, "reason": "..."}]`
        const checkResponse = await ctx.llmProvider.chat({
          systemPrompt: checkPrompt,
          messages: [{ role: 'user', content: JSON.stringify(resolvedIssues.map(i => ({ title: i.title, description: i.description, codeSnippet: i.codeSnippet }))) }],
          maxTokens: 2048,
        })
        try {
          const checks = JSON.parse(extractFirstJsonArray(checkResponse.content) || '[]')
          const fpTitles = new Set(checks.filter((c: { isFalsePositive?: boolean }) => c.isFalsePositive).map((c: { issueTitle: string }) => c.issueTitle))
          resolvedIssues.forEach(i => { if (fpTitles.has(i.title)) i.resolved = true })
        } catch { /* ignore parse error */ }
      }

      // Count stats
      for (const issue of resolvedIssues.filter(i => !i.resolved)) {
        totalIssues++
        bySeverity[issue.severity]++
      }

      completedMrs++

      // Notify UI of each found issue
      for (const issue of resolvedIssues.filter(i => !i.resolved)) {
        post({ type: 'agent:issue-found', taskId, issue })
      }

      // Save MR record via DB batch
      const recordId = crypto.randomUUID()
      const now = new Date().toISOString()
      await dbRequest({
        type: 'agent:db-batch',
        requestId: '',
        statements: [
          {
            sql: `INSERT INTO mr_review_records (id, project_id, project_name, mr_id, mr_title, mr_url, status, diff, issues, task_id, reviewed_at, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
            params: [recordId, ctx.projectId, '', mrId, mrId, '', diffText, JSON.stringify(resolvedIssues), taskId, now, now],
          },
        ],
      } as WorkerOutMessage)

      post({ type: 'agent:progress', taskId, phase: 'reflecting', percent: 0.2 + (0.8 * completedMrs / mrIds.length), currentFile: '', foundCount: totalIssues })

    } catch (err) {
      failedMrs++
      console.error(`[Pipeline] MR ${mrId} failed:`, err)
    }
  }

  // ─── Finalize ───────────────────────────────────
  const summary: TaskSummary = {
    totalMrs: mrIds.length,
    completedMrs,
    failedMrs,
    totalIssues,
    bySeverity,
    byRule,
  }

  await dbRequest({
    type: 'agent:db-task-update',
    requestId: '',
    id: taskId,
    updates: { status: 'completed', progress: 1, completedMrCount: completedMrs, totalIssueCount: totalIssues, summary: JSON.stringify(summary), completedAt: new Date().toISOString() },
  } as WorkerOutMessage)

  post({ type: 'agent:phase-change', taskId, fromPhase: 'reflecting', toPhase: 'completed' })
  post({ type: 'agent:completed', taskId, summary })

  return summary
}

// ─── Response parsing (reused from existing codeReviewStore) ───

function extractFirstJsonArray(text: string): string | null {
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      if (depth === 0) start = i
      depth++
    } else if (text[i] === ']') {
      depth--
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

function parseIssuesFromResponse(text: string): AIResponseIssue[] {
  const json = extractFirstJsonArray(text)
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false
      const i = item as Record<string, unknown>
      return typeof i.title === 'string' && typeof i.description === 'string'
    }).map((item: Record<string, unknown>) => ({
      severity: (item.severity as string || 'warning') as AIResponseIssue['severity'],
      title: item.title as string,
      description: item.description as string,
      filePath: (item.filePath as string) || '',
      codeSnippet: (item.codeSnippet as string) || '',
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/pipeline.ts
git commit -m "feat: add 4-stage Agent pipeline with MCP fetch, LLM analysis, issue location, and reflection"
```

### Task 12: Wire pipeline into Worker

**Files:**
- Modify: `src/agents/worker.ts`

- [ ] **Step 1: Replace the placeholder worker.ts with full implementation**

```typescript
// src/agents/worker.ts — full implementation
import type { WorkerInMessage, WorkerOutMessage } from './messageTypes'
import { runPipeline } from './pipeline'
import { createLLMProvider } from './llmProvider'
import type { LLMConfig } from '@/types'
import type { AgentRule, AgentMemory } from '@/types/agent'

let currentTaskId: string | null = null
let isPaused = false

function post(msg: WorkerOutMessage): void {
  self.postMessage(msg)
}

function dbRequest<T = unknown>(msg: WorkerOutMessage): Promise<T> {
  const requestId = 'db_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent<WorkerInMessage>) => {
      if (e.data.type === 'agent:db-response' && e.data.requestId === requestId) {
        self.removeEventListener('message', handler)
        resolve(e.data.result as T)
      }
      if (e.data.type === 'agent:db-batch-done' && e.data.requestId === requestId) {
        self.removeEventListener('message', handler)
        if (e.data.error) reject(new Error(e.data.error))
        else resolve(undefined as T)
      }
    }
    self.addEventListener('message', handler)
    self.postMessage({ ...msg, requestId } as WorkerOutMessage)
  })
}

// Load config from DB via UI thread
async function loadConfig(): Promise<{
  llmConfig: LLMConfig | null
  rules: AgentRule[]
  memories: AgentMemory[]
  mcpUrl: string
  mcpAuthHeader: string
}> {
  const llmResult = await dbRequest<LLMConfig[]>({
    type: 'agent:db-query',
    requestId: '',
    sql: 'SELECT * FROM llm_config WHERE enabled = 1 LIMIT 1',
  } as WorkerOutMessage)

  // Fallback: if db-query returns raw structure, handle it
  const llmConfigs = Array.isArray(llmResult) ? llmResult : []
  const llmConfig = llmConfigs[0] || null

  const mcpResult = await dbRequest<Array<{ url: string; auth_header: string }>>({
    type: 'agent:db-query',
    requestId: '',
    sql: 'SELECT * FROM mcp_services WHERE enabled = 1 LIMIT 1',
  } as WorkerOutMessage)
  const mcpServices = Array.isArray(mcpResult) ? mcpResult : []
  const mcp = mcpServices[0]

  const rules = await dbRequest<AgentRule[]>({
    type: 'agent:db-query',
    requestId: '',
    sql: 'SELECT * FROM agent_rules WHERE enabled = 1 ORDER BY scope DESC',
  } as WorkerOutMessage)

  const memories = await dbRequest<AgentMemory[]>({
    type: 'agent:db-query',
    requestId: '',
    sql: 'SELECT * FROM agent_memories ORDER BY (confidence * occurrence_count) DESC LIMIT 5',
  } as WorkerOutMessage)

  return {
    llmConfig: llmConfig ? {
      id: (llmConfig as Record<string, unknown>).id as string,
      modelName: (llmConfig as Record<string, unknown>).model_name as string || (llmConfig as Record<string, unknown>).modelName as string,
      modelUrl: (llmConfig as Record<string, unknown>).model_url as string || (llmConfig as Record<string, unknown>).modelUrl as string,
      apiKey: (llmConfig as Record<string, unknown>).api_key as string || (llmConfig as Record<string, unknown>).apiKey as string,
      apiType: ((llmConfig as Record<string, unknown>).api_type as string || (llmConfig as Record<string, unknown>).apiType as string || 'openai') as 'openai' | 'anthropic',
      enabled: true,
      createdAt: (llmConfig as Record<string, unknown>).created_at as string || '',
    } : null,
    rules: Array.isArray(rules) ? rules : [],
    memories: Array.isArray(memories) ? memories : [],
    mcpUrl: (mcp as Record<string, unknown>)?.url as string || '',
    mcpAuthHeader: (mcp as Record<string, unknown>)?.auth_header as string || '',
  }
}

async function startPipeline(taskId: string, projectId: string, mrIds: string[]): Promise<void> {
  try {
    const config = await loadConfig()

    if (!config.llmConfig) {
      post({ type: 'agent:error', taskId, error: '没有启用的 LLM 配置' })
      return
    }

    const llmProvider = createLLMProvider({
      modelUrl: config.llmConfig.modelUrl,
      apiKey: config.llmConfig.apiKey,
      modelName: config.llmConfig.modelName,
      apiType: config.llmConfig.apiType,
    })

    await runPipeline(
      { taskId, projectId, mcpUrl: config.mcpUrl, mcpAuthHeader: config.mcpAuthHeader, llmProvider, rules: config.rules, memories: config.memories, modelMaxTokens: 200000 },
      mrIds,
      post,
      dbRequest
    )
  } catch (err) {
    post({ type: 'agent:error', taskId, error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

// ─── Main message handler ─────────────────────────

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data
  if (msg.type === 'agent:start') {
    currentTaskId = msg.taskId
    isPaused = false
    startPipeline(msg.taskId, msg.projectId, msg.mrIds)
  } else if (msg.type === 'agent:control') {
    switch (msg.action) {
      case 'pause': isPaused = true; break
      case 'resume': isPaused = false; break
      case 'skip': break
      case 'cancel':
        currentTaskId = null
        isPaused = false
        break
    }
  }
}

export {}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/agents/worker.ts
git commit -m "feat: wire full pipeline into Agent Web Worker with config loading"
```

---

## Phase 4: Store Integration & UI — Process Visualization

### Task 13: Add Agent state to codeReviewStore

**Files:**
- Modify: `src/store/codeReviewStore.ts`

- [ ] **Step 1: Add Agent state and actions to the store interface and implementation**

Add to the `CodeReviewStore` interface:

```typescript
interface CodeReviewStore {
  // ─── Existing state ───
  llmConfigs: LLMConfig[]
  mcps: MCPService[]
  skills: Skill[]
  isReviewing: boolean
  reviewProgress: { phase: string; percent: number; currentFile: string; foundCount: number } | null
  mrReviewRecords: MRReviewRecord[]
  reviewError: string | null
  selectedProjectIds: string[]

  // ─── NEW: Agent state ───
  agentStatus: 'idle' | 'running' | 'paused'
  agentTaskId: string | null
  agentLiveIssues: ReviewIssue[]
  agentCurrentPhase: string
  agentProgress: number
  agentCurrentFile: string
  agentFoundCount: number
  reviewTasks: ReviewTask[]

  // ─── Existing actions ───
  loadLLMConfigs: () => void
  addLLMConfig: (cfg: Omit<LLMConfig, 'id' | 'createdAt'>) => void
  // ... (existing actions)

  // ─── NEW: Agent actions ───
  startAgentReview: (projectId: string, mrIds: string[]) => Promise<void>
  controlAgent: (action: 'pause' | 'resume' | 'skip' | 'cancel') => void
  toggleAgentRule: (ruleId: string, enabled: boolean) => void
  loadReviewTasks: () => void
  resetAgentState: () => void
}
```

In the store implementation (`create<CodeReviewStore>((set, get) => ({`), add initial state:

```typescript
// NEW: Agent initial state
agentStatus: 'idle',
agentTaskId: null,
agentLiveIssues: [],
agentCurrentPhase: '',
agentProgress: 0,
agentCurrentFile: '',
agentFoundCount: 0,
reviewTasks: [],
```

Add actions:

```typescript
// NEW: Agent actions

startAgentReview: async (projectId, mrIds) => {
  const worker = getAgentWorker()
  if (!worker) { set({ reviewError: 'Agent Worker 未初始化' }); return }

  const taskId = crypto.randomUUID()
  set({ agentStatus: 'running', agentTaskId: taskId, agentLiveIssues: [], agentCurrentPhase: 'preparing', agentProgress: 0, agentFoundCount: 0, reviewError: null })

  const unsub = subscribeToWorker((msg) => {
    const state = get()
    if (msg.type === 'agent:progress') {
      if (msg.taskId === taskId) {
        set({ agentCurrentPhase: msg.phase, agentProgress: msg.percent, agentCurrentFile: msg.currentFile, agentFoundCount: msg.foundCount })
      }
    } else if (msg.type === 'agent:issue-found') {
      if (msg.taskId === taskId) {
        set(s => ({ agentLiveIssues: [...s.agentLiveIssues, msg.issue] }))
      }
    } else if (msg.type === 'agent:phase-change') {
      if (msg.taskId === taskId) set({ agentCurrentPhase: msg.toPhase })
    } else if (msg.type === 'agent:completed') {
      if (msg.taskId === taskId) {
        set({ agentStatus: 'idle', agentTaskId: null, agentProgress: 1 })
        state.loadMRReviewRecords()
        state.loadReviewTasks()
      }
    } else if (msg.type === 'agent:error') {
      if (msg.taskId === taskId) {
        set({ agentStatus: 'idle', agentTaskId: null, reviewError: msg.error })
      }
    }
  })

  sendToWorker({ type: 'agent:start', taskId, projectId, mrIds })
},

controlAgent: (action) => {
  const { agentTaskId } = get()
  if (!agentTaskId) return
  sendToWorker({ type: 'agent:control', action })
  if (action === 'pause') set({ agentStatus: 'paused' })
  else if (action === 'resume') set({ agentStatus: 'running' })
  else if (action === 'cancel') set({ agentStatus: 'idle', agentTaskId: null })
},

toggleAgentRule: (ruleId, enabled) => {
  sendToWorker({ type: 'agent:rule-toggle', ruleId, enabled })
},

loadReviewTasks: () => {
  const tasks = getAllReviewTasks()
  set({ reviewTasks: tasks })
},

resetAgentState: () => {
  set({
    agentStatus: 'idle', agentTaskId: null, agentLiveIssues: [],
    agentCurrentPhase: '', agentProgress: 0, agentCurrentFile: '', agentFoundCount: 0,
  })
},
```

**Important:** Add imports at the top of the file:

```typescript
import { getAgentWorker, sendToWorker, subscribeToWorker } from '@/agents/agentWorkerManager'
import { getAllReviewTasks } from '@/db/agentDao'
import type { ReviewTask } from '@/types/agent'
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No type errors. The Circular import between worker manager and store must resolve cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/store/codeReviewStore.ts
git commit -m "feat: add Agent state and actions to codeReviewStore"
```

### Task 14: Process visualization component

**Files:**
- Create: `src/components/AgentProgress.tsx`

- [ ] **Step 1: Create the live progress UI component**

```typescript
// src/components/AgentProgress.tsx
import { useCodeReviewStore } from '@/store/codeReviewStore'
import Icon from './Icon'

const PHASE_LABELS: Record<string, string> = {
  preparing: '准备',
  analyzing: '分析',
  locating: '定位',
  reflecting: '反思',
  completed: '完成',
}

export default function AgentProgress() {
  const {
    agentStatus, agentCurrentPhase, agentProgress,
    agentCurrentFile, agentFoundCount, agentLiveIssues,
    controlAgent,
  } = useCodeReviewStore()

  if (agentStatus === 'idle') return null

  const phases = ['preparing', 'analyzing', 'locating', 'reflecting']
  const currentIdx = phases.indexOf(agentCurrentPhase)

  return (
    <div className="agent-progress" style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="progress_activity" style={{ animation: agentStatus === 'running' ? 'spin 1s linear infinite' : 'none' }} />
          <span style={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
            {agentStatus === 'paused' ? '已暂停' : '正在评审'}
          </span>
        </div>
        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {PHASE_LABELS[agentCurrentPhase] || agentCurrentPhase} — {Math.round(agentProgress * 100)}%
        </span>
      </div>

      {/* Phase indicators */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {phases.map((phase, idx) => (
          <div key={phase} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: idx < currentIdx ? 'var(--primary)' :
                        idx === currentIdx ? 'var(--primary)' : 'var(--border)',
            opacity: idx <= currentIdx ? 1 : 0.3,
          }} />
        ))}
      </div>

      {/* Status details */}
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontFamily: 'Fira Code, monospace' }}>
        {agentCurrentFile && <div>当前文件: {agentCurrentFile}</div>}
        <div>已发现: {agentFoundCount} 个问题</div>
      </div>

      {/* Live issues list */}
      {agentLiveIssues.length > 0 && (
        <div style={{ marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
          {agentLiveIssues.map(issue => (
            <div key={issue.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 8px', fontSize: '13px',
              background: 'var(--bg-primary)', borderRadius: '6px', marginBottom: '4px',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: issue.severity === 'critical' ? '#EF4444' : issue.severity === 'warning' ? '#F59E0B' : '#3B82F6',
              }} />
              <span style={{ flex: 1 }}>{issue.title}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{issue.filePath}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {agentStatus === 'running' ? (
          <button onClick={() => controlAgent('pause')} className="btn btn-outline btn-sm">
            <Icon name="pause" /> 暂停
          </button>
        ) : (
          <button onClick={() => controlAgent('resume')} className="btn btn-outline btn-sm">
            <Icon name="play_arrow" /> 继续
          </button>
        )}
        <button onClick={() => controlAgent('skip')} className="btn btn-outline btn-sm">
          <Icon name="skip_next" /> 跳过当前MR
        </button>
        <button onClick={() => controlAgent('cancel')} className="btn btn-outline btn-sm" style={{ color: '#EF4444' }}>
          <Icon name="cancel" /> 取消
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors. If Icon component doesn't have these names, use `span` with text labels instead.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentProgress.tsx
git commit -m "feat: add AgentProgress component with live phase tracking and controls"
```

---

## Phase 5: UI — Rules, Reports, Schedule Config

### Task 15: RuleEditor component

**Files:**
- Create: `src/components/RuleEditor.tsx`

- [ ] **Step 1: Create rule editor with form for CRUD**

```typescript
// src/components/RuleEditor.tsx
import { useState, useEffect } from 'react'
import type { AgentRule } from '@/types/agent'

interface Props {
  rule?: AgentRule | null
  onSave: (rule: Omit<AgentRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void
  onCancel: () => void
}

export default function RuleEditor({ rule, onSave, onCancel }: Props) {
  const [name, setName] = useState(rule?.name || '')
  const [content, setContent] = useState(rule?.content || '')
  const [severity, setSeverity] = useState<AgentRule['severity']>(rule?.severity || 'warning')
  const [scope, setScope] = useState<'global' | 'project'>(rule?.scope || 'global')
  const [filePatterns, setFilePatterns] = useState((rule?.filePatterns || []).join('\n'))
  const [matchPatterns, setMatchPatterns] = useState((rule?.matchPatterns || []).join('\n'))
  const [examplesGood, setExamplesGood] = useState((rule?.examplesGood || []).join('\n'))
  const [examplesBad, setExamplesBad] = useState((rule?.examplesBad || []).join('\n'))

  const handleSave = () => {
    onSave({
      id: rule?.id,
      name: name.trim(),
      description: '',
      content: content.trim(),
      severity,
      scope,
      filePatterns: filePatterns.split('\n').filter(Boolean),
      matchPatterns: matchPatterns.split('\n').filter(Boolean),
      examplesGood: examplesGood.split('\n').filter(Boolean),
      examplesBad: examplesBad.split('\n').filter(Boolean),
      enabled: rule?.enabled ?? true,
      isBuiltin: rule?.isBuiltin ?? false,
    })
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>规则名称 *</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} placeholder="例如: 避免 any 类型" />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>规则说明 *</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }} placeholder="详细描述此规则的检查内容..." />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>严重度</label>
          <select value={severity} onChange={e => setSeverity(e.target.value as AgentRule['severity'])} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <option value="critical">严重 (critical)</option>
            <option value="warning">警告 (warning)</option>
            <option value="suggestion">建议 (suggestion)</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>作用范围</label>
          <select value={scope} onChange={e => setScope(e.target.value as 'global' | 'project')} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <option value="global">全局</option>
            <option value="project">项目</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>文件匹配 (glob, 每行一个)</label>
          <textarea value={filePatterns} onChange={e => setFilePatterns(e.target.value)} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Fira Code, monospace', fontSize: '12px' }} placeholder="*.tsx&#10;*.jsx" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>内容匹配 (正则, 每行一个)</label>
          <textarea value={matchPatterns} onChange={e => setMatchPatterns(e.target.value)} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Fira Code, monospace', fontSize: '12px' }} placeholder="dangerouslySetInnerHTML&#10;\.innerHTML\s*=" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>正面案例 (每行一个)</label>
          <textarea value={examplesGood} onChange={e => setExamplesGood(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '12px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>反面案例 (每行一个)</label>
          <textarea value={examplesBad} onChange={e => setExamplesBad(e.target.value)} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '12px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn btn-outline btn-sm">取消</button>
        <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={!name.trim() || !content.trim()}>保存</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RuleEditor.tsx
git commit -m "feat: add RuleEditor component for rule CRUD"
```

### Task 16: RuleList component

**Files:**
- Create: `src/components/RuleList.tsx`

- [ ] **Step 1: Create the rule list with toggle and edit**

```typescript
// src/components/RuleList.tsx
import Icon from './Icon'

interface RuleItem {
  id: string
  name: string
  severity: string
  enabled: boolean
  isBuiltin: boolean
  filePatterns: string[]
}

interface Props {
  rules: RuleItem[]
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (rule: RuleItem) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

export default function RuleList({ rules, onToggle, onEdit, onDelete, onAdd }: Props) {
  const severityColor = (s: string) => s === 'critical' ? '#EF4444' : s === 'warning' ? '#F59E0B' : '#3B82F6'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Fira Code, monospace' }}>评审规则</h3>
        <button onClick={onAdd} className="btn btn-primary btn-sm">
          <Icon name="add" /> 新建规则
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rules.map(rule => (
          <div key={rule.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '8px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: severityColor(rule.severity), flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{rule.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'Fira Code, monospace' }}>
                  {rule.filePatterns.slice(0, 3).join(', ')}
                  {rule.filePatterns.length > 3 && ` +${rule.filePatterns.length - 3}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={rule.enabled} onChange={e => onToggle(rule.id, e.target.checked)} />
                启用
              </label>
              <button onClick={() => onEdit(rule)} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                <Icon name="edit" />
              </button>
              {!rule.isBuiltin && (
                <button onClick={() => onDelete(rule.id)} className="btn btn-outline btn-sm" style={{ padding: '4px 8px', color: '#EF4444' }}>
                  <Icon name="delete" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RuleList.tsx
git commit -m "feat: add RuleList component with toggle and edit"
```

### Task 17: Integrate into CodeReview page

**Files:**
- Modify: `src/pages/CodeReview.tsx`

- [ ] **Step 1: Add Agent UI to the CodeReview page**

Add Agent state imports and components:

```typescript
import AgentProgress from '@/components/AgentProgress'
import RuleList from '@/components/RuleList'
import RuleEditor from '@/components/RuleEditor'
import { getAllAgentRules, insertAgentRule, updateAgentRule, deleteAgentRule } from '@/db/agentDao'
import type { AgentRule } from '@/types/agent'
```

Add state for rules:

```typescript
const [agentRules, setAgentRules] = useState<AgentRule[]>([])
const [editingRule, setEditingRule] = useState<AgentRule | null>(null)
const [showRuleEditor, setShowRuleEditor] = useState(false)
```

Add load/action functions:

```typescript
const loadRules = () => setAgentRules(getAllAgentRules())

const handleRuleToggle = (id: string, enabled: boolean) => {
  updateAgentRule(id, { enabled })
  loadRules()
  toggleAgentRule(id, enabled) // tell Worker
}

const handleRuleSave = (rule: Omit<AgentRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
  const now = new Date().toISOString()
  if (rule.id) {
    updateAgentRule(rule.id, { ...rule, updatedAt: now })
  } else {
    const newRule: AgentRule = {
      ...rule, id: crypto.randomUUID(), isBuiltin: rule.isBuiltin ?? false,
      createdAt: now, updatedAt: now,
    }
    insertAgentRule(newRule)
  }
  setShowRuleEditor(false)
  setEditingRule(null)
  loadRules()
}

const handleRuleDelete = (id: string) => {
  deleteAgentRule(id)
  loadRules()
}
```

Add `useEffect` to load rules:

```typescript
useEffect(() => {
  loadLLMConfigs(); loadMCPs(); loadSkills()
  loadRules() // NEW
  loadReviewTasks() // NEW
  useProjectStore.getState().loadProjects()
}, [])
```

In the JSX, add after the existing ProjectSelector section and before the results section:

```tsx
{/* Agent Progress (shown when running) */}
<AgentProgress />

{/* Rules section */}
<div style={{ marginTop: '24px' }}>
  <RuleList
    rules={agentRules}
    onToggle={handleRuleToggle}
    onEdit={(rule) => { setEditingRule(rule); setShowRuleEditor(true) }}
    onDelete={handleRuleDelete}
    onAdd={() => { setEditingRule(null); setShowRuleEditor(true) }}
  />
</div>

{showRuleEditor && (
  <div style={{ marginTop: '12px' }}>
    <RuleEditor
      rule={editingRule}
      onSave={handleRuleSave}
      onCancel={() => { setShowRuleEditor(false); setEditingRule(null) }}
    />
  </div>
)}

{/* Start button — now uses Agent */}
<button onClick={() => startAgentReview(selectedProjectIds[0], [])} ... >开始评审</button>
```

**Note**: The exact integration depends on the current page layout. Modify existing JSX minimally — add the Agent components alongside existing ones. Keep both old and new flows functional.

- [ ] **Step 2: Commit**

```bash
git add src/pages/CodeReview.tsx
git commit -m "feat: integrate Agent UI, rules, and progress into CodeReview page"
```

---

## Phase 6: Main Process — Scheduler, Tray, IPC

### Task 18: Add scheduler and IPC handlers to main process

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Add node-cron dependency**

```bash
npm install node-cron
npm install -D @types/node-cron
```

- [ ] **Step 2: Add scheduler to main.ts**

In `electron/main.ts`, add import:

```typescript
import cron from 'node-cron'
```

Add scheduler state after the existing `store` declaration:

```typescript
let cronJob: cron.ScheduledTask | null = null
const SCHEDULE_KEY = 'agent-schedule'
```

Add scheduler functions:

```typescript
function initScheduler(): void {
  const config = store.get(SCHEDULE_KEY) as { cronExpression?: string; enabled?: boolean } | undefined
  const expression = config?.cronExpression || '0 9 * * 1-5' // default: weekdays 9am
  const enabled = config?.enabled !== false

  if (cronJob) cronJob.stop()

  if (enabled && cron.validate(expression)) {
    cronJob = cron.schedule(expression, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent:schedule-tick', { triggerTime: new Date().toISOString() })
      }
    })
  }
}

function getNextScheduledRun(): string | null {
  if (!cronJob) return null
  try {
    return cronJob.nextDate().toISOString()
  } catch { return null }
}
```

Add IPC handlers:

```typescript
ipcMain.handle('agent:get-schedule', async () => {
  return store.get(SCHEDULE_KEY) || { cronExpression: '0 9 * * 1-5', enabled: true }
})

ipcMain.handle('agent:set-schedule', async (_event, config: { cronExpression: string; enabled: boolean }) => {
  store.set(SCHEDULE_KEY, config)
  initScheduler()
})

ipcMain.handle('agent:get-next-run', async () => {
  return getNextScheduledRun()
})
```

Call `initScheduler()` after main window creation (in the `createWindow` function, after `mainWindow = new BrowserWindow(...)`):

```typescript
initScheduler()
```

Update tray menu to include schedule info:

```typescript
function updateTrayMenu(): void {
  if (!tray) return
  const nextRun = getNextScheduledRun()
  const nextRunLabel = nextRun ? `下次扫描: ${new Date(nextRun).toLocaleString('zh-CN')}` : '定时扫描未启用'
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } } },
    { label: nextRunLabel, enabled: false },
    { label: '立即扫描', click: () => { if (mainWindow) mainWindow.webContents.send('agent:schedule-tick', { triggerTime: new Date().toISOString() }) } },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(contextMenu)
}
```

- [ ] **Step 3: Add window-close confirmation for Windows**

Replace the existing `window-all-closed` handler:

```typescript
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Check if user has set preference
    const closeBehavior = store.get('close-behavior') as string | undefined
    if (closeBehavior === 'quit') {
      app.quit()
    } else if (closeBehavior === 'tray') {
      // Keep running in tray, window already closed
    } else {
      // First time: ask user via dialog
      // Since all windows are closed, we use a simple default: keep in tray
      // The dialog is shown BEFORE the window closes (handled in the renderer)
      app.quit()
    }
  }
})
```

**Simpler approach for Phase 1:** Add a "close to tray" IPC handler that the renderer calls before closing:

```typescript
ipcMain.handle('agent:confirm-close', async () => {
  const closeBehavior = store.get('close-behavior') as string | undefined
  if (closeBehavior === 'quit') return { action: 'quit' }
  if (closeBehavior === 'tray') return { action: 'tray' }
  // First time: ask (for simplicity, default to tray on re-launch, quit on first)
  return { action: 'tray' } // Default to minimize to tray
})
```

- [ ] **Step 4: Update preload.ts to expose new IPC channels**

Add to `contextBridge.exposeInMainWorld('electronAPI', {`:

```typescript
getSchedule: () => ipcRenderer.invoke('agent:get-schedule'),
setSchedule: (config: { cronExpression: string; enabled: boolean }) => ipcRenderer.invoke('agent:set-schedule', config),
getNextScheduledRun: () => ipcRenderer.invoke('agent:get-next-run'),
onScheduleTick: (callback: () => void) => {
  const handler = () => callback()
  ipcRenderer.on('agent:schedule-tick', handler)
  return handler
},
removeScheduleTick: (handler: () => void) => {
  ipcRenderer.removeListener('agent:schedule-tick', handler)
},
confirmClose: () => ipcRenderer.invoke('agent:confirm-close'),
```

**Note:** For `onScheduleTick`, since contextBridge can't pass functions directly, use a different pattern. Let the renderer register via a separate IPC invoke that stores the callback in main. Or use `ipcRenderer.on` directly in preload with an event-based bridge.

Use the simpler pattern — Event-based:

```typescript
onScheduleTick: (callback: () => void) => {
  const handler = () => callback()
  ipcRenderer.on('agent:schedule-tick', handler)
  // Return cleanup function
  return () => ipcRenderer.removeListener('agent:schedule-tick', handler)
},
```

But `contextBridge` serializes return values. Instead, expose it as an add/remove pair:

```typescript
addScheduleTickListener: (callback: () => void) => {
  const wrappedCallback = () => callback()
  ipcRenderer.on('agent:schedule-tick', wrappedCallback)
  // Store for removal
},
```

**Simplest approach:** Use `window.electronAPI.onScheduleTick` that takes no callback — instead, the UI polls or the preload manages a single listener:

```typescript
// In preload.ts, expose:
scheduleTickListenerCount: 0,
onScheduleTick: (callback: () => void) => {
  ipcRenderer.on('agent:schedule-tick', () => callback())
},
```

Since contextBridge serialization is a constraint, use this pattern:

```typescript
electronAPI: {
  // ... existing
  getSchedule: () => ipcRenderer.invoke('agent:get-schedule'),
  setSchedule: (config: { cronExpression: string; enabled: boolean }) => ipcRenderer.invoke('agent:set-schedule', config),
  getNextScheduledRun: () => ipcRenderer.invoke('agent:get-next-run'),
  confirmClose: () => ipcRenderer.invoke('agent:confirm-close'),
}
```

For the schedule tick, use `ipcRenderer.on` in main.tsx directly (renderer process has access to `ipcRenderer` if `nodeIntegration` is enabled — but this app uses `contextIsolation: true`). Use the preload bridge:

```typescript
// In preload, expose via a different API key to avoid serialization issues:
contextBridge.exposeInMainWorld('agentBridge', {
  onScheduleTick: (cb: () => void) => {
    ipcRenderer.on('agent:schedule-tick', cb)
  },
  removeScheduleTick: (cb: () => void) => {
    ipcRenderer.removeListener('agent:schedule-tick', cb)
  },
})
```

Add to the `Window` interface:

```typescript
agentBridge?: {
  onScheduleTick: (cb: () => void) => void
  removeScheduleTick: (cb: () => void) => void
}
```

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts electron/preload.ts src/types/index.ts package.json package-lock.json
git commit -m "feat: add node-cron scheduler, tray menu updates, and new IPC handlers"
```

---

## Phase 7: Schedule Config UI & Report Components

### Task 19: ScheduleConfig component

**Files:**
- Create: `src/components/ScheduleConfig.tsx`

- [ ] **Step 1: Create schedule configuration UI**

```typescript
// src/components/ScheduleConfig.tsx
import { useState, useEffect } from 'react'

interface ScheduleConfig {
  cronExpression: string
  enabled: boolean
}

export default function ScheduleConfig() {
  const [config, setConfig] = useState<ScheduleConfig>({ cronExpression: '0 9 * * 1-5', enabled: true })
  const [nextRun, setNextRun] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (window.electronAPI?.getSchedule) {
      window.electronAPI.getSchedule().then(c => {
        if (c) setConfig(c)
        setLoading(false)
      })
      window.electronAPI.getNextScheduledRun?.().then(setNextRun)
    } else {
      setLoading(false)
    }
  }, [])

  const handleSave = async () => {
    await window.electronAPI?.setSchedule?.(config)
    const next = await window.electronAPI?.getNextScheduledRun?.()
    setNextRun(next || null)
  }

  const presets = [
    { label: '每小时', value: '0 * * * *' },
    { label: '每天 9:00', value: '0 9 * * *' },
    { label: '工作日 9:00', value: '0 9 * * 1-5' },
    { label: '每周一 9:00', value: '0 9 * * 1' },
  ]

  if (loading) return <div>加载中...</div>

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px',
      border: '1px solid var(--border)', marginBottom: '16px',
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Fira Code, monospace', marginBottom: '12px' }}>定时扫描</h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => setConfig(c => ({ ...c, cronExpression: p.value }))}
            className={config.cronExpression === p.value ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Cron 表达式</label>
        <input
          value={config.cronExpression}
          onChange={e => setConfig(c => ({ ...c, cronExpression: e.target.value }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Fira Code, monospace' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={config.enabled} onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))} />
          <span style={{ fontSize: '14px' }}>启用定时扫描</span>
        </label>
        <button onClick={handleSave} className="btn btn-primary btn-sm">保存</button>
      </div>

      {nextRun && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Fira Code, monospace' }}>
          下次扫描: {new Date(nextRun).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScheduleConfig.tsx
git commit -m "feat: add ScheduleConfig component with cron presets"
```

### Task 20: ReportGenerator component

**Files:**
- Create: `src/components/ReportGenerator.tsx`

- [ ] **Step 1: Create report generation dialog**

```typescript
// src/components/ReportGenerator.tsx
import { useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import { useProjectStore } from '@/store/projectStore'
import { insertAgentReport } from '@/db/agentDao'
import { getAllMRReviewRecords } from '@/db/codeReviewDao'
import { getAllMemories } from '@/db/agentDao'
import type { AgentReport } from '@/types/agent'

interface Props {
  onClose: () => void
  onGenerated: (report: AgentReport) => void
}

export default function ReportGenerator({ onClose, onGenerated }: Props) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handleGenerate = () => {
    let start: Date, end: Date
    end = new Date()
    switch (timeRange) {
      case 'week': start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break
      case 'month': start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break
      default: start = new Date(customStart); end = new Date(customEnd); break
    }

    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const allRecords = getAllMRReviewRecords()
    const records = allRecords.filter(r => r.createdAt >= startISO && r.createdAt <= endISO)

    const totalIssues = records.reduce((sum, r) => sum + r.issues.length, 0)
    const bySeverity = { critical: 0, warning: 0, suggestion: 0 }
    records.forEach(r => r.issues.forEach(i => { bySeverity[i.severity]++ }))

    const memories = getAllMemories()
    const topPatterns = memories
      .filter(m => m.type === 'pattern')
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10)
      .map(m => ({ title: m.title, count: m.occurrenceCount }))

    const statsJson = JSON.stringify({ totalIssues, bySeverity, totalMRs: records.length, totalProjects: new Set(records.map(r => r.projectId)).size })
    const topIssuesJson = JSON.stringify(topPatterns)

    const summary = `在 ${startISO.slice(0, 10)} 至 ${endISO.slice(0, 10)} 期间，共扫描 ${records.length} 个 MR，发现 ${totalIssues} 个问题（${bySeverity.critical} 严重、${bySeverity.warning} 警告、${bySeverity.suggestion} 建议）。`

    const report: AgentReport = {
      id: crypto.randomUUID(),
      timeRangeStart: startISO,
      timeRangeEnd: endISO,
      projectIds: [],
      summary,
      statsJson,
      topIssuesJson,
      createdAt: new Date().toISOString(),
    }

    insertAgentReport(report)
    onGenerated(report)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: '12px', padding: '24px',
        minWidth: '400px', maxWidth: '500px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>生成评审报告</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>时间范围</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'week', label: '最近一周' },
              { key: 'month', label: '最近一月' },
              { key: 'custom', label: '自定义' },
            ].map(o => (
              <button key={o.key} onClick={() => setTimeRange(o.key as typeof timeRange)}
                className={timeRange === o.key ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {timeRange === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>开始日期</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>结束日期</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-outline">取消</button>
          <button onClick={handleGenerate} className="btn btn-primary" disabled={timeRange === 'custom' && (!customStart || !customEnd)}>生成报告</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReportGenerator.tsx
git commit -m "feat: add ReportGenerator dialog with time range selection"
```

---

## Phase 8: Final Integration & Verification

### Task 21: Wire DB request handling in store

**Files:**
- Modify: `src/store/codeReviewStore.ts`

Add a `setupDbProxy` function called during store initialization (inside the `create` callback, after the state/actions definition, call it):

```typescript
// Handle DB requests from Agent Web Worker
import { getDatabase, persistDatabase } from '@/db/index'
import type { WorkerOutMessage } from '@/agents/messageTypes'

function setupDbProxy(): void {
  const unsub = subscribeToWorker(async (msg: WorkerOutMessage) => {
    const db = getDatabase()
    if (!db) return

    try {
      if (msg.type === 'agent:db-search-memories') {
        const memories = searchMemories(msg.projectId, msg.filePatterns, msg.limit)
        sendToWorker({ type: 'agent:db-response', requestId: msg.requestId, result: memories })
      } else if (msg.type === 'agent:db-write-memory') {
        const now = new Date().toISOString()
        const memory = { ...msg.memory, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
        insertMemory(memory)
        sendToWorker({ type: 'agent:db-response', requestId: msg.requestId, result: memory })
      } else if (msg.type === 'agent:db-task-create') {
        const task = { ...msg.task, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
        insertReviewTask(task)
        sendToWorker({ type: 'agent:db-response', requestId: msg.requestId, result: task })
      } else if (msg.type === 'agent:db-task-update') {
        updateReviewTask(msg.id, msg.updates)
        sendToWorker({ type: 'agent:db-response', requestId: msg.requestId, result: undefined })
      } else if (msg.type === 'agent:db-batch') {
        try {
          db.run('BEGIN')
          for (const stmt of msg.statements) {
            db.run(stmt.sql, stmt.params || [])
          }
          db.run('COMMIT')
          persistDatabase()
          sendToWorker({ type: 'agent:db-batch-done', requestId: msg.requestId })
        } catch (err) {
          try { db.run('ROLLBACK') } catch { /* ignore */ }
          sendToWorker({ type: 'agent:db-batch-done', requestId: msg.requestId, error: err instanceof Error ? err.message : 'Batch failed' })
        }
      } else if (msg.type === 'agent:db-query') {
        const result = db.exec(msg.sql)
        sendToWorker({ type: 'agent:db-response', requestId: msg.requestId, result: result[0]?.values || [] })
      }
    } catch (err) {
      sendToWorker({ type: 'agent:db-batch-done', requestId: msg.requestId, error: err instanceof Error ? err.message : 'DB error' })
    }
  })
}

// Call during store creation
setupDbProxy()
```

- [ ] **Step 2: Commit**

```bash
git add src/store/codeReviewStore.ts
git commit -m "feat: wire DB request proxy for Agent Web Worker in store"
```

### Task 22: Final compilation and runtime verification

- [ ] **Step 1: Verify full TypeScript compilation**

```bash
npx tsc --noEmit
```

Fix any remaining type errors. Common issues:
- Import paths (`@/` alias)
- Missing type exports from `src/types/agent.ts`
- Worker.postMessage serialization — ensure all message types are serializable

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts without errors. Check browser console for:
- "[App] Database and Agent Worker initialized"
- No Worker errors
- Web Worker chunk loads in Network tab

- [ ] **Step 3: Quick functional smoke test (with MockProvider)**

Temporarily change the LLM provider in `worker.ts` to use `MockProvider`:

```typescript
// For testing, use mock provider
import { MockProvider } from './llmProvider'
const llmProvider = new MockProvider()
```

Start the app, go to CodeReview page, select a project, click "开始评审". Verify:
- `AgentProgress` component shows
- Phase indicators progress through stages
- Mock issues appear in the live issues list
- Controls (pause/resume/cancel) work
- Task completes and shows in history

Revert to real provider after test.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve compilation errors and integration issues"
```

---

## Task 23: Self-Review Checklist

- [ ] **Spec coverage check:** Review the spec document section by section. Confirm each feature has corresponding tasks: Architecture (Tasks 1-7), Pipeline (8-12), Token Budget (8), Rules (9, 15-16), Memory (10), Reports (20), Process Visualization (14), Scheduling (18-19), IPC (4, 18), DB (2-3)
- [ ] **No unresolved imports:** Verify all imports in created files resolve to existing modules. The `@/` alias maps to `src/`.
- [ ] **Worker message types match on both sides:** `WorkerInMessage` and `WorkerOutMessage` are used correctly — UI sends `WorkerInMessage`, Worker sends `WorkerOutMessage`.
- [ ] **DB operations use sql.js patterns:** Follow existing `codeReviewDao.ts` conventions: `getDatabase()?.exec()`, `persistDatabase()` after writes, column-index mapping for reads.
- [ ] **Zustand store actions follow existing pattern:** `crypto.randomUUID()` for IDs, `new Date().toISOString()` for timestamps.
