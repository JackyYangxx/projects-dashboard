# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Precision Curator** is an Electron desktop application for project management. It uses a single-window SPA architecture with offline-first data persistence via sql.js (SQLite in WebAssembly).

## Commands

```bash
npm run dev           # Start Vite dev server (http://localhost:5173)
npm run build         # TypeScript compile + Vite build + Electron builder
npm run electron:dev  # Run Electron with Vite (concurrent dev server + Electron)
npm run electron:build # Build Vite + package with electron-builder
```

**Note:** `npm run dev` starts only the Vite server. Use `npm run electron:dev` for full Electron development.

## Architecture

### Electron Process Model
- **Main process** (`electron/main.ts`): Window management, IPC handlers, app lifecycle
- **Preload script** (`electron/preload.ts`): Secure API bridge via `contextBridge`
- **Renderer process** (`src/`): React SPA - fully isolated from Node.js

### React App Structure
```
src/
├── App.tsx              # Router config (BrowserRouter, Routes)
├── main.tsx             # Bootstrap: DB init + React mount
├── pages/               # Route pages
│   ├── Dashboard.tsx    # / - Project list with stats
│   └── ProjectDetail.tsx # /project/:id - Single project view
├── components/          # Shared UI components
│   ├── Sidebar.tsx      # Fixed left nav (256px)
│   ├── Header.tsx       # Top bar with search/avatar
│   ├── StatsCard.tsx    # Metric cards (default + budget variant)
│   ├── ProjectTable.tsx # Sortable project list table (infinite scroll)
│   ├── ProgressSlider.tsx # Draggable progress + sub-progress cards
│   ├── RichEditor.tsx   # Rich text editor (textarea-based, supports basic formatting)
│   └── Timeline.tsx    # Version history timeline
├── store/
│   └── projectStore.ts  # Zustand store (CRUD + loading state)
├── db/
│   ├── index.ts         # sql.js init + schema creation
│   └── projectDao.ts    # CRUD operations (getAllProjects, createProject, etc.)
├── data/
│   └── seedData.ts      # 3 demo projects auto-loaded on first run
└── types/
    └── index.ts         # Project, TeamMember, ScopeItem, TimelineEvent, NoteHistory, Milestone interfaces
```

### Data Flow
1. `main.tsx` calls `initDatabase()` → loads `sql-wasm.wasm`
2. If DB is empty, seeds demo data from `seedData.ts`
3. Zustand store (`projectStore`) holds in-memory state
4. All CRUD operations go through `projectDao.ts` → sql.js → persisted in-memory SQLite

### Database Schema
Projects table with JSON columns for `team`, `scope`, `timeline`, `subProgress`. SQLite WAL mode not used — in-memory only, data resets on app restart unless persisted to file.

### Design System v2.0 - Light Tech Theme

**设计理念:** 轻盈的科技感 - 浅色基调 + 毛玻璃 + 流动渐变

**色彩系统:**
```css
/* 表面色 */
--surface-base: #F8FAFC;      /* 主背景 */
--surface-container: #FFFFFF;   /* 卡片 */
--surface-elevated: #FFFFFF;   /* 抬升元素 */
--surface-hover: #F1F5F9;      /* Hover */

/* 主色 - 电光蓝 → 科技紫 */
--primary: #3B82F6;
--accent: #8B5CF6;

/* 文字 */
--on-surface-primary: #0F172A;   /* AAA 对比度 */
--on-surface-secondary: #475569;
--on-surface-tertiary: #94A3B8;

/* 边框 */
--outline: #E2E8F0;
--outline-variant: #F1F5F9;
```

**字体系统:**
- Headings/Numbers: **Fira Code** (等宽科技感)
- Body: **Fira Sans** (清晰易读)
- 数字使用 `tabular-nums` 确保对齐

**组件规范:**
- 按钮: `rounded-xl` + 渐变背景 + `shadow-glow-sm` hover
- 卡片: `rounded-2xl` + `border border-outline` + `shadow-card`
- 输入框: `rounded-xl` + `focus:ring-2 focus:ring-primary-500/20`
- 图标: Material Symbols Outlined (Google Fonts)
- 危险操作: 必须有确认对话框

**动画规范:**
- 过渡时长: 150-300ms (ease-out)
- 进度条: `transition-[width] duration-500 ease-out`
- 背景流动: `animate-blob` (blob 动画)
- Hover: `hover:scale-[1.02]` + `shadow-glow-sm`

**无障碍:**
- 所有图标按钮必须有 `aria-label`
- 颜色对比 ≥ 4.5:1
- 支持 `prefers-reduced-motion`

**参考文档:**
- `doc/ui-design-system.md` - 完整设计系统文档
- `doc/ui-review-dashboard.md` - UI审查报告及修复记录

## Key Patterns

### Adding a New Component
1. Create in `src/components/`
2. Import into page: `import Component from '@/components/Component'`
3. Use in page JSX

### Read-Only Mode Pattern
ProjectDetail supports read-only mode (`isReadOnly` state). Components should respect this:
- `ProgressSlider`: `readOnly` prop disables drag handle
- `RichEditor`: `readOnly` prop disables editing
- Budget cards: Show text instead of input fields

### Inline Edit Pattern
For budget cards and similar editable fields:
1. Click text → becomes input (controlled by edit state)
2. Enter/blur → save
3. ESC → cancel, restore original value
4. Show saving indicator during async operations

### Accordion Pattern
For collapsible sections (e.g., note history):
1. `expandedId` state tracks which item is expanded
2. Default: expand newest/last item
3. Header onClick toggles expand/collapse
4. Chevron rotation: collapsed=-90deg, expanded=0deg (pointing down when collapsed)

### Modal Pattern
For dialogs (e.g., add member):
1. `showModal` state controls visibility
2. Modal contains form inputs + preview
3. On submit: close modal, insert data
4. DiceBear avatar: `https://api.dicebear.com/7.x/initials/svg?seed={name}`

### State Update Flow
Zustand store action → `projectDao` function → sql.js → store.setState() to sync UI

### Routing
React Router v6 with two routes: `/` (Dashboard) and `/project/:id` (ProjectDetail). `Navigate` fallback for unknown routes.

## File Paths
- Electron entry: `electron/main.ts`, `electron/preload.ts`
- WASM file: `public/sql-wasm.wasm` (loaded by sql.js via `/sql-wasm.wasm`)
- Tailwind config: `tailwind.config.js`
- Vite config: `vite.config.ts` (includes Electron plugin)


# Rules

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
