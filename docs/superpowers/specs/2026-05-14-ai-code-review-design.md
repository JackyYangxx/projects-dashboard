# AI 代码评审功能设计

## 概述

在左侧菜单新增「代码评审」页签，串联用户配置的 MCP 服务 + LLM API，对维护项目的代码仓库进行 AI 辅助评审，评审问题记录按项目区分存储。

**核心流程：** 用户选择项目 → 触发评审 → AI 通过 MCP 获取代码 diff → 评审完成 → 结果存入数据库 → 问题列表展示

---

## 数据模型

### 新建 `code_reviews` 表

```sql
CREATE TABLE code_reviews (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  repository TEXT NOT NULL,
  branch TEXT NOT NULL,
  severity TEXT NOT NULL,           -- 'critical' | 'warning' | 'suggestion'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  filePath TEXT,
  lineRange TEXT,
  aiTrace TEXT,                     -- AI 评审过程完整 trace（工具调用 + reasoning）
  createdAt TEXT NOT NULL
);
```

### 新建 `mcp_services` 表

```sql
CREATE TABLE mcp_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  authHeader TEXT,                  -- 加密存储
  enabled INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL
);
```

### 新建 `skills` 表

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,            -- skill 文件完整内容
  enabled INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL
);
```

---

## 路由与导航

- 路由路径：`/code-review`
- `Sidebar.tsx` navItems 新增一项：`{ label: '代码评审', icon: 'code', path: '/code-review' }`
- `App.tsx` 新增 Route：`<Route path="/code-review" element={<CodeReview />} />`

---

## CodeReview 页面布局

```
┌─────────────────────────────────────────────────────┐
│  页面标题 + 描述                                      │
├─────────────────────────────────────────────────────┤
│  ┌─ 配置面板（可折叠）──────────────────────────────┐  │
│  │  MCP 服务管理 │ Skill 管理                     │  │
│  │  [+ 新增 MCP]  │ [+ 上传 Skill]                │  │
│  │  列表（可启用/禁用）│ 列表（可启用/禁用）        │  │
│  └────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  评审操作区                                          │
│  项目选择下拉 │ 分支选择 │ [开始评审] 按钮            │
├─────────────────────────────────────────────────────┤
│  评审结果（Streaming 输出区）                         │
│  ┌────────────────────────────────────────────────┐ │
│  │  AI Streaming 输出区域...                       │ │
│  └────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  问题列表（可按 severity 过滤）                       │
│  ┌─ Critical ─────────────────────────────────────┐ │
│  │  ● title · description · filePath:line        │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─ Warning ──────────────────────────────────────┐ │
│  │  ● title · description · filePath:line         │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## MCP 服务管理

**数据结构（MCP Service）：**

```ts
interface MCPService {
  id: string
  name: string
  url: string
  authHeader?: string   // 加密存储，渲染层不直接暴露
  enabled: boolean
}
```

**功能：**

- 新增 MCP 服务（name + url + authHeader，可选）
- 列表展示，支持启用/禁用切换
- 删除已配置的服务
- 编辑已有服务
- authHeader 使用 electron-store 加密存储，preload 暴露解密接口

**MCP 工具调用流程：**

1. 用户触发评审 → 渲染层通过 IPC 调用 `mcp:invoke-tool`
2. main 进程根据用户配置的 MCP URL + authHeader，发起 MCP `tools/call` 请求
3. 工具定义（tools/list）返回结果通过 IPC 回调给渲染层
4. AI streaming 过程中，AI 需要调用工具时，渲染层再次通过 IPC 请求 main 执行工具
5. 工具执行结果注入 AI 上下文，继续 streaming 输出

---

## Skill 管理

**数据结构（Skill）：**

```ts
interface Skill {
  id: string
  name: string
  description?: string
  content: string    // 完整 skill 文本
  enabled: boolean
}
```

**功能：**

- 上传 skill 文件（.md 格式，包含 `description`、`prompt` 等结构）
- 列表展示，支持启用/禁用切换
- 编辑 skill 内容
- 删除 skill
- 多个 enabled skill 的内容按顺序拼接进 system prompt

---

## LLM 集成

**LLM 请求：**

- 使用用户配置的 API Key（存储在 electron-store 加密）
- 支持 streaming（SSE）输出
- system prompt 拼接：全局 system prompt + enabled skills 内容
- tool definitions：来自用户配置的 MCP 服务的工具列表
- messages：评审结果以 AI assistant 消息追加进数据库

**Streaming 流程：**

1. 用户选择项目 + 分支 → 点击「开始评审」
2. 渲染层发起 `/chat/completions` streaming 请求
3. AI 输出流式显示在 Streaming 区域
4. AI 遇到 tool_calls → 渲染层通过 IPC 调用 main 执行 MCP 工具 → 结果回传给 AI → 继续 streaming
5. 评审结束 → 解析 AI 输出中的问题 → 存入 `code_reviews` 表
6. Streaming 区域显示最终结果 + 问题数量统计

---

## 问题列表

**展示逻辑：**

- 默认按 `createdAt desc` 展示所有问题
- 支持按 severity（Critical / Warning / Suggestion）切换 Tab 过滤
- 点击问题卡片展开 AI trace（折叠/展开）
- 问题数据来源：`code_reviews` 表按 `projectId` 查询

**数据结构（CodeReview Record）：**

```ts
interface CodeReview {
  id: string
  projectId: string
  repository: string
  branch: string
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath?: string
  lineRange?: string
  aiTrace: string      // AI 完整评审 trace
  createdAt: string
}
```

---

## 依赖关系

- `CodeReview` 依赖 `MCPService` + `Skill` 配置（数据库）
- 评审发起依赖 `Project.repository` + `Project.branch`
- 问题记录通过 `projectId` 关联到具体项目
- 所有 MCP 调用经由 Electron IPC（main 进程代理 HTTP 请求）
- API Key + authHeader 加密存储在 electron-store

---

## 实现优先级

1. **Phase 1：** 页面框架 + 路由 + 基础布局（MCP / Skill 配置面板占位）
2. **Phase 2：** MCP 服务 CRUD + Electron IPC 调用通道
3. **Phase 3：** Skill 管理（上传/编辑）
4. **Phase 4：** LLM streaming 集成（不带工具调用）
5. **Phase 5：** AI tool_calls + MCP 工具执行
6. **Phase 6：** 问题解析入库 + 问题列表展示
7. **Phase 7：** AI trace 折叠展开 + severity 过滤