# AI 代码评审功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在左侧菜单新增代码评审页签，串联用户配置的 MCP + LLM，对维护项目的代码仓库进行 AI 辅助评审，评审问题按项目区分记录存储。

**Architecture:** Electron 主进程代理 MCP HTTP 请求；渲染层 React 通过 IPC 调用 main 的 MCP 工具；LLM streaming 集成 AI tool_calls；评审结果存 sql.js 三张新表。

**Tech Stack:** React SPA + Zustand + sql.js + Electron IPC + Fetch( streaming) + Material Symbols

---

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/types/index.ts` | 修改 | 新增 `CodeReview`, `MCPService`, `Skill` 类型 |
| `src/db/index.ts` | 修改 | 新增 `code_reviews`, `mcp_services`, `skills` 三张表 |
| `src/db/codeReviewDao.ts` | 创建 | `codeReviewDao` CRUD（问题）+ `mcpServiceDao` + `skillDao` |
| `src/store/codeReviewStore.ts` | 创建 | 状态管理：MCP 列表、Skill 列表、当前评审状态、流式输出 |
| `src/pages/CodeReview.tsx` | 创建 | 页面主组件：配置面板 + 评审操作区 + Streaming 区 + 问题列表 |
| `src/components/Sidebar.tsx` | 修改 | navItems 新增代码评审入口 |
| `src/App.tsx` | 修改 | 新增 Route `/code-review` |
| `src/components/Icon.tsx` | 修改 | 新增 `code` 图标名 |
| `electron/preload.ts` | 修改 | 暴露 `mcp:invoke-tool`, `mcp:list-tools`, `store:get`, `store:set` |
| `electron/main.ts` | 修改 | 处理 MCP IPC handlers + electron-store 集成 |

---

## Task 1: 类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 添加 CodeReview, MCPService, Skill 类型**

```ts
// src/types/index.ts 追加

export interface CodeReview {
  id: string
  projectId: string
  repository: string
  branch: string
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath?: string
  lineRange?: string
  aiTrace: string
  createdAt: string
}

export interface MCPService {
  id: string
  name: string
  url: string
  authHeader?: string  // 加密存储
  enabled: boolean
  createdAt: string
}

export interface Skill {
  id: string
  name: string
  description?: string
  content: string
  enabled: boolean
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(code-review): add CodeReview, MCPService, Skill types"
```

---

## Task 2: 数据库初始化 — 新增三张表

**Files:**
- Modify: `src/db/index.ts`

- [ ] **Step 1: 在 initDatabase() 中 CREATE 三张表**

在 projects 表创建之后追加：

```ts
db.run(`
  CREATE TABLE IF NOT EXISTS mcp_services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    auth_header TEXT DEFAULT '',
    enabled INTEGER DEFAULT 1,
    created_at TEXT
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    content TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS code_reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    repository TEXT NOT NULL,
    branch TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    file_path TEXT DEFAULT '',
    line_range TEXT DEFAULT '',
    ai_trace TEXT DEFAULT '',
    created_at TEXT
  )
`)
```

- [ ] **Step 2: Commit**

```bash
git add src/db/index.ts
git commit -m "feat(code-review): add mcp_services, skills, code_reviews tables"
```

---

## Task 3: DAO 层

**Files:**
- Create: `src/db/codeReviewDao.ts`
- Test: `src/db/codeReviewDao.test.ts`

- [ ] **Step 1: 写测试**

```ts
// src/db/codeReviewDao.test.ts
import { getDatabase } from './index'
import { initDatabase } from './index'
import {
  insertMCPService, getAllMCPServices, updateMCPService, deleteMCPService,
  insertSkill, getAllSkills, updateSkill, deleteSkill,
  insertCodeReview, getCodeReviewsByProject, deleteCodeReview,
} from './codeReviewDao'

beforeAll(async () => {
  await initDatabase()
})

describe('codeReviewDao', () => {
  describe('mcp_services', () => {
    it('should insert and retrieve mcp service', async () => {
      const svc = {
        id: 'test-mcp-1',
        name: 'Test MCP',
        url: 'https://mcp.example.com',
        authHeader: 'Bearer token',
        enabled: true,
        createdAt: new Date().toISOString(),
      }
      insertMCPService(svc)
      const rows = getAllMCPServices()
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.find(r => r.id === 'test-mcp-1')?.name).toBe('Test MCP')
    })

    it('should toggle enabled state', async () => {
      updateMCPService('test-mcp-1', { enabled: false })
      const row = getAllMCPServices().find(r => r.id === 'test-mcp-1')
      expect(row?.enabled).toBe(false)
    })

    it('should delete mcp service', async () => {
      deleteMCPService('test-mcp-1')
      const row = getAllMCPServices().find(r => r.id === 'test-mcp-1')
      expect(row).toBeUndefined()
    })
  })

  describe('skills', () => {
    it('should insert and retrieve skill', async () => {
      const skill = {
        id: 'test-skill-1',
        name: 'Code Review Skill',
        description: 'A skill for code review',
        content: '# Code Review Skill\n\nYou are a code reviewer.',
        enabled: true,
        createdAt: new Date().toISOString(),
      }
      insertSkill(skill)
      const rows = getAllSkills()
      expect(rows.find(r => r.id === 'test-skill-1')?.name).toBe('Code Review Skill')
    })
  })

  describe('code_reviews', () => {
    it('should insert and query code review records', async () => {
      const record = {
        id: 'test-cr-1',
        projectId: 'proj-1',
        repository: 'https://github.com/example/repo',
        branch: 'main',
        severity: 'critical',
        title: 'Memory leak detected',
        description: 'Buffer not freed',
        filePath: 'src/utils/memory.ts',
        lineRange: '12-15',
        aiTrace: 'Tool call: get_diff → result: ...',
        createdAt: new Date().toISOString(),
      }
      insertCodeReview(record)
      const rows = getCodeReviewsByProject('proj-1')
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0].severity).toBe('critical')
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/db/codeReviewDao.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: 实现 DAO**

```ts
// src/db/codeReviewDao.ts
import { getDatabase } from './index'
import type { MCPService, Skill, CodeReview } from '@/types'

// ── MCP Services ──────────────────────────────────────────────

export function insertMCPService(svc: MCPService): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO mcp_services (id, name, url, auth_header, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [svc.id, svc.name, svc.url, svc.authHeader || '', svc.enabled ? 1 : 0, svc.createdAt]
  )
}

export function getAllMCPServices(): MCPService[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM mcp_services ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    url: row[2] as string,
    authHeader: row[3] as string,
    enabled: row[4] === 1,
    createdAt: row[5] as string,
  }))
}

export function updateMCPService(id: string, updates: Partial<MCPService>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.name !== undefined) { fields.push('name = ?'); vals.push(updates.name) }
  if (updates.url !== undefined) { fields.push('url = ?'); vals.push(updates.url) }
  if (updates.authHeader !== undefined) { fields.push('auth_header = ?'); vals.push(updates.authHeader) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE mcp_services SET ${fields.join(', ')} WHERE id = ?`, vals)
}

export function deleteMCPService(id: string): void {
  getDatabase()?.run('DELETE FROM mcp_services WHERE id = ?', [id])
}

// ── Skills ─────────────────────────────────────────────────────

export function insertSkill(skill: Skill): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO skills (id, name, description, content, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [skill.id, skill.name, skill.description || '', skill.content, skill.enabled ? 1 : 0, skill.createdAt]
  )
}

export function getAllSkills(): Skill[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM skills ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    description: row[2] as string,
    content: row[3] as string,
    enabled: row[4] === 1,
    createdAt: row[5] as string,
  }))
}

export function updateSkill(id: string, updates: Partial<Skill>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.name !== undefined) { fields.push('name = ?'); vals.push(updates.name) }
  if (updates.description !== undefined) { fields.push('description = ?'); vals.push(updates.description) }
  if (updates.content !== undefined) { fields.push('content = ?'); vals.push(updates.content) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`, vals)
}

export function deleteSkill(id: string): void {
  getDatabase()?.run('DELETE FROM skills WHERE id = ?', [id])
}

// ── Code Reviews ───────────────────────────────────────────────

export function insertCodeReview(record: CodeReview): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO code_reviews (id, project_id, repository, branch, severity, title, description, file_path, line_range, ai_trace, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.id, record.projectId, record.repository, record.branch, record.severity,
     record.title, record.description, record.filePath || '', record.lineRange || '',
     record.aiTrace, record.createdAt]
  )
}

export function getCodeReviewsByProject(projectId: string): CodeReview[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec(
    `SELECT * FROM code_reviews WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  )
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    repository: row[2] as string,
    branch: row[3] as string,
    severity: row[4] as 'critical' | 'warning' | 'suggestion',
    title: row[5] as string,
    description: row[6] as string,
    filePath: row[7] as string,
    lineRange: row[8] as string,
    aiTrace: row[9] as string,
    createdAt: row[10] as string,
  }))
}

export function deleteCodeReview(id: string): void {
  getDatabase()?.run('DELETE FROM code_reviews WHERE id = ?', [id])
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/db/codeReviewDao.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/codeReviewDao.ts src/db/codeReviewDao.test.ts
git commit -m "feat(code-review): add codeReviewDao with CRUD for MCP services, skills, and code reviews"
```

---

## Task 4: Electron IPC — MCP 工具调用 + 加密存储

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: main.ts — 添加 MCP handlers + electron-store**

需要安装 electron-store：
```bash
npm install electron-store
```

```ts
// electron/main.ts 追加 import
import Store from 'electron-store'

const store = new Store() // 默认加密存储

// MCP handlers（放在 app.whenReady 之后）
ipcMain.handle('mcp:list-tools', async (_event, { serviceId, url, authHeader }) => {
  // 调用 MCP 服务的 tools/list 端点
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) headers['Authorization'] = authHeader

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })
  return res.json()
})

ipcMain.handle('mcp:invoke-tool', async (_event, { url, authHeader, toolName, toolArgs }) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) headers['Authorization'] = authHeader

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs },
    }),
  })
  return res.json()
})

// 加密存储
ipcMain.handle('store:get', (_event, key: string) => store.get(key))
ipcMain.handle('store:set', (_event, key: string, value: unknown) => { store.set(key, value) })
ipcMain.handle('store:delete', (_event, key: string) => store.delete(key))
```

- [ ] **Step 2: preload.ts — 暴露 API**

```ts
// electron/preload.ts 追加
contextBridge.exposeInMainWorld('mcpAPI', {
  listTools: (params: { serviceId: string; url: string; authHeader?: string }) =>
    ipcRenderer.invoke('mcp:list-tools', params),
  invokeTool: (params: { url: string; authHeader?: string; toolName: string; toolArgs: Record<string, unknown> }) =>
    ipcRenderer.invoke('mcp:invoke-tool', params),
})

contextBridge.exposeInMainWorld('secureStore', {
  get: (key: string) => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store:delete', key),
})
```

- [ ] **Step 3: src/types/index.ts — 追加 window 类型扩展**

```ts
// 追加到 declare global block
mcpAPI?: {
  listTools: (params: { serviceId: string; url: string; authHeader?: string }) => Promise<unknown>
  invokeTool: (params: { url: string; authHeader?: string; toolName: string; toolArgs: Record<string, unknown> }) => Promise<unknown>
}
secureStore?: {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  delete: (key: string) => Promise<void>
}
```

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts electron/preload.ts src/types/index.ts
git commit -m "feat(code-review): add MCP IPC handlers and encrypted store in Electron"
```

---

## Task 5: Zustand Store — 状态管理

**Files:**
- Create: `src/store/codeReviewStore.ts`

- [ ] **Step 1: 实现 store**

```ts
// src/store/codeReviewStore.ts
import { create } from 'zustand'
import type { MCPService, Skill, CodeReview } from '@/types'
import {
  getAllMCPServices, insertMCPService, updateMCPService, deleteMCPService,
  getAllSkills, insertSkill, updateSkill, deleteSkill,
  getCodeReviewsByProject,
} from '@/db/codeReviewDao'

interface ReviewStreamEvent {
  type: 'chunk' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  error?: string
}

interface CodeReviewStore {
  // MCP
  mcpServices: MCPService[]
  loadMCPServices: () => void
  addMCPService: (svc: Omit<MCPService, 'id' | 'createdAt'>) => void
  toggleMCPService: (id: string, enabled: boolean) => void
  removeMCPService: (id: string) => void

  // Skills
  skills: Skill[]
  loadSkills: () => void
  addSkill: (skill: Omit<Skill, 'id' | 'createdAt'>) => void
  toggleSkill: (id: string, enabled: boolean) => void
  removeSkill: (id: string) => void

  // Review state
  isReviewing: boolean
  streamEvents: ReviewStreamEvent[]
  reviewError: string | null
  currentProjectId: string | null

  startReview: (projectId: string, repository: string, branch: string, model: string, apiKey: string) => Promise<void>
  appendStreamEvent: (event: ReviewStreamEvent) => void
  clearStream: () => void

  // Results
  reviewRecords: CodeReview[]
  loadReviewRecords: (projectId: string) => void
  deleteReviewRecord: (id: string) => void
}

export const useCodeReviewStore = create<CodeReviewStore>((set, get) => ({
  mcpServices: [],
  skills: [],
  isReviewing: false,
  streamEvents: [],
  reviewError: null,
  currentProjectId: null,
  reviewRecords: [],

  loadMCPServices: () => {
    const rows = getAllMCPServices()
    set({ mcpServices: rows })
  },

  addMCPService: (svc) => {
    const newSvc: MCPService = {
      ...svc,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    insertMCPService(newSvc)
    set(state => ({ mcpServices: [newSvc, ...state.mcpServices] }))
  },

  toggleMCPService: (id, enabled) => {
    updateMCPService(id, { enabled })
    set(state => ({
      mcpServices: state.mcpServices.map(s => s.id === id ? { ...s, enabled } : s),
    }))
  },

  removeMCPService: (id) => {
    deleteMCPService(id)
    set(state => ({ mcpServices: state.mcpServices.filter(s => s.id !== id) }))
  },

  loadSkills: () => {
    const rows = getAllSkills()
    set({ skills: rows })
  },

  addSkill: (skill) => {
    const newSkill: Skill = {
      ...skill,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    insertSkill(newSkill)
    set(state => ({ skills: [newSkill, ...state.skills] }))
  },

  toggleSkill: (id, enabled) => {
    updateSkill(id, { enabled })
    set(state => ({
      skills: state.skills.map(s => s.id === id ? { ...s, enabled } : s),
    }))
  },

  removeSkill: (id) => {
    deleteSkill(id)
    set(state => ({ skills: state.skills.filter(s => s.id !== id) }))
  },

  appendStreamEvent: (event) => {
    set(state => ({ streamEvents: [...state.streamEvents, event] }))
  },

  clearStream: () => {
    set({ streamEvents: [], reviewError: null })
  },

  startReview: async (projectId, repository, branch, model, apiKey) => {
    set({ isReviewing: true, reviewError: null, currentProjectId: projectId, streamEvents: [] })

    const { mcpServices, skills } = get()
    const enabledMCPServices = mcpServices.filter(s => s.enabled)
    const enabledSkills = skills.filter(s => s.enabled)

    if (enabledMCPServices.length === 0) {
      set({ reviewError: '请至少配置并启用一个 MCP 服务', isReviewing: false })
      return
    }

    // 构建 system prompt
    const skillContent = enabledSkills.map(s => s.content).join('\n\n')
    const systemPrompt = `You are an expert code reviewer.${skillContent ? '\n\n' + skillContent : ''}`

    // 收集所有 MCP tool definitions
    const allToolDefs: Record<string, unknown>[] = []
    const mcpConnections: { url: string; authHeader?: string }[] = []

    for (const svc of enabledMCPServices) {
      try {
        const result = await window.mcpAPI!.listTools({ serviceId: svc.id, url: svc.url, authHeader: svc.authHeader })
        const tools = (result as { result?: { tools?: unknown[] } })?.result?.tools || []
        allToolDefs.push(...(tools as Record<string, unknown>[]))
        mcpConnections.push({ url: svc.url, authHeader: svc.authHeader })
      } catch (err) {
        console.error('[MCP] listTools failed for', svc.name, err)
      }
    }

    // LLM streaming 请求
    try {
      const response = await fetch(model, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'claude',
          max_tokens: 4096,
          stream: true,
          system: systemPrompt,
          tools: allToolDefs.length > 0 ? allToolDefs : undefined,
          messages: [{
            role: 'user',
            content: `请对仓库 ${repository}（分支 ${branch}）进行代码评审。\n重点关注：可维护性、性能、安全隐患、逻辑错误。\n评审完成后，请输出如下格式的 JSON：\n\`\`\`json\n[{ "severity": "critical|warning|suggestion", "title": "...", "description": "...", "filePath": "...", "lineRange": "..." }]\n\`\`\``,
          }],
        }),
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (delta?.content) {
              fullContent += delta.content
              get().appendStreamEvent({ type: 'chunk', content: delta.content })
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                get().appendStreamEvent({ type: 'tool_call', toolName: tc.name, toolArgs: tc.arguments })
                // 自动执行工具调用
                const conn = mcpConnections[0] // 目前只支持一个 MCP 服务
                if (conn) {
                  try {
                    const result = await window.mcpAPI!.invokeTool({
                      url: conn.url,
                      authHeader: conn.authHeader,
                      toolName: tc.name,
                      toolArgs: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments,
                    })
                    get().appendStreamEvent({ type: 'tool_result', toolName: tc.name, toolResult: result })
                  } catch (err) {
                    get().appendStreamEvent({ type: 'tool_result', toolName: tc.name, toolResult: { error: String(err) } })
                  }
                }
              }
            }
          } catch {}
        }
      }

      get().appendStreamEvent({ type: 'done' })

      // 解析 JSON 入库
      const jsonMatch = fullContent.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        try {
          const records = JSON.parse(jsonMatch[1])
          for (const r of records) {
            const record: CodeReview = {
              id: crypto.randomUUID(),
              projectId,
              repository,
              branch,
              severity: r.severity || 'suggestion',
              title: r.title || '',
              description: r.description || '',
              filePath: r.filePath || '',
              lineRange: r.lineRange || '',
              aiTrace: fullContent,
              createdAt: new Date().toISOString(),
            }
            insertCodeReview(record)
          }
          get().loadReviewRecords(projectId)
        } catch (err) {
          console.error('[CodeReview] JSON parse failed', err)
        }
      }
    } catch (err) {
      set({ reviewError: err instanceof Error ? err.message : '评审请求失败' })
    } finally {
      set({ isReviewing: false })
    }
  },

  loadReviewRecords: (projectId) => {
    const records = getCodeReviewsByProject(projectId)
    set({ reviewRecords: records })
  },

  deleteReviewRecord: (id) => {
    deleteCodeReview(id)
    const { currentProjectId } = get()
    if (currentProjectId) {
      set(state => ({
        reviewRecords: state.reviewRecords.filter(r => r.id !== id),
      }))
    }
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/store/codeReviewStore.ts
git commit -m "feat(code-review): add codeReviewStore with MCP, Skill, and streaming review state"
```

---

## Task 6: Icon 组件补充 code 图标

**Files:**
- Modify: `src/components/Icon.tsx`

- [ ] **Step 1: 查看现有图标映射，找到 Material Symbols 对应名称**

Material Symbols 中 code 相关图标名称为 `code`。在 Icon.tsx 的 `nameMap` 或 switch 中追加：

```ts
case 'code':
  return <span className="material-symbols-outlined">code</span>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat(code-review): add code icon to Icon component"
```

---

## Task 7: 路由和导航

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: App.tsx 添加 Route**

```tsx
import CodeReview from '@/pages/CodeReview'

// Routes 内追加
<Route path="/code-review" element={<CodeReview />} />
```

- [ ] **Step 2: Sidebar.tsx navItems 追加**

```ts
{ label: '代码评审', icon: 'code', path: '/code-review' }
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx
git commit -m "feat(code-review): add /code-review route and sidebar nav item"
```

---

## Task 8: CodeReview 页面组件

**Files:**
- Create: `src/pages/CodeReview.tsx`

- [ ] **Step 1: 实现页面组件**

```tsx
import React, { useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import Icon from '@/components/Icon'

// MCP 配置面板
function MCPPanel() {
  const { mcpServices, loadMCPServices, addMCPService, toggleMCPService, removeMCPService } = useCodeReviewStore()
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', url: '', authHeader: '' })

  useEffect(() => { loadMCPServices() }, [])

  const handleAdd = () => {
    if (!form.name || !form.url) return
    addMCPService({ ...form, enabled: true })
    setForm({ name: '', url: '', authHeader: '' })
    setShowForm(false)
  }

  return (
    <div className="border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">MCP 服务</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-primary-500 hover:underline">
          {showForm ? '取消' : '+ 新增'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          <input placeholder="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm" />
          <input placeholder="MCP 服务 URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm" />
          <input placeholder="Authorization header（可选）" value={form.authHeader}
            onChange={e => setForm({ ...form, authHeader: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm" />
          <button onClick={handleAdd} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">保存</button>
        </div>
      )}
      <ul className="space-y-2">
        {mcpServices.map(svc => (
          <li key={svc.id} className="flex items-center gap-2">
            <input type="checkbox" checked={svc.enabled}
              onChange={e => toggleMCPService(svc.id, e.target.checked)} />
            <span className="flex-1 text-sm">{svc.name}</span>
            <span className="text-xs text-on-surface-tertiary truncate max-w-[120px]">{svc.url}</span>
            <button onClick={() => removeMCPService(svc.id)} className="text-xs text-red-500 hover:underline">删除</button>
          </li>
        ))}
        {mcpServices.length === 0 && <li className="text-sm text-on-surface-tertiary">暂无 MCP 服务</li>}
      </ul>
    </div>
  )
}

// Skill 管理面板
function SkillPanel() {
  const { skills, loadSkills, addSkill, toggleSkill, removeSkill } = useCodeReviewStore()
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', content: '' })

  useEffect(() => { loadSkills() }, [])

  const handleAdd = () => {
    if (!form.name || !form.content) return
    addSkill({ ...form, enabled: true })
    setForm({ name: '', description: '', content: '' })
    setShowForm(false)
  }

  return (
    <div className="border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">Skills</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-primary-500 hover:underline">
          {showForm ? '取消' : '+ 上传'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          <input placeholder="Skill 名称" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm" />
          <input placeholder="描述（可选）" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm" />
          <textarea placeholder="Skill 内容（prompt 文本）" value={form.content} rows={6}
            onChange={e => setForm({ ...form, content: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm font-mono" />
          <button onClick={handleAdd} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">保存</button>
        </div>
      )}
      <ul className="space-y-2">
        {skills.map(skill => (
          <li key={skill.id} className="flex items-start gap-2">
            <input type="checkbox" checked={skill.enabled}
              onChange={e => toggleSkill(skill.id, e.target.checked)} />
            <div className="flex-1">
              <span className="text-sm">{skill.name}</span>
              {skill.description && <span className="block text-xs text-on-surface-tertiary">{skill.description}</span>}
            </div>
            <button onClick={() => removeSkill(skill.id)} className="text-xs text-red-500 hover:underline">删除</button>
          </li>
        ))}
        {skills.length === 0 && <li className="text-sm text-on-surface-tertiary">暂无 Skill</li>}
      </ul>
    </div>
  )
}

// Streaming 输出区
function StreamOutput() {
  const { streamEvents, isReviewing } = useCodeReviewStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamEvents])

  return (
    <div className="border border-outline rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-auto bg-surface-secondary">
      {streamEvents.length === 0 && !isReviewing && (
        <span className="text-sm text-on-surface-tertiary">点击「开始评审」后，AI 输出将显示在这里...</span>
      )}
      {streamEvents.map((ev, i) => {
        if (ev.type === 'chunk') return <span key={i}>{ev.content}</span>
        if (ev.type === 'tool_call') return (
          <div key={i} className="mt-2 p-2 bg-accent-500/10 rounded text-xs font-mono">
            🔧 调用工具: {ev.toolName} | 参数: {JSON.stringify(ev.toolArgs)}
          </div>
        )
        if (ev.type === 'tool_result') return (
          <div key={i} className="mt-1 p-2 bg-outline rounded text-xs font-mono text-on-surface-tertiary">
            → 结果: {typeof ev.toolResult === 'string' ? ev.toolResult : JSON.stringify(ev.toolResult)}
          </div>
        )
        return null
      })}
      {isReviewing && streamEvents.length > 0 && <span className="animate-pulse">▌</span>}
      <div ref={bottomRef} />
    </div>
  )
}

// 问题列表
function IssueList() {
  const { reviewRecords, deleteReviewRecord, currentProjectId } = useCodeReviewStore()
  const [filter, setFilter] = React.useState<'all' | 'critical' | 'warning' | 'suggestion'>('all')

  useEffect(() => {
    if (currentProjectId) {
      useCodeReviewStore.getState().loadReviewRecords(currentProjectId)
    }
  }, [currentProjectId])

  const filtered = filter === 'all' ? reviewRecords : reviewRecords.filter(r => r.severity === filter)

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['all', 'critical', 'warning', 'suggestion'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filter === f
              ? f === 'critical' ? 'bg-red-500 text-white' : f === 'warning' ? 'bg-yellow-500 text-white' : f === 'suggestion' ? 'bg-blue-500 text-white' : 'bg-primary-500 text-white'
              : 'bg-surface-secondary text-on-surface-secondary'}`}>
            {f === 'all' ? '全部' : f === 'critical' ? '严重' : f === 'warning' ? '警告' : '建议'} ({f === 'all' ? reviewRecords.length : reviewRecords.filter(r => r.severity === f).length})
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(record => (
          <div key={record.id} className="border border-outline rounded-xl p-4">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${record.severity === 'critical' ? 'bg-red-500' : record.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{record.title}</div>
                <div className="text-xs text-on-surface-secondary mt-1">{record.description}</div>
                {record.filePath && (
                  <div className="text-xs font-mono text-on-surface-tertiary mt-1">{record.filePath}{record.lineRange ? `:${record.lineRange}` : ''}</div>
                )}
              </div>
              <button onClick={() => deleteReviewRecord(record.id)} className="text-xs text-red-500 hover:underline">删除</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-sm text-on-surface-tertiary">暂无问题记录</div>}
      </div>
    </div>
  )
}

export default function CodeReview() {
  const { projects } = useProjectStore()
  const { loadMCPServices, loadSkills } = useCodeReviewStore()
  const [selectedProjectId, setSelectedProjectId] = React.useState('')
  const [branch, setBranch] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [configOpen, setConfigOpen] = React.useState(true)

  useEffect(() => {
    loadMCPServices()
    loadSkills()
  }, [])

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const handleStartReview = () => {
    if (!selectedProjectId || !apiKey) return
    useCodeReviewStore.getState().startReview(
      selectedProjectId,
      selectedProject?.repository || '',
      selectedProject?.branch || branch,
      'https://api.anthropic.com/v1/messages',
      apiKey
    )
  }

  return (
    <div className="pl-64 min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">AI 代码评审</h1>
          <p className="text-sm text-on-surface-secondary mt-1">对项目代码仓库进行 AI 辅助评审，自动发现问题并记录</p>
        </div>

        {/* 配置面板 */}
        <div className="border-b border-outline pb-4">
          <button onClick={() => setConfigOpen(!configOpen)} className="flex items-center gap-2 text-sm font-medium mb-3">
            <Icon name="settings" size={20} />
            MCP & Skill 配置
            <Icon name={configOpen ? 'expand_less' : 'expand_more'} size={20} />
          </button>
          {configOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MCPPanel />
              <SkillPanel />
            </div>
          )}
        </div>

        {/* 评审操作区 */}
        <div className="border border-outline rounded-xl p-4 space-y-4">
          <h3 className="font-heading text-sm font-medium">评审设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-on-surface-secondary mb-1">选择项目</label>
              <select value={selectedProjectId} onChange={e => {
                setSelectedProjectId(e.target.value)
                const proj = projects.find(p => p.id === e.target.value)
                if (proj) setBranch(proj.branch)
              }}
                className="w-full px-3 py-2 border border-outline rounded-lg text-sm">
                <option value="">-- 选择项目 --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-secondary mb-1">分支</label>
              <input value={branch} onChange={e => setBranch(e.target.value)}
                className="w-full px-3 py-2 border border-outline rounded-lg text-sm" placeholder="分支名" />
            </div>
            <div>
              <label className="block text-xs text-on-surface-secondary mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-outline rounded-lg text-sm" placeholder="sk-ant-..." />
            </div>
          </div>
          <button onClick={handleStartReview} disabled={!selectedProjectId || !apiKey || useCodeReviewStore.getState().isReviewing}
            className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium text-sm disabled:opacity-50">
            {useCodeReviewStore.getState().isReviewing ? '评审中...' : '开始评审'}
          </button>
          {useCodeReviewStore.getState().reviewError && (
            <div className="text-sm text-red-500">{useCodeReviewStore.getState().reviewError}</div>
          )}
        </div>

        {/* Streaming 输出 */}
        <div>
          <h3 className="font-heading text-sm font-medium mb-3">评审输出</h3>
          <StreamOutput />
        </div>

        {/* 问题列表 */}
        <div>
          <h3 className="font-heading text-sm font-medium mb-3">问题记录</h3>
          <IssueList />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CodeReview.tsx
git commit -m "feat(code-review): add CodeReview page with MCP config, streaming, and issue list"
```

---

## Task 9: 全局自检

- [ ] **Step 1: 运行 `npm run electron:dev` 验证启动无报错**

- [ ] **Step 2: 确认 Sidebar 导航、页面路由正常**

- [ ] **Step 3: 检查所有新文件已 commit**

---

## Spec Coverage 检查

| Spec 章节 | 实现位置 |
|---------|---------|
| 三张新表（code_reviews, mcp_services, skills） | Task 2 (`src/db/index.ts`) |
| DAO CRUD | Task 3 (`src/db/codeReviewDao.ts`) |
| Electron IPC + MCP 调用 | Task 4 (`electron/main.ts`, `preload.ts`) |
| MCP 配置面板 | Task 8 (`CodeReview.tsx` → `MCPPanel`) |
| Skill 管理面板 | Task 8 (`CodeReview.tsx` → `SkillPanel`) |
| 项目选择 + 评审触发 | Task 8 (`CodeReview.tsx` → `handleStartReview`) |
| LLM Streaming | Task 5 (`codeReviewStore.ts` → `startReview`) |
| AI tool_calls + MCP 工具执行 | Task 5 (`startReview` 内嵌在循环) |
| JSON 解析 + 入库 | Task 5 (`startReview` 内嵌在 `done` 后) |
| 问题列表 + severity 过滤 | Task 8 (`CodeReview.tsx` → `IssueList`) |
| 路由 + 侧边栏入口 | Task 7 (`App.tsx`, `Sidebar.tsx`) |
| `code` 图标 | Task 6 (`Icon.tsx`) |

---

## 执行方式

**选择一：Subagent-Driven（推荐）** — 我 dispatch fresh subagent per task，两阶段 review  
**选择二：Inline Execution** — 本 session 内 batch 执行，带 checkpoint review

哪个方式？