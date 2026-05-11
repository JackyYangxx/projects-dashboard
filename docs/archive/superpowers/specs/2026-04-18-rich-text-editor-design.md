# 富文本编辑器升级设计方案

**版本：** v1.0
**日期：** 2026-04-18
**状态：** 已确认

---

## 概述

本设计针对 Precision Curator 项目详情页的富文本编辑器进行升级，将现有的 TipTap 编辑器替换为 Quill 编辑器，并调整笔记历史记录的布局位置。

---

## 1. 组件替换：TipTap → Quill

### 现状问题

- TipTap 工具栏功能单一（仅粗体、斜体、有序/无序列表、链接、图片）
- 链接和图片插入使用 `window.prompt`，体验差
- 无块级格式化（标题、引用、代码块等）
- 样式与 design system 贴合度不足

### 解决方案

使用 **react-quill**（Quill 的 React 封装）替换 TipTapEditor：

- Quill 是成熟的富文本编辑器，社区生态丰富
- 工具栏功能完整，开箱即用
- 链接/图片插入有原生弹窗交互
- 包体积轻量（约 500KB）

### 组件设计

**文件：** `src/components/QuillEditor.tsx`（新建）

```typescript
interface QuillEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}
```

**Quill 配置：**

```javascript
const modules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],           // 标题 H1/H2
    ['bold', 'italic', 'underline', 'strike'], // 文本格式
    ['blockquote', 'code-block'],              // 引用、代码块
    [{ 'list': 'ordered' }, { 'list': 'bullet' }], // 列表
    ['link', 'image'],                         // 链接、图片
    ['clean']                                  // 清除格式
  ]
}
```

**样式适配：**

- 编辑器容器：`rounded-lg overflow-hidden ring-1 ring-outline`
- 聚焦时：`ring-2 ring-primary-500`（与 TipTap 一致）
- 工具栏背景：`bg-surface-base border-b border-outline`
- 编辑区域：`min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated`
- 字体：`Fira Sans`（与 design system 一致）
- placeholder 样式：`text-on-surface-tertiary`

### 状态管理

- `value`：外部传入的 HTML 字符串
- `onChange`：内容变化时回调，参数为 HTML
- `readOnly`：禁用编辑功能时隐藏工具栏

---

## 2. 布局调整：笔记历史 → 编辑器

### 现状问题

当前布局（自上而下）：
1. 富文本编辑器
2. 取消/保存历史按钮
3. 笔记历史手风琴

用户反馈：编辑前想先查看历史，但历史在编辑器下方，体验割裂。

### 解决方案

调整为（自上而下）：
1. **笔记历史手风琴**（默认展开最新记录）
2. **富文本编辑器**
3. **取消/保存历史按钮**（编辑器右下角）

### 笔记历史手风琴设计

```tsx
// 数据结构不变
interface NoteHistory {
  id: string
  content: string   // HTML 富文本
  createdAt: string
}
```

**展开/折叠行为：**
- 默认展开最新一条记录（`noteHistory[length - 1]`）
- 点击手风琴头部切换展开/折叠
- 展开时显示 `createdAt` 和 HTML 内容预览
- 收起时显示记录数量和 `expand_more` 图标

**箭头旋转方向：**
- 收起（默认）：`rotate(0deg)` — 箭头向下
- 展开：`-90deg`（CSS `rotate(-90deg)`）— 指向上

---

## 3. 交互流程

### 保存历史

1. 用户在编辑器输入内容
2. 点击「保存历史」按钮
3. 当前内容保存到 `noteHistory[]`，新建一条记录
4. 编辑器内容保留（不清空）
5. 新的历史记录自动展开

### 查看历史

1. 用户点击「笔记历史」手风琴
2. 手风琴展开，显示所有历史记录列表
3. 点击单条记录展开/收起详情
4. 详情以 HTML 渲染展示

### 取消编辑

1. 用户点击「取消」按钮
2. 编辑器内容清空
3. 如有未保存内容，不提示确认（简化逻辑）

---

## 4. 视觉规范

### 颜色变量（沿用 design system）

```css
--surface-base: #F8FAFC
--surface-elevated: #FFFFFF
--primary: #3B82F6
--outline: #E2E8F0
--on-surface-primary: #0F172A
--on-surface-secondary: #475569
--on-surface-tertiary: #94A3B8
```

### 圆角与间距

- 编辑器容器：`rounded-lg`
- 工具栏按钮：`rounded`
- 按钮（取消/保存）：`rounded-xl`
- 内边距：`p-4`

### 动画

- 工具栏按钮 hover：`transition-colors duration-150`
- 手风琴展开：`transition-transform duration-200`
- 保存状态：`duration-500 ease-out`

---

## 5. 兼容性

### Quill 与 React 18

react-quill v2.x 支持 React 18，无需特殊处理。

### 占位符 polyfill

Quill 默认不支持 placeholder，需要通过 CSS 或自定义方式实现。

### 样式覆盖

Quill 的默认样式会与 design system 冲突，需要覆盖以下内容：

- 工具栏按钮颜色
- 编辑区域字体
- Placeholder 样式
- 焦点状态样式

---

## 6. 变更清单

### 新增文件

- `src/components/QuillEditor.tsx`

### 删除文件

- `src/components/TipTapEditor.tsx`

### 修改文件

- `src/pages/ProjectDetail.tsx`
  - 引入 `QuillEditor` 替代 `TipTapEditor`
  - 调整笔记历史与编辑器 DOM 顺序

---

## 7. 测试要点

| # | 测试项 | 验证方式 |
|---|--------|----------|
| 1 | 编辑器加载正常 | 页面打开无报错 |
| 2 | 粗体/斜体/下划线等格式 | 选中文本，点击工具栏按钮 |
| 3 | 有序/无序列表 | 切换列表类型 |
| 4 | 链接插入 | 点击链接按钮，输入 URL |
| 5 | 图片插入 | 点击图片按钮，输入 URL |
| 6 | 引用/代码块 | 插入引用和代码块 |
| 7 | 保存历史 | 输入内容，点击保存，刷新页面 |
| 8 | 历史记录展开/收起 | 点击手风琴，验证动画 |
| 9 | 只读模式 | 切换 View 模式，工具栏消失 |
