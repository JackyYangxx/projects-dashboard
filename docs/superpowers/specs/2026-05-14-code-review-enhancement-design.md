# AI 辅助代码评审功能增强设计

**日期：** 2026-05-14
**状态：** 已批准

## 背景

当前 CodeReview 页面存在以下问题：
1. 评审设置是单个项目选择，无法批量选择
2. 评审输出显示 AI 执行过程，而非 MR 链接和问题
3. 缺少线上地址供用户复核
4. 缺少问题汇总和报告生成功能

## 需求概述

1. **项目批量选择**：表格形式展示进行中项目，支持全选/手动选择
2. **MR 评审**：通过 MCP 获取 MR 信息（类似 GitHub Merge Request）
3. **结果展示**：按项目 tab 切换，显示 MR 链接 + 问题，而非 AI 执行过程
4. **线上地址**：每个问题必须关联可访问的 MR 链接
5. **报告生成**：汇总所有项目的问题，支持导出 Excel
6. **数据清理**：导出后可删除数据库记录

## 设计方案（方案 A）

### 流程

1. 用户选择多个进行中的项目 → 点击"开始评审"
2. AI 通过 MCP 工具依次获取每个项目的 MR 列表
3. AI 对每个 MR 调用 MCP 获取详情和 diff
4. AI 实时分析代码问题，通过 StreamOutput 显示进度（当前正在评审的 MR）
5. 评审完成后，所有问题存入数据库，显示问题列表

### MCP 配置改为富文本

MCP 配置改为支持直接粘贴 JSON 配置文件的富文本框：

```json
{
  "name": "内部 GitLab MCP",
  "endpoint": "https://git.internal.com/api/mcp",
  "authHeader": "Bearer xxx",
  "tools": ["listMRs", "getMRDetails"]
}
```

用户粘贴完整的 MCP 配置文件，系统解析出：
- `name` - 显示名称
- `endpoint` - MCP 服务地址
- `authHeader` - 认证信息
- `tools` - 可用工具列表

### MCP 工具定义

MCP 服务需要实现以下两个标准工具：

**工具 1: listMRs**
- 输入：仓库地址（repository）、分支（branch，可选）
- 输出：MR 列表 `[{ id, title, url, state, author, createdAt }]`

**工具 2: getMRDetails**
- 输入：MR ID 或完整 MR URL、仓库地址
- 输出：MR 详情 `{ id, title, url, state, diff, filesChanged, commits }`

### 数据库变更

**新增表：mr_review_records**
```sql
CREATE TABLE mr_review_records (
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
```

**issues 字段格式：**
```json
[
  { "severity": "critical|warning|suggestion", "title": "...", "description": "...", "filePath": "...", "lineRange": "..." }
]
```

**新增表：review_reports**
```sql
CREATE TABLE review_reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_ids TEXT NOT NULL,
  total_mr_count INTEGER,
  total_issue_count INTEGER,
  issues_preview TEXT,
  created_at TEXT
)
```

### 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│ [← 返回仪表盘]              AI 代码评审                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ LLM / MCP / Skill 配置                    [收起/展开]       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 评审项目选择                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [全选] 项目名称  产品线   状态   仓库地址               │ │
│ │ [✓]   项目A    营销云    进行中  git.xxx.com/a         │ │
│ │ [ ]   项目B    UI系统    进行中  git.xxx.com/b         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [开始评审]                                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 评审输出                                                     │
│ [项目A (3)] [项目B (5)] [项目C (0)]          [生成报告]      │
│                                                             │
│ 当前评审: 项目A / MR #123 "修复登录bug"                      │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 45%                          │
│                                                             │
│ 已完成: 2/5 MR                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 问题记录                                                     │
│ [全部] [严重] [警告] [建议]          [导出 Excel] [清理数据] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 [项目A] MR #123 - 修复登录bug                        │ │
│ │    git.xxx.com/a MR/123 | 2 个问题                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 组件结构

| 组件 | 职责 |
|------|------|
| `CodeReview` | 主页面，状态管理 |
| `ProjectSelector` | 项目选择表格，支持全选/单选 |
| `ReviewProgress` | 评审进度展示（当前 MR、百分比） |
| `MRReviewTabs` | 按项目 tab 切换，显示各项目问题 |
| `IssueList` | 问题列表，支持筛选和导出 |
| `ReportGenerator` | 生成汇总报告 |
| `MCPConfigPanel` | 富文本 MCP 配置输入 |

### API 变更

**codeReviewStore 新增：**
- `selectedProjectIds: string[]` - 已选项目
- `mrReviewRecords: MRReviewRecord[]` - MR 评审记录
- `currentReviewProgress: { projectId, mrTitle, progress }` - 当前进度
- `selectProject(id)` / `deselectProject(id)` / `selectAll()` / `deselectAll()`
- `startBatchReview()` - 批量评审入口
- `loadMRReviewRecords(projectId)` - 加载 MR 记录
- `exportToExcel()` - 导出 Excel
- `clearReviewData()` - 清理数据

### 评审输出格式

**StreamOutput 显示：**
```
正在获取项目A的 MR 列表...
找到 5 个开放 MR

正在评审 MR #123 "修复登录bug"...
  - 获取 diff 完成
  - AI 分析中...

发现 2 个问题：
  - [critical] 密码明文传输 - src/auth/login.ts:45
  - [warning] 未使用参数化查询 - src/db/user.ts:78

MR #124 "优化性能" 评审完成，无问题

项目A 评审完成: 5 MR, 3 问题
```

**问题记录显示：**
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 [项目A] MR #123 - 修复登录bug                        │
│    https://git.xxx.com/a/MR/123 | 2 个问题              │
│    [查看线上]                                          │
└─────────────────────────────────────────────────────────┘
```

### Excel 导出格式

| 项目名称 | MR链接 | MR标题 | 问题标题 | 严重程度 | 问题描述 | 评审时间 |
|----------|--------|--------|----------|----------|----------|----------|
| 项目A | https://... | 修复登录bug | 密码明文传输 | critical | ... | 2026-05-14 |
| 项目A | https://... | 修复登录bug | 未使用参数化查询 | warning | ... | 2026-05-14 |

### 数据清理流程

1. 用户点击"清理数据"
2. 弹窗确认："导出后再删除，确定要清理吗？"
3. 用户确认 → 导出 Excel → 删除数据库记录
4. 如果未导出，提示先执行导出

## 实施步骤

1. 新增数据库表 `mr_review_records` 和 `review_reports`
2. 新增 MCP 相关 DAO
3. 重构 `ProjectSelector` 为表格选择组件
4. 修改 `startReview` 为 `startBatchReview`
5. 新增 MR 评审的 stream 输出格式
6. 新增 `MRReviewTabs` 组件
7. 新增 Excel 导出功能
8. 新增数据清理功能

## 风险与注意事项

1. MCP 工具需要支持流式输出以显示进度
2. MR diff 可能很大，需要考虑 token 限制
3. 批量评审时间较长，需要显示实时进度
4. Excel 导出需要使用 xlsx 库