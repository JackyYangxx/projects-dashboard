# Precision Curator UI 审查报告

**审查日期:** 2026-04-17
**审查页面:** Dashboard (首页)
**设计系统参考:** ui-ux-pro-max Enterprise Dashboard Guidelines

---

## 一、设计系统对比分析

### 1.1 当前配色 vs 建议配色

| 角色 | 当前值 | 建议值 | 状态 |
|------|--------|--------|------|
| Primary | `#5B7FA6` (蓝灰) | `#2563EB` (专业蓝) | ⚠️ 建议调整 |
| Primary Hover | `#4A6B8A` | `#1D4ED8` | ⚠️ 需加深 |
| Background | `#F7F6F3` | `#F8FAFC` | ⚠️ 略偏暖 |
| Surface Elevated | `#FFFFFF` | `#FFFFFF` | ✅ 正确 |
| Text Primary | `#1A1A1A` | `#0F172A` | ⚠️ 可更深 |
| Text Secondary | `#6B6B6B` | `#475569` | ⚠️ 建议调整 |
| Success | `#4CAF50` | `#059669` | ⚠️ 建议使用 Emerald |
| Border | `#D4D2CC` | `#E4ECFC` | ⚠️ 建议更浅 |

### 1.2 字体系统

| 元素 | 当前字体 | 建议字体 | 状态 |
|------|----------|----------|------|
| Heading | Manrope | Poppins / Fira Code | ⚠️ 建议更换 |
| Body | Inter | Open Sans / Fira Sans | ✅ 良好 |
| 代码/数据 | - | Fira Code | ⚠️ 建议添加 |

### 1.3 圆角系统

| 元素 | 当前值 | 建议值 | 状态 |
|------|--------|--------|------|
| 按钮/卡片 | 0.5rem (lg) | 0.5rem | ✅ 正确 |
| 输入框 | - | 0.375rem | ⚠️ 建议 md |
| 小标签 | 0.125rem (sm) | 9999px (full) | ⚠️ 建议统一 |

---

## 二、组件级别问题

### 2.1 Sidebar (侧边导航)

**问题清单:**

| # | 问题 | 严重程度 | 规则参考 |
|---|------|----------|----------|
| 1 | 导航项 hover 状态没有 scale 反馈 | 低 | 2-Touch: press-feedback |
| 2 | 激活状态使用纯色背景，缺少左侧指示条 | 中 | 9-Nav: nav-state-active |
| 3 | 底部操作区（帮助/退出）与主导航没有视觉分隔 | 低 | 9-Nav: destructive-nav-separation |
| 4 | Logo 区域缺少 favicon/品牌图形 | 低 | 4-Style: consistent icon style |

**修改建议:**
```tsx
// 1. 添加左侧激活指示条
activePath === item.path && (
  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full" />
)

// 2. 添加 hover scale 效果
className="...hover:scale-[1.02] transition-transform duration-150"
```

### 2.2 Header (顶部栏)

**问题清单:**

| # | 问题 | 严重程度 | 规则参考 |
|---|------|----------|----------|
| 1 | 搜索框缺少 focus:ring 状态 | 中 | 1-A11y: focus-states |
| 2 | 图标按钮没有 aria-label | 中 | 1-A11y: aria-labels |
| 3 | 用户头像初始值 "J" 没有来源说明 | 低 | 4-Style: system-controls |

**修改建议:**
```tsx
// 1. 搜索框添加 focus ring
<input
  ...
  className="...focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
/>

// 2. 图标按钮添加 aria-label
<button
  aria-label="通知"
  className="..."
>
  <span className="material-symbols-outlined">notifications</span>
</button>
```

### 2.3 StatsCard (统计卡片)

**问题清单:**

| # | 问题 | 严重程度 | 规则参考 |
|---|------|----------|----------|
| 1 | 图标容器使用 `bg-primary-500/10`，没有定义语义色 | 低 | 6-Typo: color-semantic |
| 2 | 进度条动画使用 `transition-all`，可能触发 layout shift | 中 | 3-Perf: layout-shift-avoid |
| 3 | 增长指标使用纯色+文字，缺少图标补充 | 低 | 1-A11y: color-not-only |

**修改建议:**
```tsx
// 2. 进度条动画优化
<div
  className="h-full bg-primary-500 rounded-full transition-[width] duration-300 ease-out"
// 而不是 transition-all
```

### 2.4 ProjectTable (项目表格)

**问题清单:**

| # | 问题 | 严重程度 | 规则参考 |
|---|------|----------|----------|
| 1 | 操作按钮组没有视觉容器，分组不明确 | 低 | 6-Typo: whitespace-balance |
| 2 | 删除按钮 hover 是红色，但没有确认对话框 | 高 | 8-Forms: confirmation-dialogs |
| 3 | 分页器 ellipsis 没有 aria-label | 中 | 1-A11y: aria-labels |
| 4 | 表格没有键盘导航支持 (aria-sort) | 中 | 1-A11y: keyboard-nav |

**修改建议:**
```tsx
// 3. ellipsis 添加 aria-label
<span
  aria-label="更多页码"
  className="..."
>...</span>

// 4. 表头添加 aria-sort
<th
  aria-sort={sortBy === 'name' ? 'ascending' : 'none'}
  ...
>
```

### 2.5 Dashboard 页面整体

**问题清单:**

| # | 问题 | 严重程度 | 规则参考 |
|---|------|----------|----------|
| 1 | 缺少面包屑导航 | 低 | 9-Nav: breadcrumb-web |
| 2 | 新增项目按钮没有 loading 状态 | 中 | 2-Touch: loading-buttons |
| 3 | 页面没有空状态设计 | 中 | 8-Forms: empty-states |
| 4 | 加载状态使用 spinner，没有骨架屏 | 低 | 3-Perf: progressive-loading |

---

## 三、优先级修复清单

### P0 - 必须修复 (影响功能/可访问性)

| 组件 | 问题 | 修复方案 |
|------|------|----------|
| ProjectTable | 删除操作无确认 | 添加 confirm() 或使用 Dialog 组件 |
| Header | 图标按钮缺 aria-label | 全部按钮添加 aria-label |
| ProjectTable | 分页 ellipsis 缺 aria-label | 添加 aria-label="更多页码" |

### P1 - 强烈建议 (UX 改进)

| 组件 | 问题 | 修复方案 |
|------|------|----------|
| Sidebar | 激活状态无视觉指示 | 添加左侧竖条指示器 |
| Header | 搜索框无 focus ring | 添加 focus:ring-2 |
| StatsCard | 进度条动画可能抖动 | 改用 transition-[width] |
| Dashboard | 无空状态设计 | 添加 empty state 组件 |

### P2 - 建议优化 (体验提升)

| 组件 | 问题 | 修复方案 |
|------|------|----------|
| Sidebar | hover 无 scale 反馈 | 添加 hover:scale-[1.02] |
| Dashboard | 加载状态无骨架屏 | 替换 spinner 为 Skeleton |
| 整体 | 配色偏暖/灰调 | 统一向 #F8FAFC 背景靠拢 |
| 整体 | 字体建议 Fira Code | 用于数字/数据展示 |

---

## 四、设计系统迁移建议

### 4.1 配色迁移路径

```
当前                    目标
─────────────────────────────────
#5B7FA6 (Primary)    →  #2563EB (更专业的蓝)
#F7F6F3 (Surface)    →  #F8FAFC (更冷白)
#1A1A1A (Text)      →  #0F172A (更清晰)
#4CAF50 (Success)   →  #059669 (Emerald 600)
#D4D2CC (Border)    →  #E4ECFC (更浅更现代)
```

### 4.2 字体迁移路径

```css
/* 当前 */
font-family: 'Manrope', 'Inter', sans-serif;

/* 建议 - 企业仪表板风格 */
font-family: 'Poppins', 'Open Sans', sans-serif;

/* 建议 - 技术/数据风格 */
font-family: 'Fira Code', 'Fira Sans', sans-serif;
```

### 4.3 阴影系统优化

```js
// 当前
boxShadow: {
  surface: '0 4px 24px rgba(26, 26, 26, 0.04)',
  elevated: '0 8px 40px rgba(26, 26, 26, 0.06)',
  float: '0 8px 40px rgba(26, 26, 26, 0.08)',
}

// 建议 - 更现代的阴影层次
boxShadow: {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
}
```

---

## 五、验证清单 (Pre-Delivery)

根据 ui-ux-pro-max 规范，完成修复后需验证:

- [ ] **Accessibility**
  - [ ] 所有图标按钮有 aria-label
  - [ ] 颜色对比度 ≥ 4.5:1
  - [ ] 支持 keyboard 导航

- [ ] **Interaction**
  - [ ] 所有可点击元素有 cursor-pointer
  - [ ] Hover/press 状态有过渡动画 (150-300ms)
  - [ ] 删除等危险操作有确认对话框

- [ ] **Layout**
  - [ ] 移动端 (375px) 测试无 horizontal scroll
  - [ ] 固定元素 (Sidebar/Header) 不会遮挡内容

- [ ] **Visual**
  - [ ] 图标来自同一 icon family (Material Symbols)
  - [ ] 没有使用 emoji 作为图标
  - [ ] 圆角/间距遵循 4px/8dp 系统

---

*报告生成: ui-ux-pro-max Design Intelligence*
