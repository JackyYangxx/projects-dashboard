# 预算来源功能设计

**日期：** 2026-05-16
**状态：** 已批准

## 概述

在项目详情页的预算区域，支持编辑状态下配置多个预算来源，每个来源有 label 和金额。执行比例 = 所有来源已使用金额之和 / 所有来源总额之和 × 100%。

## 数据模型

### budget_sources 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 (UUID) |
| project_id | TEXT | 项目ID（外键） |
| label | TEXT | 来源名称 |
| amount | REAL | 来源总额 |
| used_amount | REAL | 已使用金额 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### Project 表调整

- `totalAmount` 和 `usedAmount` 保留作为缓存字段
- 页面计算时从 budget_sources 汇总，不直接从 Project 读取

## 页面交互

### 编辑状态

- 预算卡片显示来源列表
- 每项显示：label 输入框、amount 输入框、used_amount 输入框
- 每项有删除按钮（至少保留一项）
- 底部显示：总额 = sum(amount)，已用 = sum(used_amount)，执行率
- 有"新增来源"按钮

### 只读状态

- 显示来源列表：label + 已使用金额
- 执行比例 = sum(used_amount) / sum(amount) × 100%

## 实现计划

1. 创建 budgetSourcesDao（CRUD）
2. 修改 ProjectDetail 页面预算区域 UI
3. 实现来源的新增/编辑/删除逻辑
4. 更新执行率计算逻辑
5. 数据库迁移（添加 budget_sources 表）

## 技术要点

- usedAmount 自动 = amount × 执行率（用户编辑 usedAmount 时需反算执行率？不，用户直接编辑 usedAmount）
- 新增来源时 amount 和 usedAmount 默认 0
- 删除来源时从数据库移除记录
- 编辑 label/amount/usedAmount 时实时更新数据库