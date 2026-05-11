# Precision Curator - 项目变更日志

**当前版本：** 1.0.2
**最后更新：** 2026-05-08

---

## 版本历史

### v1.0.2 (2026-05-08)

**功能增强**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| F1 | 导出功能增强：包含项目详细内容（repository, branch, subProgress, notes, team, scope, milestones, timeline） | ✅ | `src/pages/Dashboard.tsx` |
| F2 | 导入无限制：支持完整字段导入，upsert 保留未填字段 | ✅ | `src/pages/Dashboard.tsx` |

**提交：** `cc4a76b` feat: export detailed project info including subProgress, notes, team, scope, milestones and timeline

---

### v1.0.1 (2026-04-28)

**功能增强**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| R1 | 项目详情页新增代码仓信息字段（repository, branch） | ✅ | `src/pages/ProjectDetail.tsx`, `src/pages/ProjectForm.tsx`, `src/db/projectDao.ts`, `src/types/index.ts`, `src/constants/project.ts`, `src/data/seedData.ts` |
| R2 | Excel 导入导出支持 repository 和 branch 字段 | ✅ | `src/pages/Dashboard.tsx` |
| R3 | 项目详情页代码仓信息自动进入编辑模式 | ✅ | `src/pages/ProjectDetail.tsx` |

**Bug 修复**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| B1 | ESC 键无法取消代码仓编辑输入 | ✅ | `src/pages/ProjectDetail.tsx` |

**提交：** `S83-S84`, `62-73`

---

### v1.0.0 (2026-04-21)

**功能增强**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| I1 | 导入规则简化：必填字段从 7 项缩减为 5 项（移除状态和项目进展） | ✅ | `src/constants/project.ts`, `src/pages/Dashboard.tsx` |
| I2 | 预算执行率由计算得出，不再导入 | ✅ | `src/pages/Dashboard.tsx` |
| I3 | upsert 函数支持部分字段更新 | ✅ | `src/db/projectDao.ts` |

**提交：** `2026-04-21` import-validation-design

---

### v0.9.0 (2026-04-18)

**功能增强**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| F1 | 项目笔记仅在编辑状态下显示 | ✅ | `src/pages/ProjectDetail.tsx` |
| F2 | 里程碑支持编辑模式输入（Dialog 表单） | ✅ | `src/pages/ProjectDetail.tsx` |
| F3 | 预算统计编辑模式直接显示文本框 | ✅ | `src/pages/ProjectDetail.tsx` |
| F4 | 移除 Timeline 组件 | ✅ | `src/pages/ProjectDetail.tsx` |

**Bug 修复**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| B1 | 点击列表编辑按钮应跳转编辑状态（`?edit=true`） | ✅ | `src/pages/Dashboard.tsx`, `src/pages/ProjectDetail.tsx` |
| B2 | 预算统计在编辑状态下没有正确回显数值 | ✅ | `src/pages/ProjectDetail.tsx` |
| B3 | 笔记历史未正确解析 Markdown 格式（使用 marked + DOMPurify） | ✅ | `src/pages/ProjectDetail.tsx` |
| B4 | isReadOnly 状态在切换后被 URL 参数覆盖 | ✅ | `src/pages/ProjectDetail.tsx` |
| B5 | 笔记历史没有默认展开最新记录 | ✅ | `src/pages/ProjectDetail.tsx` |
| B6 | 战略团队添加成员按钮在查看模式下可见 | ✅ | `src/pages/ProjectDetail.tsx` |

**提交：** `d9df988`, `f66a113`, `901920c`, `c6cc07f`, `f9f77a3`, `a6e64f5`

---

### v0.8.0 (2026-04-17)

**功能增强**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| D1 | Dashboard 无限滚动（Intersection Observer） | ✅ | `src/components/ProjectTable.tsx` |
| D2 | 行点击跳转只读详情页 | ✅ | `src/components/ProjectTable.tsx`, `src/pages/ProjectDetail.tsx` |
| D3 | 子进度条可独立拖拽 | ✅ | `src/components/ProgressSlider.tsx` |
| D4 | 预算卡片内联编辑 | ✅ | `src/pages/ProjectDetail.tsx` |
| D5 | 笔记历史手风琴 UI（最新默认展开） | ✅ | `src/pages/ProjectDetail.tsx` |
| D6 | 富文本编辑器替换为 Tiptap | ✅ | `src/components/TipTapEditor.tsx` |
| D7 | 团队添加成员弹窗（DiceBear 头像） | ✅ | `src/pages/ProjectDetail.tsx` |
| D8 | 策展范围替换为里程碑组件 | ✅ | `src/pages/ProjectDetail.tsx` |
| D9 | React Router future flags 添加 | ✅ | `src/App.tsx` |

**Bug 修复**

| # | 描述 | 状态 | 变更文件 |
|---|------|------|----------|
| B1 | WASM 数据库初始化失败（使用 wasmBinary + fetch） | ✅ | `src/db/index.ts` |
| B2 | 表单字段缺少 id/name 属性（搜索框、筛选器） | ✅ | `src/components/Header.tsx`, `src/pages/Dashboard.tsx` |
| B3 | 新增项目按钮缺少 onClick 处理程序 | ✅ | `src/pages/ProjectForm.tsx`, `src/pages/Dashboard.tsx` |

**代码质量规则（已沉淀）**

1. **手风琴默认展开最新项** — 新条目 append 到数组末尾时，`expandedId = array[array.length - 1].id`
2. **Arrow Rotation 方向** — 折叠(`collapsed`): `rotate(-90deg)`; 展开(`expanded`): `rotate(0deg)`
3. **IntersectionObserver Dependencies** — 不要将 `isLoadingMore` 放入 deps 数组，使用 ref 代替
4. **内联编辑状态管理** — `editingField` + `editValue` 模式
5. **只读模式穿透** — 所有可编辑组件支持 `readOnly` prop

**提交：** `95b7939`, `270d27f`, `710c016`, `b00a7e3`, `4963bce`, `29e3bc3`, `79f3d75`

---

### v0.5.0 (2026-04-16)

**初始版本**

- Electron + React + Vite + TypeScript + Tailwind 项目脚手架
- sql.js (SQLite in WASM) 数据库层
- Zustand 状态管理
- Dashboard 首页（侧边栏、顶部栏、统计卡片、项目表格）
- ProjectDetail 详情页（进度滑块、预算统计、富文本编辑器、团队、策展范围）
- 预置 3 个示例项目

**提交：** `89cde0a`, `fbdf250`, `87db632`, `ab12974`, `19b43d1`, `81f9cd6`, `cff1115`, `e9ee0a4`

---

## 技术栈

| 层级 | 技术选型 | 版本 |
|-----|---------|------|
| 桌面框架 | Electron | 32.x |
| 前端框架 | React | 18.x |
| UI 样式 | Tailwind CSS | 3.x |
| 构建工具 | Vite | 5.x |
| 路由 | React Router | v6 |
| 状态管理 | Zustand | 4.x |
| 本地存储 | sql.js | 1.x |
| 语言 | TypeScript | 5.x |
| Excel 处理 | xlsx (SheetJS) | latest |

---

## 架构

```
precision-curator/
├── electron/
│   ├── main.ts           # Electron 主进程（窗口管理、IPC、单例锁）
│   └── preload.ts        # 预加载脚本（contextBridge API）
├── src/
│   ├── components/       # 公共 UI 组件
│   │   ├── Sidebar.tsx       # 侧边栏导航
│   │   ├── Header.tsx        # 顶部栏
│   │   ├── StatsCard.tsx     # 统计卡片
│   │   ├── ProjectTable.tsx  # 项目表格（无限滚动）
│   │   ├── ProgressSlider.tsx # 进度滑块（主+子进度）
│   │   └── TipTapEditor.tsx  # 富文本编辑器
│   ├── pages/
│   │   ├── Dashboard.tsx     # 项目仪表盘（导入/导出）
│   │   ├── ProjectDetail.tsx # 项目详情页（查看/编辑）
│   │   └── ProjectForm.tsx   # 新增项目表单
│   ├── store/
│   │   └── projectStore.ts   # Zustand store
│   ├── db/
│   │   ├── index.ts         # 数据库初始化
│   │   └── projectDao.ts    # CRUD + upsert
│   ├── data/
│   │   └── seedData.ts      # 预置数据（3 个项目）
│   ├── constants/
│   │   └── project.ts       # 常量（STATUS_MAP, IMPORT_REQUIRED_HEADERS 等）
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   └── styles/
│       └── globals.css      # 全局样式 + 动画
├── docs/
│   ├── implementation-summary.md  # 本文档
│   ├── ui-design-system.md        # 设计系统
│   └── archive/                    # 历史文档
└── public/
    └── sql-wasm.wasm              # SQLite WASM 文件
```

---

## 数据模型

```typescript
interface Project {
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
  repository: string
  branch: string
  createdAt: string
  updatedAt: string
}
```

---

*文档生成时间：2026-04-16*
*最后更新：2026-05-08*
