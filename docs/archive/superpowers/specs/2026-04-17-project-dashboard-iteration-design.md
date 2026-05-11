# 项目首页与详情页迭代设计方案

**版本：** v1.0
**日期：** 2026-04-17
**状态：** 已确认

---

## 概述

本次迭代对项目首页（Dashboard）和项目详情页（ProjectDetail）进行渐进式增强，主要涉及：无限滚动、行点击跳转、进度条拖拽、预算内联编辑、笔记历史、团队管理、里程碑组件替换富文本编辑器。

---

## 1. Dashboard 无限滚动

### 需求
- 项目列表支持无限向下滚动（预计 70+ 项目）
- 底部显示加载指示器

### 实现方案
- 移除现有分页组件，改用无限滚动
- 初始加载 20 条数据
- 使用 Intersection Observer 监听滚动到底部
- 追加加载下一页数据
- 筛选功能保留（月份/状态），筛选后重置滚动位置

### 变更文件
- `src/components/ProjectTable.tsx`

---

## 2. 行点击跳转只读详情

### 需求
- 点击项目列表任意行（非按钮区域）进入详情页
- 详情页默认以只读模式展示

### 实现方案
- 点击行 → `navigate('/project/:id')`（无编辑态参数）
- View/Edit 按钮保持现有行为不变
- 详情页作为统一入口，查看/编辑模式由内部状态决定

### 变更文件
- `src/components/ProjectTable.tsx`

---

## 3. 进度条拖拽与同步

### 需求
- 主进度条可拖拽
- 4 个子进度条（底层架构/UI-UX设计/工程开发/质量审计）也可独立拖拽
- 拖拽后 Dashboard 列表中同步更新

### 实现方案
- 主进度条：现有拖拽逻辑保留，拖拽释放后调用 `updateProject` 同步
- 子进度条：每个子进度条独立拖拽，更新 `subProgress` 字段
- Zustand store 内存共享，组件通过 selector 订阅自动更新

### 变更文件
- `src/components/ProgressSlider.tsx`

---

## 4. 预算卡片内联编辑

### 需求
- 总金额和已使用支持直接编辑
- 在卡片内点击金额变为输入框

### 实现方案
- 点击金额数字 → 变为输入框，聚焦键盘
- Enter 或点击外部 → 保存
- ESC → 取消，恢复原值
- 编辑时显示保存状态动画

### 变更文件
- `src/pages/ProjectDetail.tsx`

---

## 5. 项目笔记 - 提交/取消 + 手风琴历史

### 需求
- 富文本编辑器有提交和取消按钮
- 取消清空富文本内容
- 提交将内容保存为历史记录
- 历史记录以手风琴形式展示，最新一条默认展开

### 实现方案
- 布局（从上到下）：
  1. 历史手风琴（最新展开）
  2. 富文本编辑器
  3. 取消/提交按钮（底部右侧）
- 取消 → 清空编辑器
- 提交 → 保存到历史记录，清空编辑器，新记录默认展开
- 历史记录数据结构：`{ id, content, createdAt }`

### 数据模型
```typescript
interface NoteHistory {
  id: string
  content: string
  createdAt: string
}
```

### 变更文件
- `src/pages/ProjectDetail.tsx`
- `src/types/index.ts` — 新增 `NoteHistory` 类型
- `src/store/projectStore.ts` — 新增 `noteHistory` 字段

---

## 6. 富文本编辑器

### 需求
- 替换现有的 contentEditable 富文本组件
- 使用成熟的第三方组件库

### 实现方案
- 使用 Tiptap Editor（`@tiptap/react`）
- 功能范围：粗体、斜体、有序/无序列表、链接、图片
- 支持 placeholder
- 安装：`npm install @tiptap/react @tiptap/pm @tiptap/starter-kit`

### 变更文件
- 新增 `src/components/TipTapEditor.tsx`
- 删除 `src/components/RichTextEditor.tsx`
- `src/pages/ProjectDetail.tsx` — 引用新组件

---

## 7. 战略团队 - 添加成员弹窗

### 需求
- 战略团队人员不能编辑
- 添加成员需要弹窗
- 头像随机生成

### 实现方案
- 点击「添加成员」→ 弹出 Modal
- Modal 内容：姓名输入框 + 角色输入框 + DiceBear 头像预览
- 头像使用 DiceBear initials：`https://api.dicebear.com/7.x/initials/svg?seed={name}`
- 填写完成后点击「添加」→ 关闭弹窗，插入成员
- 现有成员只读，无编辑/删除入口

### 变更文件
- `src/pages/ProjectDetail.tsx` — 新增 AddMemberModal
- `src/store/projectStore.ts` — 支持 addTeamMember

---

## 8. 策展范围 → 项目里程碑

### 需求
- 移除策展范围组件
- 替换为项目里程碑

### 实现方案
- 数据模型：
```typescript
interface Milestone {
  id: string
  title: string
  date: string
  status: 'pending' | 'completed' | 'delayed'
  description?: string
}
```
- UI 使用垂直时间线样式，类似现有 Timeline 组件
- 区分完成/进行中/延期三种状态

### 变更文件
- `src/pages/ProjectDetail.tsx` — 替换 Scope 部分为 Milestone
- `src/types/index.ts` — 新增 `Milestone` 类型

---

## 任务拆解

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | Dashboard 无限滚动 | `src/components/ProjectTable.tsx` | - |
| 2 | 行点击跳转只读详情 | `src/components/ProjectTable.tsx` | - |
| 3 | 子进度条可拖拽 | `src/components/ProgressSlider.tsx` | - |
| 4 | 预算卡片内联编辑 | `src/pages/ProjectDetail.tsx` | - |
| 5 | 新增 NoteHistory 类型和 store 扩展 | `src/types/index.ts`, `src/store/projectStore.ts` | - |
| 6 | 笔记历史手风琴 UI | `src/pages/ProjectDetail.tsx` | 5 |
| 7 | 富文本编辑器替换为 Tiptap | `src/components/TipTapEditor.tsx` (new), `src/components/RichTextEditor.tsx` (delete) | - |
| 8 | 提交/取消按钮逻辑 | `src/pages/ProjectDetail.tsx` | 6, 7 |
| 9 | 团队添加成员弹窗 | `src/pages/ProjectDetail.tsx` | - |
| 10 | 策展范围替换为里程碑组件 | `src/pages/ProjectDetail.tsx` | - |

---

## 实现顺序

1. 基础变更（无依赖）：1, 2, 3
2. 类型和 store 扩展：5
3. UI 组件替换：7
4. 详情页组装：4, 6, 8, 9, 10
