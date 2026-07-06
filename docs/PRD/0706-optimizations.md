# 0706 优化需求文档

**日期:** 2026-07-06
**版本:** 1.0

---

## 1. 需求概述

为项目管理系统新增"代码仓编码"（Repository Code）字段，使每个代码仓库可关联一个业务编码标识，便于在多项目场景下快速识别和引用代码仓。

---

## 2. 功能需求

### 2.1 数据模型扩展

- **Repository 接口** (`src/types/index.ts`): 新增可选字段 `code?: string`

### 2.2 项目详情页 - 代码仓信息卡片

**编辑模式：**
- 仓库行新增"编码"输入框（col-span-2），位于 URL 输入框之前
- 支持输入/修改仓库编码，实时自动保存
- 新增仓库时默认 `code` 为空字符串

**只读模式：**
- 仓库编码以 badge 样式显示在仓库 URL 之前
- 样式：`text-xs font-mono text-on-surface-tertiary border border-outline px-1.5 py-0.5 rounded`
- 当 `code` 为空时不显示 badge

**布局调整：**
- 编码 → URL(4) → branch(2) → note(3) → 删除按钮(1)
- 原 projectId badge 从只读仓库行中移除

### 2.3 导航栏标题区

- 移除 `project.projectId` 显示，仅保留 `#id前8位`

### 2.4 项目创建页

- 新增"代码仓编码"输入字段，位于"代码仓"输入框之前
- 占位符："如 REPO-001"
- 创建项目时传入 `repositoryCode`

### 2.5 项目选择器组件

- 仓库列表项中，当 `repo.code` 存在时，在链接前显示编码 badge

### 2.6 种子数据

- 唯一种子项目的仓库添加 `code: 'REPO-001'`
- 测试用例更新：验证单个种子项目、验证仓库编码字段

---

## 3. 非功能性需求

- TypeScript 编译无错误
- 控制台无 error 级别消息
- 存量 E2E 测试全部通过
- 新增 E2E 测试覆盖编码字段的 CRUD 展示
- UI 布局不变形，编码字段在各视图下正常显示

---

## 4. 涉及文件

| 文件 | 操作 |
|------|------|
| `src/types/index.ts` | 修改 - Repository 接口添加 code 字段 |
| `src/pages/ProjectDetail.tsx` | 修改 - 编辑/只读模式下编码字段 UI |
| `src/pages/ProjectForm.tsx` | 修改 - 新增编码输入字段 |
| `src/components/ProjectSelector.tsx` | 修改 - 仓库列表中显示编码 badge |
| `src/data/seedData.ts` | 修改 - 种子数据添加 code |
| `src/data/__tests__/seedData.test.ts` | 修改 - 测试用例更新 |
