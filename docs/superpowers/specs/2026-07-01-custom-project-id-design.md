# Custom Project ID & Ext Fields (自定义项目编号 + 预留扩展字段)

## 概述

1. 新增 `projectId` 字段，允许用户在创建项目时输入自定义项目编号（如 `PRJ-2026-001`），与内部自动生成的 UUID `id` 并存。
2. 新增 5 个预留扩展字段 `ext1`~`ext5`，后续需要时可直接在 UI 修改 label 使用，无需改动数据层。

## 变更范围

### 1. 类型定义 (`src/types/index.ts`)

```typescript
export interface Project {
  id: string           // 内部自动生成 UUID（不变）
  projectId: string    // 用户自定义项目编号
  ext1: string         // 预留扩展字段 1
  ext2: string         // 预留扩展字段 2
  ext3: string         // 预留扩展字段 3
  ext4: string         // 预留扩展字段 4
  ext5: string         // 预留扩展字段 5
  ...
}
```

所有字段均为 `string`，默认为空字符串。

### 2. 数据库 (`src/db/index.ts`)

```sql
project_id TEXT DEFAULT '',
ext1 TEXT DEFAULT '',
ext2 TEXT DEFAULT '',
ext3 TEXT DEFAULT '',
ext4 TEXT DEFAULT '',
ext5 TEXT DEFAULT ''
```

### 3. DAO (`src/db/projectDao.ts`)

- `findAll`, `findById`: 从 `project_id`, `ext1`~`ext5` 列映射到对应字段
- `create`: INSERT 包含所有新字段
- `update`: UPDATE 支持所有新字段
- `upsert`: 包含所有新字段处理

### 4. 创建表单 (`src/pages/ProjectForm.tsx`)

在"项目名称"下方新增输入框：

> 项目编号（可选）
> [ 输入项目编号，如 PRJ-2026-001 ]

### 5. 项目详情页 (`src/pages/ProjectDetail.tsx`)

顶部导航栏右侧显示项目编号（若已填写）：
```
PRJ-2026-001 · #a1b2c3d4
```

### 6. 项目表格 (`src/components/ProjectTable.tsx`)

新增"项目编号"列，位于"项目"和"产品线"之间。

### 7. 导入导出 (`src/pages/Dashboard.tsx`)

- 导入：`projectId` 列为可选导入字段
- 导出：包含 `projectId` 列

### 8. 种子数据 (`src/data/seedData.ts`)

三个 demo 项目各配置一个示例项目编号。预留扩展字段暂时留空。

## 字段规则

- `projectId` 以及 `ext1`~`ext5` 均为可选字段，默认为空字符串
- 不自动生成，完全由用户输入
- `projectId` 不要求唯一性（但推荐用户保持唯一）
- 预留扩展字段当前不在表单显示，后续只需要在 UI 加对应 label 即可启用
