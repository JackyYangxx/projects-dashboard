# Dashboard 与详情页迭代总结

**版本:** v1.0
**日期:** 2026-04-17
**状态:** 已完成

---

## 概述

本次迭代实现了 Dashboard 首页和 ProjectDetail 详情页的 10 项功能增强。

---

## 已完成功能

### 1. Dashboard 无限滚动
- **文件:** `src/components/ProjectTable.tsx`
- **实现:** Intersection Observer 监听滚动到底部
- **初始加载:** 20 条数据
- **追加加载:** 每次 20 条
- **依赖:** 无

### 2. 行点击跳转只读详情
- **文件:** `src/components/ProjectTable.tsx`, `src/pages/ProjectDetail.tsx`
- **实现:** 点击行调用 `navigate('/project/:id')`
- **详情页:** 默认只读模式 (`isReadOnly=true`)
- **View/Edit 按钮:** 切换只读/编辑模式

### 3. 子进度条可拖拽
- **文件:** `src/components/ProgressSlider.tsx`
- **实现:** 每个子进度条独立拖拽
- **子进度项:** 底层架构、UI-UX设计、工程开发、质量审计
- **同步:** `onSubProgressChange` 更新 store

### 4. 预算卡片内联编辑
- **文件:** `src/pages/ProjectDetail.tsx`
- **实现:** 点击金额变为输入框
- **保存:** Enter 或 blur
- **取消:** ESC
- **动画:** 保存时显示 spinner

### 5. NoteHistory 类型和 Store 扩展
- **文件:** `src/types/index.ts`, `src/store/projectStore.ts`
- **类型:** `NoteHistory { id, content, createdAt }`
- **Store:** `addNoteHistory` action

### 6. 笔记历史手风琴 UI
- **文件:** `src/pages/ProjectDetail.tsx`
- **布局:** 历史手风琴在上，编辑器在中，按钮在下
- **手风琴:** 最新一条默认展开，点击切换
- **提交:** 保存到历史记录，清空编辑器
- **取消:** 清空编辑器内容

### 7. 富文本编辑器替换为 Tiptap
- **文件:** `src/components/TipTapEditor.tsx` (新增), `src/components/RichTextEditor.tsx` (删除)
- **依赖:** `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`
- **功能:** 粗体、斜体、有序/无序列表、链接、图片、placeholder
- **只读:** 支持 `readOnly` prop

### 8. 提交/取消按钮逻辑
- **文件:** `src/pages/ProjectDetail.tsx`
- **取消:** 清空富文本内容
- **提交:** 调用 `addNoteHistory` 保存历史

### 9. 团队添加成员弹窗
- **文件:** `src/pages/ProjectDetail.tsx`
- **弹窗:** 姓名 + 角色输入
- **头像:** DiceBear initials 预览
- **现有成员:** 只读

### 10. 策展范围替换为里程碑组件
- **文件:** `src/pages/ProjectDetail.tsx`, `src/types/index.ts`
- **类型:** `Milestone { id, title, date, status, description? }`
- **状态:** pending / completed / delayed
- **UI:** 垂直时间线样式

---

## Git 提交记录

```
95b7939 chore: add Tiptap dependencies and E2E test script
270d27f fix: resolve 4 code quality issues
710c016 fix: default expand newest note history entry
b00a7e3 fix: implement note history accordion expand/collapse
4963bce fix: remove isLoadingMore from IntersectionObserver deps
29e3bc3 feat: implement Tiptap editor, NoteHistory, milestones, team modal, budget edit
79f3d75 feat: implement infinite scroll and read-only detail mode
```

---

## 审核流程总结

### 规格审核 (6 轮)
- Task 1, 7: ✅ 一次通过
- Task 3, 4, 5, 8, 9, 10: ✅ 一次通过
- Task 6: ❌ 发现问题 → 修复 → ❌ 发现第二个问题 → 修复 → ✅ 通过

**发现的问题:**
- 手风琴无展开/折叠功能
- 默认展开项错误 (最旧 vs 最新)

### 代码质量审核 (2 轮)

**第一轮发现的问题:**
1. Critical: IntersectionObserver deps 包含 `isLoadingMore`
2. Important: Arrow rotation 方向错误
3. Important: Budget input 无验证
4. Important: Accordion toggle logic 错误
5. Minor: 多个小问题

**第二轮:** 全部确认修复

### E2E 测试
- 测试脚本: `e2e_dashboard.py`
- 测试结果: 10/10 通过
- 控制台错误: 0

---

## 可复用规则

### 1. 手风琴默认展开最新项
新条目 append 到数组末尾时，`expandedId = array[array.length - 1].id`

### 2. Arrow Rotation 方向
- 折叠 (collapsed): `rotate(-90deg)` 箭头向下
- 展开 (expanded): `rotate(0deg)` 箭头向上

### 3. IntersectionObserver Dependencies
不要将 `isLoadingMore` 放入 deps 数组，会导致频繁重连。使用 ref 代替。

### 4. 内联编辑状态管理
```typescript
const [editingField, setEditingField] = useState<string | null>(null)
const [editValue, setEditValue] = useState(originalValue)

const handleSave = () => {
  updateField(editValue)
  setEditingField(null)
}

const handleCancel = () => {
  setEditValue(originalValue)
  setEditingField(null)
}
```

### 5. 只读模式穿透
所有可编辑组件应支持 `readOnly` prop，在只读模式下：
- 禁用拖拽
- 禁用输入
- 隐藏编辑 UI

---

## E2E 测试重点

测试脚本: `e2e_dashboard.py`

| # | 测试点 | 验证方法 |
|---|--------|----------|
| 1 | 无限滚动 | 滚动到底部出现加载指示器 |
| 2 | 只读详情 | 点击行进入详情页，View/Edit 按钮存在 |
| 3 | 子进度拖拽 | 4 个子进度条可拖动 |
| 4 | 内联编辑 | 点击金额变为输入框，Enter 保存，ESC 取消 |
| 5 | 手风琴 | 最新条目默认展开，点击切换 |
| 6 | Tiptap | ProseMirror 编辑器存在，文本输入有效 |
| 7 | 提交/取消 | 按钮存在，功能正常 |
| 8 | 弹窗 | 模态框打开，DiceBear 头像预览 |
| 9 | 里程碑 | 垂直时间线，3 种状态样式 |
| 10 | 控制台 | 无 JS 错误 |
