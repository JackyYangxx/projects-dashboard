# Project MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose project CRUD as an MCP server so external AI agents (Claude Code etc.) can query and manage projects via the MCP protocol over stdio.

**Architecture:** Independent Node.js process using `better-sqlite3` (native SQLite binding) to read/write the same `.db` file the Electron app uses. WAL mode ensures both processes can access the database concurrently. MCP protocol via `@modelcontextprotocol/sdk` with stdio transport.

**Tech Stack:** TypeScript, better-sqlite3, @modelcontextprotocol/sdk, tsx (dev runner)

---

## File Structure

```
cli/
├── tsconfig.json        # Node.js target, no DOM
├── types.ts             # Project + related types (mirror of src/types)
├── db.ts                # DB connection, path detection, WAL mode
├── dao/projectDao.ts    # CRUD operations, aligned with src/db/projectDao.ts
├── tools/projects.ts    # MCP tool handler implementations
└── server.ts            # MCP server entry, stdio transport, tool registration
```

Each file has one clear responsibility. `types.ts` defines data shapes, `db.ts` manages the connection, `dao/projectDao.ts` handles data access, `tools/projects.ts` maps MCP tool calls to DAO calls, and `server.ts` wires everything together.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install better-sqlite3 and MCP SDK**

```bash
npm install better-sqlite3 @modelcontextprotocol/sdk
```

Expected: packages added to `package.json` dependencies.

- [ ] **Step 2: Install tsx as dev dependency for running CLI in development**

```bash
npm install -D tsx
```

Expected: `tsx` added to `devDependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add better-sqlite3, MCP SDK, and tsx dependencies"
```

---

### Task 2: Create cli/tsconfig.json

**Files:**
- Create: `cli/tsconfig.json`

- [ ] **Step 1: Write tsconfig for CLI**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "../cli-dist",
    "rootDir": ".",
    "esModuleInterop": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["**/__tests__/**", "**/*.test.ts"]
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/tsconfig.json
git commit -m "chore: add tsconfig for CLI"
```

---

### Task 3: Create cli/types.ts

**Files:**
- Create: `cli/types.ts`

- [ ] **Step 1: Write shared types (mirror Project and related types from src/types/index.ts)**

```typescript
export interface SubProgress {
  architecture: number
  uiux: number
  engineering: number
  qa: number
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
}

export interface ScopeItem {
  icon: string
  title: string
  description: string
  color: 'primary' | 'secondary' | 'tertiary' | 'outline'
}

export interface NoteHistory {
  id: string
  content: string
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  date: string
  status: 'pending' | 'completed' | 'delayed'
  description?: string
}

export interface Repository {
  id: string
  code?: string
  projectId?: string
  url: string
  branch: string
  note?: string
}

export interface TimelineEvent {
  date: string
  version: string
  title: string
  items: string[]
  isActive: boolean
  isCompleted: boolean
}

export interface Project {
  id: string
  projectId: string
  name: string
  productLine: string
  status: 'ongoing' | 'completed' | 'paused'
  tags: string[]
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
  ext1: string
  ext2: string
  ext3: string
  ext4: string
  ext5: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/types.ts
git commit -m "feat(cli): add shared types for Project and related entities"
```

---

### Task 4: Create cli/db.ts — database connection

**Files:**
- Create: `cli/db.ts`

- [ ] **Step 1: Write database connection with path detection, WAL mode, and schema verification**

```typescript
import Database from 'better-sqlite3'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

let db: Database.Database | null = null

function getDefaultDbPath(): string {
  const appName = 'project-dashboard'
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName, 'projects-dashboard.db')
    case 'win32':
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName, 'projects-dashboard.db')
    default:
      return path.join(os.homedir(), '.config', appName, 'projects-dashboard.db')
  }
}

export function getDbPath(): string {
  return process.env.PROJECTS_DB_PATH || getDefaultDbPath()
}

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()

  if (!fs.existsSync(dbPath)) {
    throw new Error(`数据库未初始化，请先启动应用。\n预期路径: ${dbPath}`)
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get()
  if (!tableCheck) {
    db.close()
    db = null
    throw new Error(`数据库未初始化，请先启动应用。\n数据库文件存在但缺少 projects 表: ${dbPath}`)
  }

  return db
}

export function getDatabase(): Database.Database {
  if (!db) return initDatabase()
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
```

- [ ] **Step 2: Type-check the file**

```bash
npx tsc --noEmit -p cli/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/db.ts
git commit -m "feat(cli): add database connection with path detection and WAL mode"
```

---

### Task 5: Create cli/dao/projectDao.ts — CRUD operations

**Files:**
- Create: `cli/dao/projectDao.ts`

- [ ] **Step 1: Write project DAO with findAll, findById, findByName, create, update, remove**

```typescript
import { randomUUID } from 'node:crypto'
import { getDatabase } from '../db'
import type { Project, Repository, TeamMember } from '../types'

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

function parseTags(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string')
    } catch {
      return [value.trim()]
    }
  }
  return []
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    productLine: row.product_line as string,
    status: row.status as Project['status'],
    tags: parseTags(row.tag),
    totalAmount: row.total_amount as number,
    usedAmount: row.used_amount as number,
    progress: row.progress as number,
    subProgress: parseJsonField(row.sub_progress, { architecture: 0, uiux: 0, engineering: 0, qa: 0 }),
    notes: (row.notes as string) || '',
    noteHistory: parseJsonField(row.note_history, []),
    team: parseJsonField<TeamMember[]>(row.team, []),
    scope: parseJsonField(row.scope, []),
    milestones: parseJsonField(row.milestones, []),
    timeline: parseJsonField(row.timeline, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    leader: (row.leader as string) || '',
    repositories: parseJsonField<Repository[]>(row.repositories, []),
    projectId: (row.project_id as string) || '',
    ext1: (row.ext1 as string) || '',
    ext2: (row.ext2 as string) || '',
    ext3: (row.ext3 as string) || '',
    ext4: (row.ext4 as string) || '',
    ext5: (row.ext5 as string) || '',
  }
}

export interface ListFilters {
  status?: string
  productLine?: string
  search?: string
}

export function findAll(filters?: ListFilters): Project[] {
  const db = getDatabase()

  let sql = 'SELECT * FROM projects'
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters?.productLine) {
    conditions.push('product_line = ?')
    params.push(filters.productLine)
  }
  if (filters?.search) {
    conditions.push('name LIKE ?')
    params.push(`%${filters.search}%`)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY created_at DESC'

  const stmt = db.prepare(sql)
  const rows = stmt.all(...params)
  return rows.map(row => rowToProject(row as Record<string, unknown>))
}

export function findById(id: string): Project | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  const row = stmt.get(id) as Record<string, unknown> | undefined
  return row ? rowToProject(row) : undefined
}

export function findByName(name: string): Project | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects WHERE name = ?')
  const row = stmt.get(name) as Record<string, unknown> | undefined
  return row ? rowToProject(row) : undefined
}

function generateAvatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
}

export interface CreateProjectInput {
  name: string
  productLine: string
  leader: string
  status?: string
  progress?: number
  totalAmount?: number
  usedAmount?: number
  tags?: string[]
  projectId?: string
  repositories?: Repository[]
  notes?: string
}

export function create(input: CreateProjectInput): Project {
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  const status = input.status || 'paused'
  const progress = input.progress ?? 0
  const totalAmount = input.totalAmount ?? 0
  const usedAmount = input.usedAmount ?? 0
  const tags = input.tags || []
  const projectId = input.projectId || ''
  const repositories = input.repositories || []
  const notes = input.notes || ''

  const team: TeamMember[] = [{
    id: randomUUID(),
    name: input.leader,
    role: '负责人',
    avatar: generateAvatarUrl(input.leader),
  }]

  db.prepare(`
    INSERT INTO projects (
      id, name, product_line, status, tag, total_amount, used_amount,
      progress, sub_progress, notes, note_history, team, scope, milestones,
      timeline, leader, repositories, project_id, ext1, ext2, ext3, ext4, ext5,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.name, input.productLine, status, JSON.stringify(tags),
    totalAmount, usedAmount, progress,
    JSON.stringify({ architecture: 0, uiux: 0, engineering: 0, qa: 0 }),
    notes, JSON.stringify([]), JSON.stringify(team), JSON.stringify([]),
    JSON.stringify([]), JSON.stringify([]), input.leader,
    JSON.stringify(repositories), projectId, '', '', '', '', '', now, now
  )

  return findById(id)!
}

export function update(id: string, updates: Partial<Project>): Project {
  const db = getDatabase()
  const existing = findById(id)
  if (!existing) throw new Error('项目不存在')

  const setClauses: string[] = []
  const values: unknown[] = []

  const fieldMap: Array<[string | undefined, string, (v: unknown) => unknown]> = [
    [updates.name, 'name', v => v],
    [updates.productLine, 'product_line', v => v],
    [updates.status, 'status', v => v],
    [updates.tags !== undefined ? JSON.stringify(updates.tags) : undefined, 'tag', v => v],
    [updates.totalAmount, 'total_amount', v => v],
    [updates.usedAmount, 'used_amount', v => v],
    [updates.progress, 'progress', v => v],
    [updates.subProgress !== undefined ? JSON.stringify(updates.subProgress) : undefined, 'sub_progress', v => v],
    [updates.notes !== undefined ? updates.notes : undefined, 'notes', v => v],
    [updates.noteHistory !== undefined ? JSON.stringify(updates.noteHistory) : undefined, 'note_history', v => v],
    [updates.team !== undefined ? JSON.stringify(updates.team) : undefined, 'team', v => v],
    [updates.scope !== undefined ? JSON.stringify(updates.scope) : undefined, 'scope', v => v],
    [updates.milestones !== undefined ? JSON.stringify(updates.milestones) : undefined, 'milestones', v => v],
    [updates.timeline !== undefined ? JSON.stringify(updates.timeline) : undefined, 'timeline', v => v],
    [updates.leader, 'leader', v => v],
    [updates.repositories !== undefined ? JSON.stringify(updates.repositories) : undefined, 'repositories', v => v],
    [updates.projectId, 'project_id', v => v],
    [updates.ext1, 'ext1', v => v],
    [updates.ext2, 'ext2', v => v],
    [updates.ext3, 'ext3', v => v],
    [updates.ext4, 'ext4', v => v],
    [updates.ext5, 'ext5', v => v],
  ]

  for (const [value, column, transform] of fieldMap) {
    if (value !== undefined) {
      setClauses.push(`${column} = ?`)
      values.push(transform(value))
    }
  }

  setClauses.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)

  return findById(id)!
}

export function remove(id: string): void {
  const db = getDatabase()
  const existing = findById(id)
  if (!existing) throw new Error('项目不存在')
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}
```

- [ ] **Step 2: Type-check the file**

```bash
npx tsc --noEmit -p cli/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/dao/projectDao.ts
git commit -m "feat(cli): add project DAO with CRUD operations"
```

---

### Task 6: Create cli/tools/projects.ts — MCP tool handlers

**Files:**
- Create: `cli/tools/projects.ts`

- [ ] **Step 1: Write MCP tool handlers for the 5 project tools**

```typescript
import { findAll, findById, findByName, create, update, remove } from '../dao/projectDao'
import type { CreateProjectInput } from '../dao/projectDao'

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

function ok(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

function err(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}

export async function handleList(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const projects = findAll({
      status: args.status as string | undefined,
      productLine: args.productLine as string | undefined,
      search: args.search as string | undefined,
    })
    return ok(projects)
  } catch (e) {
    return err(e instanceof Error ? e.message : '查询项目列表失败')
  }
}

export async function handleGet(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    let project: ReturnType<typeof findById>
    if (args.id) {
      project = findById(args.id as string)
    } else if (args.name) {
      project = findByName(args.name as string)
    } else {
      return err('请提供 id 或 name 参数')
    }
    if (!project) return err('项目不存在')
    return ok(project)
  } catch (e) {
    return err(e instanceof Error ? e.message : '查询项目失败')
  }
}

export async function handleCreate(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const missing: string[] = []
    if (!args.name) missing.push('name')
    if (!args.productLine) missing.push('productLine')
    if (!args.leader) missing.push('leader')
    if (missing.length > 0) {
      return err(`缺少必填字段: ${missing.join(', ')}`)
    }

    const input: CreateProjectInput = {
      name: args.name as string,
      productLine: args.productLine as string,
      leader: args.leader as string,
      status: args.status as string | undefined,
      progress: args.progress as number | undefined,
      totalAmount: args.totalAmount as number | undefined,
      usedAmount: args.usedAmount as number | undefined,
      tags: args.tags as string[] | undefined,
      projectId: args.projectId as string | undefined,
      repositories: args.repositories as CreateProjectInput['repositories'],
      notes: args.notes as string | undefined,
    }

    const project = create(input)
    return ok(project)
  } catch (e) {
    return err(e instanceof Error ? e.message : '创建项目失败')
  }
}

export async function handleUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    if (!args.id) return err('缺少 id 参数')

    const { id, ...updates } = args
    const project = update(id as string, updates as Record<string, unknown>)
    return ok(project)
  } catch (e) {
    return err(e instanceof Error ? e.message : '更新项目失败')
  }
}

export async function handleDelete(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    if (!args.id) return err('缺少 id 参数')
    remove(args.id as string)
    return ok({ success: true })
  } catch (e) {
    return err(e instanceof Error ? e.message : '删除项目失败')
  }
}
```

- [ ] **Step 2: Type-check the file**

```bash
npx tsc --noEmit -p cli/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/tools/projects.ts
git commit -m "feat(cli): add MCP tool handlers for project CRUD"
```

---

### Task 7: Create cli/server.ts — MCP server entry point

**Files:**
- Create: `cli/server.ts`

- [ ] **Step 1: Write MCP server with stdio transport and tool registration**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types'
import { handleList, handleGet, handleCreate, handleUpdate, handleDelete } from './tools/projects'
import { closeDatabase } from './db'

const server = new Server(
  {
    name: 'projects-dashboard',
    version: '1.0.33',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'projects:list',
      description: '查询项目列表。可按状态、产品线过滤，或按名称搜索。',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ongoing', 'completed', 'paused'], description: '按状态过滤' },
          productLine: { type: 'string', description: '按产品线过滤' },
          search: { type: 'string', description: '按项目名称模糊搜索' },
        },
      },
    },
    {
      name: 'projects:get',
      description: '获取单个项目。通过 id 或 name 查找，id 优先。',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '项目 ID' },
          name: { type: 'string', description: '项目名称' },
        },
      },
    },
    {
      name: 'projects:create',
      description: '创建新项目。自动从 leader 生成默认 team[0]。',
      inputSchema: {
        type: 'object',
        required: ['name', 'productLine', 'leader'],
        properties: {
          name: { type: 'string', description: '项目名称' },
          productLine: { type: 'string', description: '产品线' },
          leader: { type: 'string', description: '开发负责人' },
          status: { type: 'string', enum: ['ongoing', 'completed', 'paused'], description: '项目状态，默认 paused' },
          progress: { type: 'number', description: '整体进度 0-100，默认 0' },
          totalAmount: { type: 'number', description: '总预算' },
          usedAmount: { type: 'number', description: '已用预算' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          projectId: { type: 'string', description: '自定义项目编号' },
          repositories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                branch: { type: 'string' },
                note: { type: 'string' },
              },
            },
            description: '代码仓库列表',
          },
          notes: { type: 'string', description: '备注' },
        },
      },
    },
    {
      name: 'projects:update',
      description: '更新项目。只需传 id 和要更新的字段。',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: '项目 ID' },
          name: { type: 'string', description: '项目名称' },
          productLine: { type: 'string', description: '产品线' },
          leader: { type: 'string', description: '开发负责人' },
          status: { type: 'string', enum: ['ongoing', 'completed', 'paused'], description: '项目状态' },
          progress: { type: 'number', description: '整体进度 0-100' },
          totalAmount: { type: 'number', description: '总预算' },
          usedAmount: { type: 'number', description: '已用预算' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          notes: { type: 'string', description: '备注' },
        },
      },
    },
    {
      name: 'projects:delete',
      description: '删除项目。',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: '项目 ID' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'projects:list':   return handleList(args || {})
    case 'projects:get':    return handleGet(args || {})
    case 'projects:create': return handleCreate(args || {})
    case 'projects:update': return handleUpdate(args || {})
    case 'projects:delete': return handleDelete(args || {})
    default:
      return { content: [{ type: 'text' as const, text: `未知工具: ${name}` }], isError: true }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[MCP] projects-dashboard server started')
}

process.on('exit', () => closeDatabase())
process.on('SIGINT', () => { closeDatabase(); process.exit(0) })
process.on('SIGTERM', () => { closeDatabase(); process.exit(0) })

main().catch((e) => {
  console.error('[MCP] Failed to start server:', e)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check the file**

```bash
npx tsc --noEmit -p cli/tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/server.ts
git commit -m "feat(cli): add MCP server entry with stdio transport"
```

---

### Task 8: Add npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add CLI scripts to package.json**

Edit `package.json` — add these scripts:

```json
"cli:dev": "npx tsx cli/server.ts",
"cli:build": "npx tsc -p cli/tsconfig.json",
"cli:start": "node cli-dist/server.js"
```

Add them alongside the existing `"test:watch"` line:

```diff
     "test:watch": "vitest",
+    "cli:dev": "npx tsx cli/server.ts",
+    "cli:build": "npx tsc -p cli/tsconfig.json",
+    "cli:start": "node cli-dist/server.js",
     "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
```

- [ ] **Step 2: Verify CLI starts (will fail on DB not found — expected)**

```bash
npm run cli:dev
```

Expected: stderr shows `数据库未初始化，请先启动应用。` — this confirms the server boots and detects missing DB.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(cli): add npm scripts for CLI dev/build/start"
```

---

### Task 9: Write tests

**Files:**
- Create: `cli/__tests__/projectDao.test.ts`
- Create: `cli/__tests__/test-setup.ts`

- [ ] **Step 1: Write test setup — creates an in-memory database with the projects schema**

```typescript
// cli/__tests__/test-setup.ts
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

// Override PROJECTS_DB_PATH to use a temp file before each test.
// We must do this BEFORE importing db.ts, so the test file handles it.

const SCHEMA_SQL = fs.readFileSync(
  path.join(__dirname, '../../src/db/index.ts'),
  'utf-8'
)

// Extract CREATE TABLE statements from initDatabase() — we replicate the projects
// table here so tests are self-contained without depending on Electron's full init.

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT '',
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
      leader TEXT DEFAULT '',
      repositories TEXT DEFAULT '[]',
      ext1 TEXT DEFAULT '',
      ext2 TEXT DEFAULT '',
      ext3 TEXT DEFAULT '',
      ext4 TEXT DEFAULT '',
      ext5 TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    )
  `)
  return db
}
```

- [ ] **Step 2: Write projectDao tests**

```typescript
// cli/__tests__/projectDao.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDb } from './test-setup'

// We mock the db module to return our test database
import { vi } from 'vitest'

let testDb: Database.Database

vi.mock('../db', () => ({
  getDatabase: () => testDb,
  initDatabase: () => testDb,
  getDbPath: () => ':memory:',
  closeDatabase: () => {},
}))

import { findAll, findById, findByName, create, update, remove } from '../dao/projectDao'

beforeAll(() => {
  testDb = createTestDb()
})

afterAll(() => {
  testDb.close()
})

describe('findAll', () => {
  it('returns empty array when no projects exist', () => {
    const projects = findAll()
    expect(projects).toEqual([])
  })

  it('returns all projects sorted by created_at DESC', () => {
    create({ name: 'Project A', productLine: 'Line 1', leader: 'Alice', status: 'ongoing' })
    create({ name: 'Project B', productLine: 'Line 2', leader: 'Bob', status: 'paused' })

    const projects = findAll()
    expect(projects).toHaveLength(2)
    expect(projects[0].name).toBe('Project B') // newer first
  })

  it('filters by status', () => {
    const projects = findAll({ status: 'ongoing' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Project A')
  })

  it('filters by productLine', () => {
    const projects = findAll({ productLine: 'Line 2' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Project B')
  })

  it('searches by name', () => {
    const projects = findAll({ search: 'A' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Project A')
  })
})

describe('findById', () => {
  it('returns project by id', () => {
    const created = create({ name: 'Test', productLine: 'Line', leader: 'Alice' })
    const found = findById(created.id)
    expect(found).not.toBeUndefined()
    expect(found!.name).toBe('Test')
  })

  it('returns undefined for non-existent id', () => {
    expect(findById('nonexistent')).toBeUndefined()
  })
})

describe('findByName', () => {
  it('returns project by exact name', () => {
    const created = create({ name: 'UniqueName', productLine: 'Line', leader: 'Alice' })
    const found = findByName('UniqueName')
    expect(found).not.toBeUndefined()
    expect(found!.id).toBe(created.id)
  })

  it('returns undefined for non-existent name', () => {
    expect(findByName('NoSuchProject')).toBeUndefined()
  })
})

describe('create', () => {
  it('creates project with required fields and defaults', () => {
    const project = create({ name: 'New', productLine: 'P1', leader: 'Jack' })
    expect(project.id).toBeTruthy()
    expect(project.status).toBe('paused')
    expect(project.progress).toBe(0)
    expect(project.totalAmount).toBe(0)
    expect(project.usedAmount).toBe(0)
    expect(project.tags).toEqual([])
    expect(project.team).toHaveLength(1)
    expect(project.team[0].name).toBe('Jack')
    expect(project.team[0].role).toBe('负责人')
  })

  it('creates project with all optional fields', () => {
    const project = create({
      name: 'Full',
      productLine: 'P2',
      leader: 'Jane',
      status: 'ongoing',
      progress: 50,
      totalAmount: 100000,
      usedAmount: 30000,
      tags: ['urgent'],
      projectId: 'PROJ-001',
      repositories: [{ id: '1', url: 'https://git.example.com/repo', branch: 'main' }],
      notes: 'test notes',
    })
    expect(project.status).toBe('ongoing')
    expect(project.progress).toBe(50)
    expect(project.totalAmount).toBe(100000)
    expect(project.usedAmount).toBe(30000)
    expect(project.tags).toEqual(['urgent'])
    expect(project.projectId).toBe('PROJ-001')
    expect(project.repositories).toHaveLength(1)
    expect(project.notes).toBe('test notes')
  })
})

describe('update', () => {
  it('updates specified fields only', () => {
    const project = create({ name: 'Before', productLine: 'P', leader: 'Jack' })
    const updated = update(project.id, { name: 'After', progress: 75 })
    expect(updated.name).toBe('After')
    expect(updated.progress).toBe(75)
    expect(updated.productLine).toBe('P') // unchanged
  })

  it('throws on non-existent id', () => {
    expect(() => update('nonexistent', { name: 'X' })).toThrow('项目不存在')
  })
})

describe('remove', () => {
  it('deletes project by id', () => {
    const project = create({ name: 'ToDelete', productLine: 'P', leader: 'Jack' })
    remove(project.id)
    expect(findById(project.id)).toBeUndefined()
  })

  it('throws on non-existent id', () => {
    expect(() => remove('nonexistent')).toThrow('项目不存在')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run cli/__tests__/projectDao.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add cli/__tests__/test-setup.ts cli/__tests__/projectDao.test.ts
git commit -m "test(cli): add project DAO tests"
```

---

### Task 10: End-to-end verification with Electron app

**Files:**
- None (manual verification)

- [ ] **Step 1: Start the Electron app to ensure DB exists**

```bash
npm run electron:dev
```

Expected: Electron app opens. Confirm there are projects in the dashboard. Close the app.

- [ ] **Step 2: Verify DB file exists**

```bash
ls -la ~/Library/Application\ Support/project-dashboard/projects-dashboard.db
```

Expected: file exists with non-zero size.

- [ ] **Step 3: Test CLI list command via stdin**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"projects:list","arguments":{}}}' | npx tsx cli/server.ts 2>/dev/null
```

Expected: JSON-RPC response with project list.

- [ ] **Step 4: Test CLI create command**

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"projects:create","arguments":{"name":"CLI测试项目","productLine":"测试","leader":"测试人"}}}' | npx tsx cli/server.ts 2>/dev/null
```

Expected: JSON-RPC response with the created project.

- [ ] **Step 5: Test tools/list**

```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}' | npx tsx cli/server.ts 2>/dev/null
```

Expected: JSON-RPC response with 5 tools listed.

- [ ] **Step 6: Verify in Electron app**

Re-open the Electron app. Confirm the CLI-created project appears. Edit a project in the Electron app, then re-query via CLI to confirm changes are visible.

- [ ] **Step 7: Commit verification notes**

```bash
git add -A
git commit -m "docs(cli): add E2E verification notes"
```

---

### Task 11: Configure MCP in Claude Code settings

**Files:**
- None (user config)

- [ ] **Step 1: Add MCP server to Claude Code config**

Add to `~/.claude/settings.json` or `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "projects-dashboard": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/cli/server.ts"]
    }
  }
}
```

- [ ] **Step 2: Restart Claude Code and verify tools appear**

Ask Claude Code: "list the available tools from projects-dashboard"

Expected: 5 tools listed (projects:list, projects:get, projects:create, projects:update, projects:delete).

---

## Spec Coverage Self-Review

| Spec Requirement | Covered By |
|-----------------|------------|
| MCP Server via stdio | Task 7 (server.ts) |
| better-sqlite3 + WAL mode | Task 4 (db.ts) |
| Shared DB with Electron | Task 4 (path detection) |
| DB path auto-detect + env override | Task 4 (getDbPath) |
| projects:list with filters | Task 5 (findAll), Task 6 (handleList) |
| projects:get by id or name | Task 5 (findById/findByName), Task 6 (handleGet) |
| projects:create with defaults | Task 5 (create), Task 6 (handleCreate) |
| projects:update partial | Task 5 (update), Task 6 (handleUpdate) |
| projects:delete | Task 5 (remove), Task 6 (handleDelete) |
| Auto-generate team[0] from leader | Task 5 (create) |
| Error: DB not initialized | Task 4 (initDatabase) |
| Error: 必填字段缺失 | Task 6 (handleCreate) |
| Error: 项目不存在 | Task 5 (findById), Task 6 (handleGet) |
| JSON field serialization | Task 5 (parseJsonField, parseTags) |
| npm scripts for CLI | Task 8 |
| Tests | Task 9 |

All spec requirements are covered. No TBDs or placeholders.
