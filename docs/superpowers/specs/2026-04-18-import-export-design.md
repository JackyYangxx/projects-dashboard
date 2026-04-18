# 导入导出功能设计

## 概述

在 Dashboard 项目列表页面新增"导入"和"导出"按钮，支持通过 Excel 文件批量导入/导出项目数据。

## 功能入口

- Dashboard 标题栏右侧，与"新增项目"按钮并排
- 按钮顺序：导入 | 导出 | 新增项目
- 图标：Material Symbols `upload_file` / `download`
- 样式：与现有"新增项目"按钮一致，使用渐变背景 + shadow

## 数据结构变更

### 新增 leader 字段

```typescript
// src/types/index.ts
interface Project {
  // ...existing fields
  leader: string  // 项目负责人，独立于 team 数组
}
```

### 导入导出字段对照

| 字段 | Excel 列名 | 说明 |
|---|---|---|
| name | 项目名称 | 必填 |
| productLine | 产品线 | 必填 |
| leader | 负责人 | 必填 |
| status | 状态 | ongoing/completed/paused |
| progress | 项目进展 | 0-100 数字 |
| totalAmount | 总预算 | 数字 |
| usedAmount | 已用预算 | 数字 |
| budgetRate | 预算执行率 | 计算得出，导入时忽略 |

## 导入流程

1. 点击"导入" → 打开 `<input type="file">` 文件选择（accept: `.xlsx,.xls`）
2. 使用 `xlsx` 库解析 Excel 文件
3. 验证表头：必须包含 `项目名称`, `产品线`, `负责人`, `状态`, `项目进展`, `总预算`, `已用预算`
4. 按 `name` 匹配现有项目：
   - 存在 → 覆盖更新（保留 id, createdAt, updatedAt）
   - 不存在 → 新建项目（生成新 id）
5. 状态映射：中文 → 英文（进行中→ongoing, 已完成→completed, 暂停中→paused）
6. 完成后 Toast 提示结果

### 错误处理

- 表头缺失必要字段 → alert 提示缺少字段，终止导入
- status 值不在枚举内 → 跳过该行
- totalAmount/usedAmount 非数字 → 跳过该行
- name 为空 → 跳过该行
- 解析失败 → alert 提示文件格式错误

## 导出流程

1. 点击"导出" → 调用 `xlsx.writeFile` 生成 .xlsx
2. 文件名：`projects_YYYY-MM-DD.xlsx`
3. 导出全部项目（无筛选，按 createdAt DESC）
4. 包含计算列 `预算执行率` = `usedAmount / totalAmount * 100`

## 技术方案

- 使用 `xlsx` (SheetJS) 库处理 Excel
- 客户端直接解析/生成，无需后端
- DAO 层新增批量 upsert 方法

## 组件变更

- `Dashboard.tsx`：新增两个按钮，处理导入/导出逻辑
- `projectDao.ts`：新增 `upsert` 或 `batchUpdate/createBatch` 方法
- `types/index.ts`：Project 接口新增 `leader` 字段
