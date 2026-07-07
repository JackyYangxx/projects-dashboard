# Code Review Agent 设计文档

**日期**: 2026-07-07
**状态**: 已修正（v3）

## 概述

将现有的一次性代码评审工具升级为 Code Review Agent 系统。Agent 具备记忆积累、规则定制、定时扫描、报告生成、过程可视化等能力。

## 一、架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Electron App                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Renderer Process                          │    │
│  │                                                              │    │
│  │  ┌────────────┐   postMessage   ┌─────────────────────────┐  │    │
│  │  │  UI 线程    │◄──────────────►│  Agent Web Worker       │  │    │
│  │  │            │                │                         │  │    │
│  │  │ CodeReview │  progress/     │  编排引擎 (Pipeline)     │  │    │
│  │  │ 配置面板   │  results/      │  规则引擎 (RuleEngine)   │  │    │
│  │  │ 规则管理   │  control       │  记忆管理 (MemoryMgr)    │  │    │
│  │  │ 报告查看   │                │  Token 管理 (TokenBudget) │  │    │
│  │  └────────────┘                │  diff 解析 (DiffParser)   │  │    │
│  │        │                       │  LLM 调用 (fetch)        │  │    │
│  │        │                       └─────────────────────────┘  │    │
│  │        │                                  │                  │    │
│  │        │                          (通过主线程代理)            │    │
│  │        ▼                                  ▼                  │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │              sql.js (SQLite WASM)                     │   │    │
│  │  │  已有表 + agent_rules / agent_memories /              │   │    │
│  │  │  review_tasks / agent_reports                        │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│        │ IPC (contextBridge)                                         │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                     Main Process                              │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │    │
│  │  │  Scheduler   │  │  MCP Bridge  │  │  Tray Manager      │  │    │
│  │  │  (node-cron) │  │  (HTTP/RPC)  │  │  (窗口隐藏/恢复)    │  │    │
│  │  └──────┬───────┘  └──────┬───────┘  └────────────────────┘  │    │
│  │         │                 │                                   │    │
│  │         │  定时触发        │  MCP 服务器通信                    │    │
│  │         ▼                 ▼                                   │    │
│  │  ┌──────────────────────────────────────────────────────┐    │    │
│  │  │  IPC Handlers (agent:schedule-tick, mcp:invoke, ...) │    │    │
│  │  └──────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  数据文件: {userData}/projects-dashboard.db                          │
└──────────────────────────────────────────────────────────────────────┘
```

### 关键架构决策

**Agent 运行在 Renderer 进程的 Web Worker 中**，而非 Node.js Worker Thread。

原因：sql.js 编译为 WASM，依赖浏览器环境的 WASM 运行时。Node.js Worker Thread 无法加载 WebAssembly 模块。Web Worker 处于渲染进程内，可以：
1. 通过 `postMessage` 与 UI 线程通信
2. 通过 UI 线程代理访问 sql.js（UI 线程持有 DB 连接，Worker 发消息请求 DB 操作）
3. 不阻塞 UI（独立线程，类似 Worker Thread 的隔离效果）
4. Phase 2 引入 Rust sidecar 时，Rust 二进制运行在主进程侧，Web Worker 通过 IPC 与之通信

**MCP 调用路径**：Web Worker 直接通过 `fetch()` 调用 MCP Server（MCP 本质是 HTTP/JSON-RPC）。Worker 已具备完整 `fetch` 能力，无需绕行主进程。仅在需要主进程特有功能（如文件系统访问）时通过 IPC 代理。

**Worker 生命周期**：Web Worker 由 `agentWorkerManager.ts` 单例管理，在 `main.tsx` 应用启动时与 `initDatabase()` 一同初始化。Worker 生命周期绑定到渲染进程，不绑定到任何 React 组件。用户导航离开 `/code-review` 页面时 Worker 继续运行，返回时 UI 通过 Zustand store 重新订阅 Worker 状态。

### 部署模式

混合模式：
- 定时任务在主进程 `node-cron` 中触发，通过 IPC 通知渲染进程的 Agent Web Worker 开始工作
- 关闭窗口后应用隐藏到托盘保持后台运行。Windows 上首次关闭窗口时弹出确认对话框，用户可选择"退出"或"最小化到托盘"；macOS 遵循系统惯例默认隐藏
- 托盘菜单提供"显示主窗口"和"退出"选项

### 托盘菜单

```
[管理看板]
─────────────
 显示主窗口
 下次扫描: 2026-07-08 09:00
 立即扫描
─────────────
 退出
```

---

## 二、进程间通信设计

### Web Worker ↔ UI 线程 (postMessage)

Worker 和 UI 线程之间的消息使用 discriminated union，保证类型安全：

```typescript
// UI → Worker
type WorkerInMessage =
  | { type: 'agent:start'; taskId: string; projectId: string; mrIds: string[] }
  | { type: 'agent:control'; action: 'pause' | 'resume' | 'skip' | 'cancel' }
  | { type: 'agent:rule-toggle'; ruleId: string; enabled: boolean }
  | { type: 'agent:db-response'; requestId: string; result: unknown }
  | { type: 'agent:db-batch-done'; requestId: string; error?: string }

// Worker → UI
type WorkerOutMessage =
  | { type: 'agent:progress'; taskId: string; phase: string; percent: number; currentFile: string; foundCount: number }
  | { type: 'agent:issue-found'; taskId: string; issue: ReviewIssue }
  | { type: 'agent:phase-change'; taskId: string; fromPhase: string; toPhase: string }
  | { type: 'agent:completed'; taskId: string; summary: TaskSummary }
  | { type: 'agent:error'; taskId: string; error: string }

// DB 操作：语义化 API，而非透传原始 SQL
  | { type: 'agent:db-query'; requestId: string; sql: string; params?: unknown[] }
  | { type: 'agent:db-batch'; requestId: string; statements: Array<{ sql: string; params?: unknown[] }> }
  | { type: 'agent:db-search-memories'; requestId: string; projectId: string; filePatterns: string[]; limit: number }
  | { type: 'agent:db-write-memory'; requestId: string; memory: Omit<AgentMemory, 'id' | 'createdAt'> }
  | { type: 'agent:db-task-create'; requestId: string; task: Omit<ReviewTask, 'id'> }
  | { type: 'agent:db-task-update'; requestId: string; id: string; updates: Partial<ReviewTask> }
```

**事务一致性**：`agent:db-batch` 将多条 SQL 语句打包为一个 `BEGIN...COMMIT` 事务在 UI 线程上执行。任务创建（`review_task` + N 条 `mr_review_records`）通过单次 `agent:db-batch` 保证原子性。Worker 崩溃时不会产生孤儿记录。

**DB 层职责**：SQL 知识完全封装在 UI 线程的 DAO 层（`agentDao.ts`），Worker 通过语义化消息（如 `agent:db-search-memories`）操作数据，不感知表结构。

### UI 线程 ↔ Main Process (IPC via contextBridge)

在现有 `electronAPI` 基础上扩展：

| Channel | 方向 | Payload |
|---------|------|---------|
| `agent:schedule-update` | Main → Renderer | `{ cronExpression, nextRun }` |
| `agent:schedule-tick` | Main → Renderer | `{ triggerTime }` — 定时触发信号 |
| `mcp:invoke` | Renderer → Main | `{ serverId, toolName, params }` → 已有 |
| `mcp:invoke-result` | Main → Renderer | `{ result }` → 已有 |
| `db:persist` | Renderer → Main | `{ buffer }` → 已有（sql.js 持久化） |

### Main Process 新增

- `Scheduler` 模块：管理 `node-cron` 定时任务，触发时发送 `agent:schedule-tick` 到渲染进程
- `window-all-closed` 改为隐藏窗口而非退出（macOS 已如此，需将 darwin-only 逻辑扩展到全平台）

---

## 三、数据库

### 存储路径

使用 Electron `app.getPath('userData')` + `projects-dashboard.db`（与现有代码一致）：

```
macOS:   ~/Library/Application Support/projects-dashboard/projects-dashboard.db
Windows: %APPDATA%/projects-dashboard/projects-dashboard.db
```

### 已有表（不变）

```
projects, team_members, scope_items, progress_records,
mcp_services, skills, llm_config, code_reviews,
mr_review_records, review_reports
```

### 新增表

```sql
-- 规则模板
CREATE TABLE IF NOT EXISTS agent_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,           -- 规则详细说明（注入系统提示）
  examples_good TEXT,              -- JSON: string[]
  examples_bad TEXT,               -- JSON: string[]
  severity TEXT NOT NULL DEFAULT 'warning',  -- critical | warning | suggestion
  scope TEXT NOT NULL DEFAULT 'global',      -- global | project
  project_id TEXT,                 -- scope=project 时关联项目
  file_patterns TEXT,              -- JSON: string[] glob 模式
  enabled INTEGER NOT NULL DEFAULT 1,
  is_builtin INTEGER NOT NULL DEFAULT 0,  -- 内置规则不可删除，只可开关
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 长期记忆/知识条目
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,              -- pattern | project | rule_link | fix
  category TEXT,                   -- 问题分类（如 "React Hooks", "XSS"）
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  project_id TEXT,
  file_pattern TEXT,               -- 关联的文件 glob
  source_review_id TEXT,           -- 来源评审任务 ID
  occurrence_count INTEGER DEFAULT 1,
  confidence REAL DEFAULT 0.5,     -- 0-1 置信度
  last_accessed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 评审任务（每次触发为一个任务，含多个 MR）
CREATE TABLE IF NOT EXISTS review_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,      -- manual | scheduled
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|preparing|analyzing|locating|reflecting|completed|paused|failed|cancelled
  phase TEXT,                      -- 当前四阶段
  progress REAL DEFAULT 0,         -- 0-1
  total_mr_count INTEGER DEFAULT 0,
  completed_mr_count INTEGER DEFAULT 0,
  total_issue_count INTEGER DEFAULT 0,
  summary TEXT,                    -- JSON: 完成后的汇总
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 评审报告（手动生成）
CREATE TABLE IF NOT EXISTS agent_reports (
  id TEXT PRIMARY KEY,
  time_range_start TEXT NOT NULL,
  time_range_end TEXT NOT NULL,
  project_ids TEXT,                -- JSON: string[], 空=全部
  summary TEXT,
  stats_json TEXT,                 -- JSON: 统计数据
  top_issues_json TEXT,            -- JSON: Top 问题列表
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

> **命名说明**：使用 `agent_reports` 而非 `review_reports`，避免与已有 `review_reports` 表冲突。已有 `review_reports` 表是早期导出快照表，保持不变。

### review_tasks 状态机

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │ start
                         ▼
                    ┌───────────┐
              ┌────►│ preparing │
              │     └─────┬─────┘
              │           │
              │           ▼
              │     ┌───────────┐
              │     │ analyzing │◄────┐
              │     └─────┬─────┘     │
              │           │           │ resume
              │           ▼           │
     pause    │     ┌───────────┐     │
    ┌─────────┼────►│  paused   │─────┘
    │         │     └───────────┘
    │         │           │ cancel
    │         │           ▼
    │         │     ┌───────────┐
    │         │     │ cancelled │ (终态)
    │         │     └───────────┘
    │         │
    │         │           ▼
    │         │     ┌───────────┐
    │         │     │ locating  │
    │         │     └─────┬─────┘
    │         │           │
    │         │           ▼
    │         │     ┌───────────┐
    │         │     │reflecting │
    │         │     └─────┬─────┘
    │         │           │
    │         │           ▼
    │         │     ┌───────────┐     ┌───────┐
    │         └────►│ completed │     │ failed│ (终态)
    │               └───────────┘     └───────┘
    │                                         ▲
    └─────────────────────────────────────────┘
                  cancel / error
```

### MRReviewRecord 与 review_tasks 的关系

- `review_tasks` 是一次评审**任务**（如"对项目A定时扫描"），可以包含多个 MR
- `mr_review_records` 是单个 MR 的**评审结果**（已有表，保持不变）
- 关系：`review_tasks.id` ──1:N── `mr_review_records`（通过 `mr_review_records` 中新增 `task_id` 字段关联）

### 迁移策略

1. `mr_review_records` 新增 `task_id TEXT` 列（ALTER TABLE ADD COLUMN，SQLite 支持）
2. 新增 4 张表 `agent_rules`、`agent_memories`、`review_tasks`、`agent_reports`
3. 内置 16 条预设规则 INSERT 到 `agent_rules`（`is_builtin=1`）
4. 旧 `review_reports` 表保留不动，新功能使用 `agent_reports`
5. 现有 `codeReviewDao.ts` 不变，新增 `agentDao.ts` 处理新表 CRUD
6. 现有 `codeReviewStore.ts` 新增 Agent 相关 state，不删除已有评审逻辑（保持向后兼容）

---

## 四、Agent 评审流水线

### Phase 1 流水线（全 TS）

```
输入: project_id + mr_ids (定时或手动触发)
      │
      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ 1.准备阶段│───►│ 2.分析阶段│───►│ 3.定位阶段│───►│4.反思阶段│
│ (TS)     │    │ (LLM)    │    │ (TS)     │    │ (LLM+TS)│
│          │    │          │    │          │    │         │
│ 获取diff │    │ 文件分组 │    │ 行号定位 │    │ 误报过滤 │
│ 文件筛选 │    │ 规则匹配 │    │ 代码关联 │    │ 去重合并 │
│ 记忆检索 │    │ 并发评审 │    │          │    │ 记忆写入 │
│ Token预算│    │          │    │          │    │         │
└──────────┘    └──────────┘    └──────────┘    └─────────┘
      │              │               │               │
      └── 确定性代码 ─┘── LLM 推理 ──┘── 确定性代码 ──┘
```

核心原则：确定性代码做所有能用代码做的事，LLM 只做需要理解推理的事。

### Pipeline 阶段接口

各阶段实现统一接口，可独立测试和替换：

```typescript
interface PipelineContext {
  taskId: string
  projectId: string
  mrs: MRToReview[]
  diffFiles: DiffFile[]
  relevantMemories: AgentMemory[]
  ruleMatches: RuleMatch[]
  rawIssues: RawIssue[]
  resolvedIssues: ReviewIssue[]
}

interface PipelineStage {
  name: string
  execute(ctx: PipelineContext, worker: AgentWorker): Promise<PipelineContext>
}
```

Phase 2 引入 Rust sidecar 时，逐个替换 stage 的 `execute` 实现即可，编排逻辑不变。

### 现有代码兼容

旧版 `startBatchReview`（`codeReviewStore.ts` lines 234-441）在 Agent 稳定后逐步废弃，改为通过 `agentWorkerManager` 委托给 Agent Web Worker。过渡期内两者共存，旧版仍可用于简单的一对一评审。

### 各阶段详解

**阶段 1：准备（TS，确定性）**
1. 通过 MCP 获取 MR diff 数据（Web Worker 内 `fetch()` 直接调用 MCP Server 的 JSON-RPC 接口）
2. 文件筛选：根据规则 `file_patterns` 过滤不需要审查的文件（如 `*.json`、`*.lock`、`dist/**`）
3. Token 预算：估算 diff 总 token 数，判断是否需要分治/降级
4. 记忆检索：用项目名 + 文件路径从 `agent_memories` 检索相关历史问题
5. 输出：`{ diffFiles[], relevantMemories[], tokenPlan }`

**阶段 2：分析（LLM，并发）**
1. 文件分组：同目录下的文件归为一组（Phase 1 简单策略；Phase 2 可通过 tree-sitter 做 import-graph 分析）
2. 规则注入：组内文件匹配到的规则 + 正反面案例 → 系统提示
3. 并发评审：每组独立发给 LLM（通过 `LLMProvider` 接口），并行处理
4. LLM 输出结构化 JSON：`[{ severity, title, description, filePath, codeSnippet, suggestion }]`
5. 输出：`{ rawIssues[] }` — 注意此时 `codeSnippet` 是 LLM 提供的代码片段，行号可能不准

**阶段 3：定位（TS，确定性）**
1. 三层定位策略（借鉴阿里 OCR）：
   - Tier 1: Hunk 文本匹配 —— 用 LLM 提供的 codeSnippet 在 diff hunk 中精确匹配
   - Tier 2: 全文件扫描 —— T1 失败时逐行扫描完整文件
   - Tier 3: 模糊匹配 —— T2 失败时用编辑距离匹配最接近的行
2. 输出：每个 issue 锚定到具体 `lineNumber`

**阶段 4：反思（LLM + TS）**
1. LLM 自检：将锚定后的 issues 发回 LLM，要求判断是否为误报（false positive）
2. TS 去重合并：同一文件、同一行的相似问题合并
3. 长期记忆写入：新发现的问题模式写入 `agent_memories`（触发条件见记忆系统）
4. 输出：最终 `ReviewIssue[]` + 写入 `mr_review_records`

### 并发控制

**单 Agent 实例**：同一时刻只允许一个评审任务运行。

```
schedule tick 到达
  ├── 有任务在运行 → 跳过，在日志中记录 "上次扫描仍在进行"
  └── 无任务在运行 → 启动新 Agent Web Worker
```

手动触发同理：
```
用户点击"开始评审"
  ├── 有任务在运行 → 弹窗提示 "评审正在进行中，是否取消并重新开始？"
  └── 无任务在运行 → 创建 review_task → 启动 Agent Web Worker
```

### 错误恢复

- Agent Web Worker 崩溃 → `worker.onerror` 捕获 → `review_tasks.status = 'failed'` → 记录 `error_message` → UI 显示"评审异常中断，请重试"
- 单 MR 评审失败 → 不影响其他 MR，`mr_review_records.status = 'failed'` → 任务继续，最终报告中标记 "1 个 MR 评审失败"
- LLM 调用超时 → 重试 1 次 → 仍失败则标记该组为失败

---

### LLM Provider 抽象

LLM 调用通过统一接口，隔离不同厂商的 API 差异：

```typescript
interface ChatParams {
  systemPrompt: string
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
}

interface ChatResponse {
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

interface LLMProvider {
  chat(params: ChatParams): Promise<ChatResponse>
  estimateTokens(text: string): number
}

class OpenAIProvider implements LLMProvider { /* fetch + OpenAI 格式 */ }
class AnthropicProvider implements LLMProvider { /* fetch + Anthropic 格式 */ }
class MockProvider implements LLMProvider { /* 测试用：正则匹配返回固定格式 */ }
```

- Provider 根据 `llm_config.api_type` 自动选择（`openai` / `anthropic`）
- `MockProvider` 直接用于无 LLM 环境的功能验证和单元测试
- Phase 2 引入 `tiktoken-rs` 时，只需替换 `estimateTokens` 实现，不影响管道代码

---

## 五、Token 预算与上下文管理

### 预算模型

```
MaxTokens (模型上限, 如 200K)
├── Reserved: 系统提示 (~0.5K)
├── Reserved: 规则 + 正反面案例 (~2K)
├── Reserved: 记忆检索结果 (~2K)
├── Reserved: 输出预留 (~4K)
└── Available: 实际可用的 diff 空间

Available = MaxTokens - 8.5K
```

### 超限处理策略

| 策略 | 触发条件 | 做法 |
|------|----------|------|
| 文件分治 | diff 总量 > Available | 按文件分组，每组独立发给 LLM（并发），反思阶段合并 |
| 大文件截断 | 单个文件 > Available × 80% | 标记为"过大跳过"，报告中提示，只做 grep 规则检查 |
| 记忆压缩 | 单轮对话超 60% MaxTokens | 对中间结果做结构化摘要（三区模型） |
| 降级审查 | 估算 token > Available × 2 | 只审查匹配了 include 规则的核心文件，其余跳过（阈值可在设置中调整） |

### 三区内存模型（单组 LLM 对话）

| 区域 | 内容 | 压缩策略 |
|------|------|----------|
| Frozen Zone | 系统提示 + 规则 | 永不压缩 |
| Compress Zone | 中间对话历史 | 超 60% MaxTokens 时异步压缩为结构化 XML |
| Active Zone | 最近 3 轮对话 | 保持原始形式 |

### Token 估算（TS 实现）

使用简单的字符级估算（Phase 1 无需 tiktoken 精度）：
- 英文：1 token ≈ 4 字符
- 中文：1 token ≈ 1.5 字符
- 代码：1 token ≈ 3 字符
- 实际消耗以 LLM 返回的 `usage` 为准，估算仅用于分流决策

---

## 六、规则系统

### 规则模板结构

```json
{
  "name": "避免 dangerouslySetInnerHTML",
  "description": "直接使用 dangerouslySetInnerHTML 或 innerHTML 赋值可能导致 XSS 攻击",
  "scope": "global",
  "filePatterns": ["*.tsx", "*.jsx"],
  "matchPatterns": ["dangerouslySetInnerHTML", "innerHTML\\s*="],
  "positiveExamples": [
    "// ✅ 使用 React 安全渲染\n<div>{userContent}</div>",
    "// ✅ 如必须使用 HTML，使用 DOMPurify\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />"
  ],
  "negativeExamples": [
    "// ❌ 直接设置 innerHTML\ndocument.getElementById('content').innerHTML = userInput;",
    "// ❌ 未净化的 dangerouslySetInnerHTML\n<div dangerouslySetInnerHTML={{ __html: userInput }} />"
  ],
  "severity": "critical",
  "enabled": true
}
```

### 两层优先级

项目级规则覆盖全局级同名规则，first-match-wins。

### 规则匹配引擎

Phase 1 使用**双模式匹配**：

| 匹配方式 | 适用场景 | 实现 |
|----------|----------|------|
| **文件匹配** | 先判断文件是否需要审查 | `filePatterns` 用 glob 匹配文件路径 |
| **内容匹配** | 在 diff 中检测违规代码 | `matchPatterns` 用正则匹配 diff 行内容 |

匹配流程：
1. 文件路径命中 `filePatterns` → 该文件纳入审查
2. diff 行内容命中 `matchPatterns` → 标记该行为可疑，注入 LLM 提示
3. LLM 做最终判断（区分真违规 vs 假阳性，如 sanitize 过的 innerHTML 是安全的）

> 注意：`matchPatterns` 仅做**初筛标记**，不会直接报 issue。最终判定由 LLM 完成。

### 预设规则（前端场景，16 条）

| 类别 | 规则 | matchPatterns | 严重度 |
|------|------|---------------|--------|
| 通用 | 避免 any 类型 | `:\s*any\b` | warning |
| 通用 | 避免 dangerouslySetInnerHTML/innerHTML | `dangerouslySetInnerHTML\|\.innerHTML\s*=` | critical |
| 通用 | 避免 eval()/new Function() | `eval\(.*\)\|new Function\(` | critical |
| 通用 | useEffect 缺少依赖项或未清理 | （LLM 语义判断） | warning |
| 通用 | 循环/条件中调用 Hooks | （LLM 语义判断） | critical |
| PC Web | 大列表未使用虚拟滚动 | `.map\(.*=>` (大量数据场景) | suggestion |
| PC Web | 图片未设置懒加载 | `<img(?!.*loading=)` | suggestion |
| PC Web | 未处理接口竞态 | （LLM 语义判断：fetch 无 abort） | warning |
| 大屏 | 未使用 ResizeObserver | （LLM 语义判断） | warning |
| 大屏 | 动画帧性能隐患 | `requestAnimationFrame` (嵌套场景) | suggestion |
| 大屏 | 图表未按需加载 | `import.*echarts\|import.*chart` | suggestion |
| 移动 | 未使用 touch 事件兼容 | `onClick(?!.*onTouch)` | warning |
| 移动 | viewport 设置不当 | `<meta.*viewport` (缺少 content) | warning |
| 移动 | 点击区域 < 44×44px | （LLM 语义判断：CSS 尺寸） | suggestion |
| 安全 | 敏感数据存 localStorage | `localStorage\.setItem` | warning |
| 安全 | 第三方脚本未 SRI | `<script.*src=(?!.*integrity)` | suggestion |

内置规则 `is_builtin=1`，用户可开关不可删除。自定义规则可 CRUD。

---

## 七、记忆系统

### 双层结构

**短期上下文管理**：三区模型 + 自动压缩，保证单次评审不超 Token 限制。

**长期知识库**：结构化记忆条目，跨会话积累，存储在 `agent_memories` 表。

### 记忆条目类型

| 类型 | 用途 | 示例 |
|------|------|------|
| pattern | 问题模式 | "useEffect 缺 deps 在 Form.tsx 中反复出现" |
| project | 项目特征 | "项目A 使用 React 18 + TypeScript，无 SSR" |
| rule_link | 规则关联 | "规则 X 在项目中命中率最高，主要出现在 utils/ 目录" |
| fix | 修复方案 | "useEffect cleanup 的标准写法：return () => { ... }" |

### 检索与写入

- **评审前检索**：用 `project_id` + 文件路径 glob 匹配相关记忆，按 `confidence × occurrence_count` 排序，取前 5 条注入系统提示
- **评审后写入**：
  - 同类型 issue 出现 ≥ 3 次（同一 project，同一 `category`）→ 自动生成 `pattern` 记忆
  - 手动标记的"值得记住"的问题 → 直接写入记忆
- **去重合并**：写入前查询相似记忆，若已存在 → `occurrence_count += 1`，更新 `confidence`，不重复插入

### 淘汰策略

| 策略 | 触发条件 |
|------|----------|
| 访问时间淘汰 | `last_accessed_at` 超过 90 天未访问 → 自动删除 |
| 数量上限 | 总记忆数 > 1000 → 淘汰 `confidence × occurrence_count` 最低的 10% |
| 低质量清理 | `confidence < 0.3` 且 `occurrence_count = 1` → 标记待审核（不自动删除） |

### 存储位置

数据存在渲染进程 sql.js 的 `agent_memories` 表中，与现有业务数据同一文件：

```
macOS:   ~/Library/Application Support/projects-dashboard/projects-dashboard.db
Windows: %APPDATA%/projects-dashboard/projects-dashboard.db
```

---

## 八、总结报告

### 触发方式

手动触发：CodeReview 页面 → "生成报告"按钮 → 弹窗选择：
- 时间范围：最近一周 / 最近一月 / 自定义日期区间
- 项目范围：全部 / 指定项目
- → 即时生成

### 报告结构

1. **概览** — 总问题数 / 按严重度分 / 趋势折线图（时间维度）
2. **严重度分布** — critical / warning / suggestion 饼图 + 数量变化
3. **规则分布 Top 10** — 命中次数最多的规则 / 增长最快的规则
4. **项目分布** — 各项目问题数、严重问题占比对比
5. **高频问题模式** — 来自 `agent_memories` 的反复出现模式（`occurrence_count` 排序）
6. **建议** — 基于趋势的改进方向（LLM 生成）

### 数据来源

- `mr_review_records`：评审结果（issues 字段为 JSON）
- `review_tasks`：任务维度统计
- `agent_memories`：高频问题模式

### 导出

支持导出 Excel（复用已有 `src/utils/excel.ts`），sheet 结构：
- Sheet 1 "概览"：核心数字
- Sheet 2 "问题明细"：所有 issue 平铺，含项目、文件、严重度、规则、代码片段
- Sheet 3 "趋势"：按日/周的问题分布

---

## 九、评审过程可视化 & 干预

### 实时状态展示

Agent Web Worker 通过 `agent:progress` 和 `agent:phase-change` 消息实时推送状态，UI 展示：

```
┌────────────────────────────────────────────────┐
│  🔄 正在评审: 项目A / MR #42                    │
│                                                │
│  阶段: [准备] → [分析] → 定位 → 反思           │
│           ████████░░░░░░░░░░░░  35%            │
│                                                │
│  当前文件: src/components/Form.tsx              │
│  匹配规则: 避免 any 类型                        │
│  已发现: 3 个问题                               │
│  ⏱ 已用: 2m 30s                                │
│                                                │
│  [暂停] [跳过当前MR] [取消]                     │
└────────────────────────────────────────────────┘
```

### 可干预操作

| 操作 | 效果 |
|------|------|
| 暂停 | Agent 完成当前 LLM 调用后挂起，保留状态，可继续 |
| 继续 | 从暂停点恢复 |
| 跳过当前 MR | 停止当前 MR 的评审，已发现的 issues 保留，进入下一 MR |
| 取消 | 终止整个任务，已完成的 MR 结果保留，状态设为 `cancelled` |
| 中途开关规则 | 发送 `agent:rule-toggle` → Worker 中实时更新规则列表，当前 MR 之后生效 |

### 历史任务列表

页面底部展示 `review_tasks` 列表，显示：
- 触发时间、触发方式（手动/定时）
- 状态标签（彩色：进行中=蓝，完成=绿，失败=红，取消=灰）
- MR 数量 / 发现 issue 数量
- 点击可展开查看详情

---

## 十、触发机制

### 定时扫描

- 配置：设置页面新增"定时扫描"配置项（cron 表达式 + 快捷选项）
- 存储：cron 配置存在主进程 `electron-store` 中（与已有的 `secureStore` 并列），主进程直接读取以初始化 `node-cron`；渲染进程通过 IPC 读写
- 默认：每个工作日 9:00 扫描一次
- 实现：`node-cron` 在主进程运行，触发时通过 IPC 发送 `agent:schedule-tick` 到渲染进程
- 扫描内容：Worker 通过 MCP `listMRs` 获取所有"未合入"状态的 MR，逐个评审

### 手动触发

| 方式 | 入口 | 流程 |
|------|------|------|
| 批量评审 | CodeReview 页面 → "开始评审"按钮 | 选择项目 → 获取未合入 MR → 创建 review_task → 启动 Agent |
| 单项目评审 | ProjectDetail 页面 → "代码评审"按钮 | 单独评审该项目 |

### 并发控制（见第四章）

---

## 十一、技术选型

| 组件 | 选型 | 说明 |
|------|------|------|
| Agent 运行时 | Web Worker (Renderer) | 不阻塞 UI，可访问 sql.js 代理 |
| 确定性操作 | TypeScript | Phase 1 全 TS；Phase 2 引入 Rust sidecar |
| LLM 调用 | `fetch()` (已有) | OpenAI + Anthropic 兼容 |
| 定时调度 | `node-cron` (Main Process, 新增依赖) | cron 配置存在 `electron-store` 中，主进程直接读取 |
| 定时配置存储 | `electron-store` (已有) | 主进程侧存储 cron 表达式，渲染进程通过 IPC 读写 |
| 数据库 | sql.js (SQLite WASM, 已有) | 零额外依赖，Web Worker 通过 UI 线程代理访问 |
| MCP 集成 | `fetch()` 直连 MCP Server JSON-RPC | Web Worker 内直接 HTTP 调用；`window.mcpAPI` 保留用于 UI 线程配置验证 |
| 状态管理 | Zustand store (已有) | 新增 Agent 相关 state |

### Phase 2 展望：Rust Sidecar

Phase 2 将性能敏感操作迁移到 Rust 编译的二进制 sidecar：

- diff 解析（tree-sitter AST 替代正则）
- token 精确计数（tiktoken-rs）
- 记忆检索（tantivy 全文索引）
- 行号定位加速

Rust sidecar 运行在主进程侧，可选两种通信方式：
- 方式 A（低延迟）：Rust sidecar 暴露本地 HTTP 端点，Web Worker 直接 `fetch()` 调用（1 跳）
- 方式 B（安全）：通过 stdio JSON-RPC → Main Process IPC 代理（4 跳，但可加权限控制）

推荐方式 A，Main Process 仅负责 sidecar 进程的启动和生命周期管理。UI/Agent 逻辑不需大改。

---

## 十二、测试策略

| 层级 | 内容 |
|------|------|
| 单元测试 | diff 解析、规则匹配引擎、token 估算、三区压缩、记忆去重 |
| 集成测试 | Agent 流水线各阶段（使用 mock LLM 响应）、DB CRUD |
| E2E | 手动触发评审、定时触发模拟、暂停/恢复/取消流程、报告生成 |
| Mock LLM | 规则匹配引擎内置一个 "mock 模式"，用正则直接匹配预设规则，返回固定格式 issues，用于无 LLM 环境下的功能验证 |

---

## 十三、安全注意事项

- LLM API Key 已存储在 `llm_config.api_key`，现有代码已存储。后续考虑使用 Electron `safeStorage` API 加密
- MCP `auth_header` 同样存储，同上处理
- 记忆库数据为本地文件，会话内可见性由应用管理
