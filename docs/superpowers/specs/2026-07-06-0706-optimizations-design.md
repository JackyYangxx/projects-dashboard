# 0706 优化方案设计文档

**日期:** 2026-07-06
**Spec:** `docs/PRD/0706-optimizations.md`

---

## 设计概述

为 Repository 数据模型新增 `code` 可选字段，在项目详情页（编辑/只读）、项目创建页、项目选择器中展示和编辑该字段。

---

## 数据模型变更

```typescript
// src/types/index.ts - Repository 接口
export interface Repository {
  id: string
  code?: string  // 新增：代码仓业务编码
  url: string
  branch: string
  note?: string
}
```

---

## UI 设计

### 项目详情页 - 编辑模式

代码仓编辑行布局：`编码(2) | URL(4) | branch(2) | note(3) | 删除(1)`

- 编码输入框：placeholder="编码"，font-mono，实时保存

### 项目详情页 - 只读模式

- 编码以 badge 样式展示：圆角边框 + mono 字体 + tertiary 色
- code 为空时不展示 badge
- 移除原有的 projectId badge（该 badge 错误地显示了项目的 projectId 而非仓库编码）

### 项目详情页 - 导航栏

- 移除 projectId 显示，仅保留 `#id前8位`

### 项目创建页

- 新增"代码仓编码"输入框，位于"代码仓"之前
- placeholder: "如 REPO-001"

### 项目选择器

- 仓库列表中，当 repo.code 存在时，在链接前显示编码 badge

---

## 种子数据

唯一项目 PRJ-2026-001 的仓库添加 `code: 'REPO-001'`

---

## 测试策略

### 单元测试
- seedData 测试验证：单种子项目、仓库编码字段存在

### E2E 测试（新增，不修改存量）
- TC-001: 项目详情页只读模式下显示仓库编码 badge
- TC-002: 项目详情页编辑模式下可输入/修改仓库编码
- TC-003: 项目创建页新增仓库编码字段
- TC-004: 项目选择器显示仓库编码 badge
- TC-005: 存量 E2E 测试全部通过，控制台无 error
