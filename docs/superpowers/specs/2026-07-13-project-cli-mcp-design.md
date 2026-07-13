# 项目管理看板 CLI 化 — MCP Server 设计

## 概述

将 Electron 应用的核心数据能力（项目 CRUD）暴露为 MCP Server，使外部 AI agent（如 Claude Code）可以直接调用。

- 首批功能：项目 CRUD（`projects:list/get/create/update/delete`）
- 后续扩展：代码评审、MCP 工具代理、agent 规则/记忆、定时任务

## 架构

```
┌─────────────────┐       ┌──────────────────────┐
│  Electron App   │       │   MCP Server (CLI)    │
│  (sql.js WASM)  │       │  (better-sqlite3)     │
└───────┬─────────┘       └──────────┬───────────┘
        │                            │
        │    WAL mode                │
        └────────┬───────────────────┘
                 │
        ┌────────▼──────────┐
        │ projects-dashboard│
        │      .db           │
        └───────────────────┘
```

- **独立 Node.js 进程**，通过 stdio 与 agent 通信（标准 MCP JSON-RPC 协议）
- **共享数据库**：直读 Electron 写入的 SQLite 文件，WAL 模式避免锁冲突
- **better-sqlite3**：原生绑定，性能优于 sql.js，且文件格式完全兼容

## 目录结构

```
cli/
├── server.ts           # MCP Server 入口，stdio 传输
├── db.ts               # 数据库初始化、WAL 模式、路径检测
├── dao/projectDao.ts   # 项目 CRUD，对齐 src/db/projectDao.ts 行为
├── tools/projects.ts   # MCP tool handler 实现
└── index.ts            # 工具注册 + ServerCapabilities 声明
```

## 数据库路径

默认路径（按 OS 自动检测）：
- macOS: `~/Library/Application Support/project-dashboard/projects-dashboard.db`
- Windows: `%APPDATA%/project-dashboard/projects-dashboard.db`
- Linux: `~/.config/project-dashboard/projects-dashboard.db`

可通过 `PROJECTS_DB_PATH` 环境变量覆盖。

## MCP 工具

### `projects:list`

查询项目列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | `"ongoing" \| "completed" \| "paused"` | 否 | 按状态过滤 |
| `productLine` | string | 否 | 按产品线过滤 |
| `search` | string | 否 | 按项目名称模糊搜索 |

返回：`Project[]`

### `projects:get`

获取单个项目。通过 `id` 或 `name` 查找。`id` 优先。

返回：`Project`

### `projects:create`

创建新项目。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 项目名称 |
| `productLine` | string | 是 | 产品线 |
| `leader` | string | 是 | 开发负责人 |
| `status` | string | 否 | 默认 `"paused"` |
| `progress` | number | 否 | 默认 0 |
| `totalAmount` | number | 否 | 默认 0 |
| `usedAmount` | number | 否 | 默认 0 |
| `tags` | string[] | 否 | |
| `projectId` | string | 否 | 自定义项目编号 |
| `repositories` | Repository[] | 否 | 代码仓库列表 |
| `notes` | string | 否 | |

返回：`Project`

### `projects:update`

更新项目字段。只需传 `id` + 要更新的字段。

返回：`Project`

### `projects:delete`

删除项目。返回 `{ success: true }`。

## 数据流

1. Agent（如 Claude Code）通过 MCP 协议发送 `tools/call` 请求
2. MCP Server 的 stdio transport 接收 JSON-RPC 消息
3. 路由到对应 tool handler (`tools/projects.ts`)
4. Handler 调用 `dao/projectDao.ts` 执行 SQL 操作
5. better-sqlite3 直写 SQLite 文件（WAL 模式）
6. 结果序列化为 JSON 返回

## 错误处理

- 数据库未初始化（.db 文件不存在或表不存在）→ 返回明确错误："数据库未初始化，请先启动应用"
- 项目不存在 → 返回 `{ error: "项目不存在" }`
- 必填字段缺失 → 返回 `{ error: "缺少必填字段: name" }`
- SQL 执行错误 → 返回 `{ error: "数据库错误: ..." }`
- 所有错误通过 MCP `isError: true` 标记返回，不抛异常使进程退出

## 与 Electron 的行为对齐

- `create`：自动从 `leader` 生成 `team[0]`，`id` 使用 `crypto.randomUUID()`
- `update`：只更新传入的字段，`updated_at` 自动设为当前时间
- JSON 字段（`tags`, `team`, `scope`, `milestones`, `timeline`, `repositories`, `noteHistory`, `subProgress`）读写时进行 JSON 序列化/反序列化
- 字符串字段为空时存空字符串

## 依赖

新增 `package.json` 依赖：
- `better-sqlite3`：SQLite 原生绑定
- `@modelcontextprotocol/sdk`：MCP 协议 SDK

## 后续扩展

Phase 2 可扩展：
- 代码评审 (`reviews:trigger`, `reviews:list`, `reviews:get`)
- MCP 服务管理 (`mcp:list`, `mcp:add`)
- Agent 规则/记忆 (`rules:list`, `memories:search`)
- 定时任务配置 (`schedule:get`, `schedule:set`)
