# Precision Curator 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Electron + React 的离线项目管理控制台，支持项目 CRUD、进度跟踪、预算管理和团队协作。

**Architecture:** 单窗口 SPA 应用，使用 React Router 做页面路由，Zustand 管理全局状态，sql.js (SQLite) 实现本地离线数据持久化。Electron 主进程负责窗口管理，预加载脚本暴露安全的数据库 API 给渲染进程。

**Tech Stack:** Electron + React 18 + TypeScript + Vite + Tailwind CSS + React Router v6 + Zustand + sql.js

---

## 文件结构

```
precision-curator/
├── electron/
│   ├── main.ts              # Electron 主进程
│   └── preload.ts           # 预加载脚本
├── src/
│   ├── components/          # 公共组件
│   │   ├── Sidebar.tsx      # 侧边栏导航
│   │   ├── Header.tsx       # 顶部栏
│   │   ├── StatsCard.tsx    # 统计卡片
│   │   ├── ProjectTable.tsx # 项目表格
│   │   ├── ProgressSlider.tsx  # 进度滑块
│   │   ├── RichTextEditor.tsx  # 富文本编辑器
│   │   └── Timeline.tsx     # 时间线
│   ├── pages/
│   │   ├── Dashboard.tsx    # 项目仪表盘
│   │   └── ProjectDetail.tsx # 项目详情
│   ├── store/
│   │   └── projectStore.ts   # Zustand store
│   ├── db/
│   │   ├── index.ts         # 数据库初始化
│   │   └── projectDao.ts    # 项目数据访问
│   ├── types/
│   │   └── index.ts         # TypeScript 类型
│   ├── data/
│   │   └── seedData.ts      # 预置数据
│   ├── styles/
│   │   └── globals.css      # 全局样式
│   ├── App.tsx              # 路由配置
│   └── main.tsx             # React 入口
├── public/
│   └── sql-wasm.wasm         # SQLite WASM 文件
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── electron-builder.json
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `tailwind.config.js`
- Create: `electron-builder.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "precision-curator",
  "version": "1.0.0",
  "description": "项目管理控制台",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "electron:dev": "concurrently \"vite\" \"electron .\"",
    "electron:build": "vite build && electron-builder"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "sql.js": "^1.10.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "concurrently": "^8.2.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.0",
    "vite": "^5.1.0",
    "vite-plugin-electron": "^0.28.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "electron"]
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      { entry: 'electron/main.ts' },
      { entry: 'electron/preload.ts' }
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Precision Curator - 管理控制台</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 6: 创建 tailwind.config.js（直接复用设计稿配置）**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-surface": "#191c1d",
        "surface-bright": "#f8f9fa",
        "on-secondary-fixed-variant": "#005320",
        "tertiary-fixed-dim": "#fbbc06",
        "primary-fixed": "#d8e2ff",
        "secondary-container": "#86f898",
        "surface-container": "#edeeef",
        "inverse-primary": "#adc7ff",
        "inverse-surface": "#2e3132",
        "primary-fixed-dim": "#adc7ff",
        "on-tertiary-container": "#ffffff",
        "surface-variant": "#e1e3e4",
        "on-error-container": "#93000a",
        "secondary-fixed-dim": "#6ddd81",
        "background": "#f8f9fa",
        "secondary": "#006e2c",
        "surface-container-lowest": "#ffffff",
        "on-secondary": "#ffffff",
        "on-tertiary-fixed": "#261a00",
        "on-background": "#191c1d",
        "on-tertiary-fixed-variant": "#5c4300",
        "surface-dim": "#d9dadb",
        "on-error": "#ffffff",
        "error": "#ba1a1a",
        "on-primary-container": "#ffffff",
        "surface-container-highest": "#e1e3e4",
        "on-primary": "#ffffff",
        "inverse-on-surface": "#f0f1f2",
        "error-container": "#ffdad6",
        "primary-container": "#1a73e8",
        "outline": "#727785",
        "surface": "#f8f9fa",
        "tertiary": "#795900",
        "on-secondary-fixed": "#002108",
        "secondary-fixed": "#89fa9b",
        "surface-container-high": "#e7e8e9",
        "on-primary-fixed-variant": "#004493",
        "tertiary-container": "#987000",
        "surface-container-low": "#f3f4f5",
        "on-primary-fixed": "#001a41",
        "tertiary-fixed": "#ffdea0",
        "on-tertiary": "#ffffff",
        "on-surface-variant": "#414754",
        "on-secondary-container": "#00722f",
        "outline-variant": "#c1c6d6",
        "primary": "#005bbf",
        "surface-tint": "#005bc0"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      fontFamily: {
        headline: ["Manrope", "Inter", "system-ui"],
        body: ["Inter", "system-ui"],
        label: ["Inter", "system-ui"]
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 7: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: 创建 electron-builder.json**

```json
{
  "appId": "com.precision-curator.app",
  "productName": "Precision Curator",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "mac": {
    "target": ["dmg"],
    "category": "public.app-category.productivity"
  },
  "win": {
    "target": ["nsis"]
  }
}
```

- [ ] **Step 9: 初始化项目**

```bash
npm install
```

**验收标准：**
- 项目目录结构正确创建
- `npm install` 成功，无报错
- `npx vite --version` 显示 Vite 版本

---

## Task 2: Electron 主进程

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV !== 'production'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

- [ ] **Step 2: 创建 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
})

console.log('Preload script loaded')
```

- [ ] **Step 3: 验证 Electron 启动**

```bash
npm run dev
```

**验收标准：**
- Electron 窗口正常打开
- 窗口显示 Vite 开发服务器内容
- 控制台无报错

---

## Task 3: 类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
export interface SubProgress {
  architecture: number  // 底层架构 0-100
  uiux: number          // UI/UX 设计 0-100
  engineering: number    // 工程开发 0-100
  qa: number           // 质量审计 0-100
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
  name: string
  productLine: string
  status: 'ongoing' | 'completed' | 'paused'
  tag: string
  totalAmount: number
  usedAmount: number
  progress: number
  subProgress: SubProgress
  notes: string
  team: TeamMember[]
  scope: ScopeItem[]
  timeline: TimelineEvent[]
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'ongoing' | 'completed' | 'paused'

export interface CreateProjectInput {
  name: string
  productLine: string
  status: ProjectStatus
  tag: string
  totalAmount: number
  usedAmount: number
  progress: number
  subProgress: SubProgress
  notes: string
  team: TeamMember[]
  scope: ScopeItem[]
  timeline: TimelineEvent[]
}
```

**验收标准：**
- TypeScript 编译无错误
- 所有接口定义清晰完整

---

## Task 4: 数据库层

**Files:**
- Create: `src/db/index.ts`
- Create: `src/db/projectDao.ts`
- Modify: `electron/preload.ts`（添加数据库 API 暴露）

- [ ] **Step 1: 创建 src/db/index.ts（数据库初始化）**

```typescript
import initSqlJs, { Database } from 'sql.js'

let db: Database | null = null

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: (file: string) => `/sql-wasm.wasm`
  })

  db = new SQL.Database()

  db.run(`
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
      team TEXT DEFAULT '[]',
      scope TEXT DEFAULT '[]',
      timeline TEXT DEFAULT '[]',
      created_at TEXT,
      updated_at TEXT
    )
  `)

  return db
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.')
  }
  return db
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
```

- [ ] **Step 2: 创建 src/db/projectDao.ts**

```typescript
import { getDatabase } from './index'
import { Project, CreateProjectInput } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function rowToProject(row: any[]): Project {
  return {
    id: row[0],
    name: row[1],
    productLine: row[2],
    status: row[3] as Project['status'],
    tag: row[4],
    totalAmount: row[5],
    usedAmount: row[6],
    progress: row[7],
    subProgress: JSON.parse(row[8]),
    notes: row[9],
    team: JSON.parse(row[10]),
    scope: JSON.parse(row[11]),
    timeline: JSON.parse(row[12]),
    createdAt: row[13],
    updatedAt: row[14]
  }
}

export function getAllProjects(): Project[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC')
  const projects: Project[] = []

  while (stmt.step()) {
    projects.push(rowToProject(stmt.get()))
  }
  stmt.free()

  return projects
}

export function getProjectById(id: string): Project | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  stmt.bind([id])

  if (stmt.step()) {
    const project = rowToProject(stmt.get())
    stmt.free()
    return project
  }

  stmt.free()
  return null
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDatabase()
  const id = uuidv4()
  const now = new Date().toISOString()

  db.run(
    `INSERT INTO projects (
      id, name, product_line, status, tag, total_amount, used_amount,
      progress, sub_progress, notes, team, scope, timeline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.productLine,
      input.status,
      input.tag,
      input.totalAmount,
      input.usedAmount,
      input.progress,
      JSON.stringify(input.subProgress),
      input.notes,
      JSON.stringify(input.team),
      JSON.stringify(input.scope),
      JSON.stringify(input.timeline),
      now,
      now
    ]
  )

  return {
    id,
    ...input,
    createdAt: now,
    updatedAt: now
  }
}

export function updateProject(id: string, updates: Partial<Project>): void {
  const db = getDatabase()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.productLine !== undefined) {
    fields.push('product_line = ?')
    values.push(updates.productLine)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.tag !== undefined) {
    fields.push('tag = ?')
    values.push(updates.tag)
  }
  if (updates.totalAmount !== undefined) {
    fields.push('total_amount = ?')
    values.push(updates.totalAmount)
  }
  if (updates.usedAmount !== undefined) {
    fields.push('used_amount = ?')
    values.push(updates.usedAmount)
  }
  if (updates.progress !== undefined) {
    fields.push('progress = ?')
    values.push(updates.progress)
  }
  if (updates.subProgress !== undefined) {
    fields.push('sub_progress = ?')
    values.push(JSON.stringify(updates.subProgress))
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?')
    values.push(updates.notes)
  }
  if (updates.team !== undefined) {
    fields.push('team = ?')
    values.push(JSON.stringify(updates.team))
  }
  if (updates.scope !== undefined) {
    fields.push('scope = ?')
    values.push(JSON.stringify(updates.scope))
  }
  if (updates.timeline !== undefined) {
    fields.push('timeline = ?')
    values.push(JSON.stringify(updates.timeline))
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteProject(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM projects WHERE id = ?', [id])
}

export function isDatabaseEmpty(): boolean {
  const db = getDatabase()
  const stmt = db.prepare('SELECT COUNT(*) FROM projects')
  stmt.step()
  const count = stmt.get()[0] as number
  stmt.free()
  return count === 0
}
```

- [ ] **Step 3: 更新 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  db: {
    init: () => ipcRenderer.invoke('db:init'),
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params)
  }
})
```

**验收标准：**
- 数据库初始化成功
- 项目 CRUD 操作正常
- 数据持久化到内存数据库

---

## Task 5: 预置演示数据

**Files:**
- Create: `src/data/seedData.ts`

- [ ] **Step 1: 创建预置数据**

```typescript
import { CreateProjectInput } from '@/types'

export const seedProjects: CreateProjectInput[] = [
  {
    name: '战略品牌重塑',
    productLine: '营销云',
    status: 'ongoing',
    tag: '项目 A - 三月',
    totalAmount: 2240000,
    usedAmount: 1680000,
    progress: 75,
    subProgress: {
      architecture: 100,
      uiux: 92,
      engineering: 45,
      qa: 12
    },
    notes: '专注于品牌视觉统一和用户体验优化',
    team: [
      {
        id: '1',
        name: 'Sarah Chen',
        role: '首席架构师',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyjxRO5qOB3M-dlHZiV1yUy07Ahs1ghgx3iQrBUqoyr-AmkLEgYSBlwxsdNxzqOmGfe7Kh2epx7cBN3mjzHv5CzbjG-uW_XNHkoC6bvgX3Qx6xkPWeM2ADh-K8gTKeU7VD8iuO0e0AyVcE3B6crdQylAzIVaqMC-DHXDLIkLDCg1K6GFSi1T1X5W-hWH6GNlPE-eocSUblhc990nX7hGcVghdqcodC_YSBEEC46ilYi05eh3rso29Ane-YGZMz8hi0fvUDhlkhKRs'
      }
    ],
    scope: [
      {
        icon: 'auto_awesome',
        title: 'AI 智能策展',
        description: '根据用户情绪和市场趋势进行实时编辑调整的动态引擎',
        color: 'primary'
      },
      {
        icon: 'devices',
        title: '全渠道互联',
        description: '横跨 Web、iOS、Android 和 VisionOS 的统一体验',
        color: 'secondary'
      },
      {
        icon: 'shield_with_heart',
        title: '隐私保护层',
        description: '端到端加密的用户偏好设置和零知识存储架构',
        color: 'tertiary'
      },
      {
        icon: 'api',
        title: '开放式框架',
        description: '可扩展的 API 框架，支持第三方工艺集成',
        color: 'outline'
      }
    ],
    timeline: [
      {
        date: '2024年3月',
        version: 'v1.0',
        title: '初始版本',
        items: ['核心架构搭建', '数据库模式验证'],
        isActive: false,
        isCompleted: true
      },
      {
        date: '2024年5月',
        version: 'v1.4',
        title: '界面优化',
        items: ['采用毛玻璃设计', '移动端测试版发布'],
        isActive: false,
        isCompleted: true
      },
      {
        date: '2024年7月',
        version: 'v2.0',
        title: '智能驱动',
        items: ['AI 引擎集成', '公共 API Alpha 测试'],
        isActive: true,
        isCompleted: false
      },
      {
        date: '2024年9月',
        version: 'v2.5',
        title: '全面扩展',
        items: ['支持 VisionOS', '全球 CDN 节点部署'],
        isActive: false,
        isCompleted: false
      }
    ]
  },
  {
    name: '次世代界面设计',
    productLine: 'UI 系统',
    status: 'ongoing',
    tag: '项目 B - 五月',
    totalAmount: 1916000,
    usedAmount: 805000,
    progress: 42,
    subProgress: {
      architecture: 100,
      uiux: 92,
      engineering: 45,
      qa: 12
    },
    notes: '全新设计系统开发，涵盖设计规范和组件库',
    team: [],
    scope: [],
    timeline: []
  },
  {
    name: '全球扩张路线图',
    productLine: '运营策略',
    status: 'ongoing',
    tag: '项目 C - 七月',
    totalAmount: 40600000,
    usedAmount: 4060000,
    progress: 10,
    subProgress: {
      architecture: 30,
      uiux: 20,
      engineering: 5,
      qa: 0
    },
    notes: '全球化战略部署规划',
    team: [],
    scope: [],
    timeline: []
  }
]
```

**验收标准：**
- 预置数据包含 3 个项目
- 每个项目数据结构完整

---

## Task 6: Zustand Store

**Files:**
- Create: `src/store/projectStore.ts`

- [ ] **Step 1: 创建 Zustand Store**

```typescript
import { create } from 'zustand'
import { Project, CreateProjectInput } from '@/types'
import * as projectDao from '@/db/projectDao'
import { seedProjects } from '@/data/seedData'

interface ProjectStore {
  projects: Project[]
  isLoading: boolean
  error: string | null

  loadProjects: () => Promise<void>
  addProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getProjectById: (id: string) => Project | undefined
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = projectDao.getAllProjects()
      set({ projects, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addProject: async (input: CreateProjectInput) => {
    const project = projectDao.createProject(input)
    set((state) => ({ projects: [project, ...state.projects] }))
    return project
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    projectDao.updateProject(id, updates)
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    }))
  },

  deleteProject: async (id: string) => {
    projectDao.deleteProject(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id)
    }))
  },

  getProjectById: (id: string) => {
    return get().projects.find((p) => p.id === id)
  }
}))
```

**验收标准：**
- Store 状态正确更新
- CRUD 操作同步到数据库

---

## Task 7: 全局样式

**Files:**
- Create: `src/styles/globals.css`
- Create: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建全局样式**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

body {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.font-manrope {
  font-family: 'Manrope', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #005bbf;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 4px solid white;
}

input[type="range"]::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #005bbf;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 4px solid white;
}

.rte-editor:focus {
  outline: none;
  border-color: #005bbf;
}
```

- [ ] **Step 2: 创建 src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: 创建 src/App.tsx（路由配置）**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**验收标准：**
- 应用正常启动
- 路由跳转正常

---

## Task 8: 基础组件 - Sidebar 和 Header

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/Header.tsx`

- [ ] **Step 1: 创建 Sidebar.tsx**

```tsx
import { Link, useLocation } from 'react-router-dom'

const menuItems = [
  { icon: 'dashboard', label: '项目概览', path: '/' },
  { icon: 'folder_copy', label: '项目库', path: '/library' },
  { icon: 'insights', label: '数据分析', path: '/analytics' },
  { icon: 'group', label: '团队管理', path: '/team' }
]

const bottomMenuItems = [
  { icon: 'help', label: '帮助中心', path: '/help' },
  { icon: 'logout', label: '退出登录', path: '/logout' }
]

export default function Sidebar() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white dark:bg-slate-950 flex flex-col p-4 space-y-6 border-r border-outline-variant/10 z-40">
      <div className="px-2 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" data-weight="fill">dashboard</span>
          </div>
          <div>
            <h1 className="font-manrope font-extrabold text-primary leading-none">管理控制台</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">战略总览</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out ${
              isActive(item.path)
                ? 'bg-primary/5 text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pt-4 border-t border-outline-variant/10 space-y-1">
        {bottomMenuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all duration-200 ease-in-out"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: 创建 Header.tsx**

```tsx
interface HeaderProps {
  title: string
  breadcrumb?: { label: string; path?: string }[]
}

export default function Header({ title, breadcrumb }: HeaderProps) {
  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex justify-between items-center w-full px-8 py-3 sticky top-0 z-50 transition-colors border-b border-outline-variant/10">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold tracking-tight text-on-surface font-manrope">{title}</h2>
        {breadcrumb && breadcrumb.length > 0 && (
          <>
            <div className="h-6 w-[1px] bg-outline-variant/30"></div>
            <div className="flex items-center gap-1 text-on-surface-variant text-sm font-medium">
              {breadcrumb.map((item, index) => (
                <span key={index} className="flex items-center gap-1">
                  <span>{item.label}</span>
                  {index < breadcrumb.length - 1 && (
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-surface-container border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-primary transition-all"
            placeholder="搜索项目..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-150">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-150">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary-container">
            <img
              alt="用户头像"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxRCSxa6lE3m549Oy9My2ObIZcpqPM1crJvZmQP3TqVVIVQ-Va2D-dtR1MkPJvQHtLydIfUvtk1R5UNM4w83bP2842qQ9z0EOP8BT1B-Nl_uISYNIx03_eg_E27O0qJrX_sQ5G1qaUQsvIy3ZhL5qBv5sf_TcKsYzbs2sMIdqUbHUxKBr8ssiYxBvfIKtynwP7oCYONX-e_RTSToMJuhtusDN7-yjK-8hMWsOlugjUZ0K9ZCFi7hu5L0RcWbQJNyhLAtvBt7swwG8"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
```

**验收标准：**
- Sidebar 固定左侧，高度占满
- 导航高亮正确
- Header 毛玻璃效果正常

---

## Task 9: 基础组件 - StatsCard 和 ProjectTable

**Files:**
- Create: `src/components/StatsCard.tsx`
- Create: `src/components/ProjectTable.tsx`

- [ ] **Step 1: 创建 StatsCard.tsx**

```tsx
interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    direction: 'up' | 'down'
    label: string
  }
  icon?: string
  progress?: {
    value: number
    used: string
    total: string
  }
  variant?: 'default' | 'budget'
  iconColor?: string
}

export default function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  progress,
  variant = 'default',
  iconColor = 'text-primary'
}: StatsCardProps) {
  if (variant === 'budget' && progress) {
    return (
      <div className="bg-white p-6 rounded-xl relative overflow-hidden border border-outline-variant/10">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <span className="material-symbols-outlined text-6xl">{icon || 'payments'}</span>
        </div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-on-surface-variant">{title}</p>
          <h3 className="font-manrope text-4xl font-extrabold mt-1">{value}%</h3>
          <div className="mt-4 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${progress.value}%` }}></div>
          </div>
          <div className="mt-2 flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
            <span>{progress.used}</span>
            <span>{progress.total}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl relative overflow-hidden border border-outline-variant/10">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <span className="material-symbols-outlined text-6xl">{icon || 'folder'}</span>
      </div>
      <div className="relative z-10">
        <p className="text-sm font-medium text-on-surface-variant">{title}</p>
        <h3 className="font-manrope text-4xl font-extrabold mt-1">{value}</h3>
        {trend && (
          <div className="mt-4 flex items-center gap-2 text-secondary text-xs font-bold">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>{trend.label}</span>
          </div>
        )}
        {subtitle && (
          <div className="mt-4 flex items-center gap-2 text-tertiary text-xs font-bold">
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 ProjectTable.tsx**

```tsx
import { useNavigate } from 'react-router-dom'
import { Project } from '@/types'

interface ProjectTableProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
}

export default function ProjectTable({ projects, onEdit, onDelete }: ProjectTableProps) {
  const navigate = useNavigate()

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'ongoing':
        return 'bg-primary-fixed text-on-primary-fixed'
      case 'completed':
        return 'bg-secondary-container text-on-secondary-container'
      case 'paused':
        return 'bg-tertiary-fixed text-on-tertiary-fixed'
    }
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN')}`
  }

  const getBudgetProgressColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-primary'
    if (percentage >= 40) return 'bg-tertiary'
    return 'bg-error'
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-outline-variant/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface text-on-surface-variant border-b border-outline-variant/10">
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">项目名称</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">产品线</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">负责人</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">总金额</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">已使用金额</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">预算执行率</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {projects.map((project) => {
              const budgetPercentage = Math.round((project.usedAmount / project.totalAmount) * 100)
              return (
                <tr
                  key={project.id}
                  className="hover:bg-surface transition-colors cursor-pointer"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <td className="px-6 py-5">
                    <p className="font-bold text-on-surface">{project.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${getStatusColor(project.status)}`}>
                      {project.tag}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-on-surface-variant">{project.productLine}</td>
                  <td className="px-6 py-5">
                    {project.team.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-container-highest overflow-hidden">
                          <img alt={project.team[0].name} className="w-full h-full object-cover" src={project.team[0].avatar} />
                        </div>
                        <span className="text-sm font-medium">{project.team[0].name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-on-surface">{formatCurrency(project.totalAmount)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-on-surface">{formatCurrency(project.usedAmount)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-surface-container rounded-full h-1.5 overflow-hidden">
                        <div className={getBudgetProgressColor(budgetPercentage) + ' h-full rounded-full'} style={{ width: `${budgetPercentage}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-primary">{budgetPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(project)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => onDelete(project.id)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**验收标准：**
- 表格正确渲染项目列表
- 点击行跳转到详情页
- 编辑/删除按钮阻止冒泡

---

## Task 10: Dashboard 页面

**Files:**
- Create: `src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建 Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import ProjectTable from '@/components/ProjectTable'
import { useProjectStore } from '@/store/projectStore'
import { Project } from '@/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { projects, loadProjects, deleteProject } = useProjectStore()
  const [filter, setFilter] = useState({ month: '', status: '' })

  useEffect(() => {
    loadProjects()
  }, [])

  const ongoingCount = projects.filter((p) => p.status === 'ongoing').length
  const totalBudget = projects.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalUsed = projects.reduce((sum, p) => sum + p.usedAmount, 0)
  const budgetPercentage = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0

  const handleEdit = (project: Project) => {
    navigate(`/project/${project.id}`)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个项目吗？')) {
      await deleteProject(id)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Header title="Precision Curator" breadcrumb={[{ label: '项目概览' }, { label: '战略仪表盘' }]} />
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-manrope text-4xl font-extrabold tracking-tight text-on-surface">业务概览</h2>
              <p className="text-on-surface-variant mt-2 font-medium">欢迎回来，这是为您准备的今日战略简报。</p>
            </div>
            <button
              onClick={() => navigate('/project/new')}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold font-manrope text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:translate-y-[-2px] transition-all active:translate-y-0"
            >
              <span className="material-symbols-outlined">add</span>
              新增项目
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title="项目总数" value={projects.length} icon="folder" trend={{ direction: 'up', label: '较上季度增长 12%' }} />
            <StatsCard title="进行中" value={ongoingCount} icon="pending_actions" subtitle="本周有 8 项到期" />
            <StatsCard title="全局预算执行率" value={budgetPercentage} icon="payments" variant="budget" progress={{ value: budgetPercentage, used: `已使用: ¥${(totalUsed / 1000000).toFixed(1)}M`, total: `总金额: ¥${(totalBudget / 1000000).toFixed(2)}M` }} iconColor="text-primary" />
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="p-6 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low/50">
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <select
                    className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-outline-variant/20 rounded-full text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary min-w-[140px] text-on-surface"
                    value={filter.month}
                    onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                  >
                    <option value="">三月</option>
                    <option value="">五月</option>
                    <option value="">七月</option>
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">calendar_today</span>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">expand_more</span>
                </div>
                <div className="relative">
                  <select
                    className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-outline-variant/20 rounded-full text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary min-w-[160px] text-on-surface"
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  >
                    <option value="">进行中</option>
                    <option value="">已完成</option>
                    <option value="">暂停中</option>
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">flag</span>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">expand_more</span>
                </div>
              </div>
              <button className="p-2.5 rounded-full bg-white border border-outline-variant/20 shadow-sm text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>

            <ProjectTable projects={projects} onEdit={handleEdit} onDelete={handleDelete} />

            <div className="p-6 bg-surface-container-low/50 flex items-center justify-between">
              <p className="text-xs font-bold text-on-surface-variant">显示 {projects.length} 个活跃项目中的第 1-{Math.min(3, projects.length)} 个</p>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white hover:shadow-sm transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-on-primary font-bold text-xs">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white hover:shadow-sm transition-all font-bold text-xs">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white hover:shadow-sm transition-all font-bold text-xs">3</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white hover:shadow-sm transition-all">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

**验收标准：**
- Dashboard 正确显示统计卡片和项目表格
- 点击项目行跳转详情页
- 新增项目按钮可用

---

## Task 11: 项目详情页组件 - ProgressSlider, RichTextEditor, Timeline

**Files:**
- Create: `src/components/ProgressSlider.tsx`
- Create: `src/components/RichTextEditor.tsx`
- Create: `src/components/Timeline.tsx`

- [ ] **Step 1: 创建 ProgressSlider.tsx**

```tsx
import { useState } from 'react'

interface ProgressSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function ProgressSlider({ value, onChange }: ProgressSliderProps) {
  const [localValue, setLocalValue] = useState(value)
  const [lastUpdate, setLastUpdate] = useState('刚刚')

  const handleChange = (newValue: number) => {
    setLocalValue(newValue)
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    setLastUpdate(timeStr)
    onChange(newValue)
  }

  return (
    <section className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/20 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h2 className="headline-font text-2xl font-bold">进度动态</h2>
        <span className="text-primary font-bold text-3xl transition-all">{localValue}%</span>
      </div>
      <div className="relative w-full mb-8">
        <input
          type="range"
          min="0"
          max="100"
          value={localValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full h-3 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
        />
      </div>
      <div className="mb-8 text-xs text-on-surface-variant h-6 overflow-hidden italic">
        最后调整时间: {lastUpdate} ({localValue}%)
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <SubProgressCard label="底层架构" value={100} />
        <SubProgressCard label="UI/UX 设计" value={92} />
        <SubProgressCard label="工程开发" value={45} />
        <SubProgressCard label="质量审计" value={12} />
      </div>
    </section>
  )
}

function SubProgressCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
      <p className="text-on-surface-variant text-xs font-bold uppercase mb-1">{label}</p>
      <p className="headline-font text-xl font-bold">{value}%</p>
    </div>
  )
}
```

- [ ] **Step 2: 创建 RichTextEditor.tsx**

```tsx
import { useState } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder = '在此输入项目详细描述...' }: RichTextEditorProps) {
  const [content, setContent] = useState(value)

  const handleChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML
    setContent(newContent)
    onChange(newContent)
  }

  return (
    <section className="md:col-span-12 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/20 shadow-sm">
      <h2 className="headline-font text-2xl font-bold mb-6">项目笔记与描述</h2>
      <div className="border border-outline-variant/30 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <div className="flex items-center gap-2 p-2 bg-surface-container-low border-b border-outline-variant/30">
          <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors" title="粗体">
            <span className="material-symbols-outlined text-[20px]">format_bold</span>
          </button>
          <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors" title="斜体">
            <span className="material-symbols-outlined text-[20px]">format_italic</span>
          </button>
          <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors" title="列表">
            <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
          </button>
          <div className="w-px h-6 bg-outline-variant/30 mx-1"></div>
          <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors" title="链接">
            <span className="material-symbols-outlined text-[20px]">link</span>
          </button>
          <button className="p-1.5 hover:bg-surface-container-high rounded transition-colors" title="图片">
            <span className="material-symbols-outlined text-[20px]">image</span>
          </button>
        </div>
        <div
          className="rte-editor min-h-[200px] p-6 text-on-surface-variant leading-relaxed focus:outline-none"
          contentEditable
          onInput={handleChange}
          dangerouslySetInnerHTML={{ __html: content }}
        >
          {content}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 创建 Timeline.tsx**

```tsx
import { TimelineEvent } from '@/types'

interface TimelineProps {
  events: TimelineEvent[]
  viewMode: 'month' | 'quarter'
  onViewModeChange: (mode: 'month' | 'quarter') => void
}

export default function Timeline({ events, viewMode, onViewModeChange }: TimelineProps) {
  return (
    <section className="md:col-span-12 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/20 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="headline-font text-2xl font-bold">演进历程</h2>
          <p className="text-on-surface-variant text-sm">架构变迁与版本部署的历史记录。</p>
        </div>
        <div className="flex items-center bg-surface-container-high p-1 rounded-full">
          <button
            onClick={() => onViewModeChange('month')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${viewMode === 'month' ? 'bg-surface-container-lowest shadow-sm' : ''}`}
          >
            按月
          </button>
          <button
            onClick={() => onViewModeChange('quarter')}
            className={`px-4 py-1.5 text-xs font-bold ${viewMode === 'quarter' ? 'bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant'}`}
          >
            按季度
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-6">
        <div className="min-w-[1000px] flex gap-12 relative before:absolute before:top-4 before:left-0 before:w-full before:h-0.5 before:bg-surface-container before:z-0">
          {events.map((event, index) => (
            <div key={index} className="relative z-10 w-1/4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                  event.isCompleted
                    ? 'bg-primary'
                    : event.isActive
                    ? 'bg-surface-container-lowest border-4 border-primary'
                    : 'bg-surface-container'
                }`}
              >
                {event.isCompleted && <span className="material-symbols-outlined text-white text-[18px]">check</span>}
                {event.isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
              </div>
              <div className="space-y-3">
                <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-tighter ${event.isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-highest'}`}>
                  {event.date}
                </span>
                <h4 className="font-bold text-lg">{event.title}</h4>
                <ul className="text-sm text-on-surface-variant space-y-2">
                  {event.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${event.isCompleted ? 'bg-primary' : 'bg-outline'}`}></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**验收标准：**
- 进度滑块可拖动并实时更新
- 富文本编辑器可输入内容
- 时间线正确渲染所有事件节点

---

## Task 12: ProjectDetail 页面

**Files:**
- Create: `src/pages/ProjectDetail.tsx`

- [ ] **Step 1: 创建 ProjectDetail.tsx**

```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import ProgressSlider from '@/components/ProgressSlider'
import RichTextEditor from '@/components/RichTextEditor'
import Timeline from '@/components/Timeline'
import { Project } from '@/types'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getProjectById, updateProject, addProject } = useProjectStore()
  const [project, setProject] = useState<Project | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month')

  useEffect(() => {
    if (id === 'new') {
      setIsNew(true)
      setProject({
        id: '',
        name: '新项目',
        productLine: '',
        status: 'ongoing',
        tag: '',
        totalAmount: 0,
        usedAmount: 0,
        progress: 0,
        subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
        notes: '',
        team: [],
        scope: [],
        timeline: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } else if (id) {
      const found = getProjectById(id)
      if (found) {
        setProject(found)
      } else {
        navigate('/')
      }
    }
  }, [id])

  const handleProgressChange = async (newProgress: number) => {
    if (project && !isNew) {
      await updateProject(project.id, { progress: newProgress })
      setProject({ ...project, progress: newProgress })
    }
  }

  const handleNotesChange = async (newNotes: string) => {
    if (project && !isNew) {
      await updateProject(project.id, { notes: newNotes })
      setProject({ ...project, notes: newNotes })
    }
  }

  if (!project) return null

  const budgetPercentage = project.totalAmount > 0 ? Math.round((project.usedAmount / project.totalAmount) * 100) : 0

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center w-full px-8 py-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="text-on-surface-variant text-sm font-medium">项目 ID: {isNew ? '新建' : `PRJ-${project.id.slice(0, 8).toUpperCase()}`}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
            <img alt="用户头像" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd9TKAQp7x6YAnnZVbRyg7ohx2nSBtA9dMuXOiEi0lpVomOUYzDcm-lN4hhDzDowY0MGJAXH1fRDG2ikwPuKHzx_vkJTP3jL5YyTsASSgz7N5imxxAE8KaC_eZWhvShzg2Ym-VlrS86Oqtbs6eosULV1sy8fMETDPgDKzJU-maRrTTe5-E2H2WGk4KXTfzdJy5FxAfOgQAB8nHvEZDWdSA29jNk5hWVmqt15S1TLjwCkV8NnspSgIqlIsiK0wFvAfitB8yOM4PVLQ" />
          </div>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto p-8 lg:p-12">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                project.status === 'ongoing' ? 'bg-secondary-container text-on-secondary-container' :
                project.status === 'completed' ? 'bg-primary text-on-primary' : 'bg-tertiary-fixed text-on-tertiary-fixed'
              }`}>
                {project.status === 'ongoing' ? '进行中' : project.status === 'completed' ? '已完成' : '暂停中'}
              </span>
              <span className="text-on-surface-variant text-sm font-medium">{isNew ? '' : `项目 ID: PRJ-${project.id.slice(0, 8).toUpperCase()}`}</span>
            </div>
            <h1 className="headline-font text-5xl font-extrabold tracking-tight text-on-surface">{isNew ? '新建项目' : project.name}</h1>
            <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">{project.productLine || '输入产品线描述...'}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <ProgressSlider value={project.progress} onChange={handleProgressChange} />

          <section className="md:col-span-4 bg-primary text-on-primary rounded-xl p-8 shadow-lg flex flex-col justify-center">
            <h2 className="headline-font text-2xl font-bold mb-8">预算统计</h2>
            <div className="space-y-8">
              <div>
                <p className="text-white/60 text-xs font-bold uppercase mb-1">总金额</p>
                <p className="headline-font text-4xl font-extrabold">¥{project.totalAmount.toLocaleString()}</p>
              </div>
              <div className="pt-6 border-t border-white/10">
                <p className="text-white/60 text-xs font-bold uppercase mb-1">已使用金额</p>
                <div className="flex items-end gap-2">
                  <p className="headline-font text-4xl font-extrabold">¥{project.usedAmount.toLocaleString()}</p>
                  <p className="text-sm font-medium opacity-60 mb-1">({budgetPercentage}%)</p>
                </div>
              </div>
            </div>
          </section>

          <RichTextEditor value={project.notes} onChange={handleNotesChange} />

          <section className="md:col-span-5 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/20 shadow-sm">
            <h2 className="headline-font text-2xl font-bold mb-6">战略团队</h2>
            <div className="space-y-5">
              {project.team.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-4">
                    <img alt={member.name} className="w-12 h-12 rounded-full object-cover" src={member.avatar} />
                    <div>
                      <p className="font-bold">{member.name}</p>
                      <p className="text-xs text-on-surface-variant">{member.role}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 border border-dashed border-outline-variant rounded-xl text-on-surface-variant font-medium hover:bg-surface-container-low transition-all">
              + 添加专家成员
            </button>
          </section>

          <section className="md:col-span-7 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/20 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="headline-font text-2xl font-bold">策展范围</h2>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">open_in_new</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.scope.map((item, index) => (
                <div key={index} className={`bg-surface-container-low p-5 rounded-xl border-l-4 border-${item.color}`}>
                  <div className={`flex items-center gap-3 mb-3 text-${item.color}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="text-sm font-bold uppercase tracking-tighter">{item.title}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <Timeline events={project.timeline} viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </main>
    </div>
  )
}
```

**验收标准：**
- 页面正确加载项目数据
- 进度滑块可拖动并保存
- 富文本编辑器可编辑并保存
- 时间线视图切换正常

---

## Task 13: 数据初始化集成

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: 更新 src/main.tsx 添加数据初始化**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { initDatabase } from './db'
import { getAllProjects, isDatabaseEmpty } from './db/projectDao'
import { seedProjects } from './data/seedData'
import { useProjectStore } from './store/projectStore'
import { createProject } from './db/projectDao'

async function bootstrap() {
  try {
    await initDatabase()

    if (isDatabaseEmpty()) {
      for (const project of seedProjects) {
        createProject(project)
      }
    }

    const projects = getAllProjects()
    useProjectStore.setState({ projects })

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

bootstrap()
```

**验收标准：**
- 应用启动时自动初始化数据库
- 首次启动时自动插入预置数据
- 预置数据显示在仪表盘

---

## Task 14: 打包构建验证

**Files:**
- Modify: `package.json` scripts

- [ ] **Step 1: 更新 package.json 添加构建脚本**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "electron:dev": "concurrently \"vite\" \"electron .\"",
    "electron:build": "vite build && electron-builder",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: 运行构建验证**

```bash
npm run build
```

**验收标准：**
- TypeScript 编译无错误
- Vite 构建成功
- electron-builder 生成可执行文件

---

## 自检清单

完成所有任务后，请验证：

1. **Spec 覆盖检查：** 逐条核对设计文档中的需求，确认每条都有对应的实现
2. **占位符扫描：** 搜索 "TBD"、"TODO"、"implement later" 等占位符，确保无遗漏
3. **类型一致性：** 确认 TypeScript 类型、函数签名在所有任务中保持一致
4. **验收标准检查：** 每个任务都有明确的验收标准

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-precision-curator-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
