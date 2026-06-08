# Precision Curator - 设计系统文档

**版本:** 3.0.0
**更新日期:** 2026-06-08
**设计风格:** 深色侧栏 + 浅色主区 · 翠绿品牌色

---

## 一、设计理念

### 1.1 核心概念

**"专业工具的克制美"** — Linear/Notion 风格的双层结构：深色侧栏锚定品牌识别度，浅色主区保留数据可读性。通过翠绿品牌色建立鲜明记忆点，摆脱"通用 SaaS 蓝"的平庸感。

- **结构感**: 深色侧栏(#0F172A) + 浅色主区(#F1F5F9)，强烈的明暗对比
- **品牌感**: 单一翠绿品牌色(#10B981)，全应用一致的强调色
- **精致感**: 清晰边框(CBD5E1) + 大圆角(20px) + 多层阴影，Windows 上也清晰可辨

### 1.2 关键改进

v3.0 相比 v2.0 解决了以下"朴素感"问题：
- 移除半透明背景层（Windows 渲染糊）
- 主背景加深至 slate-100 让白卡片有层次
- 边框从 slate-200 加深到 slate-300 解决 Windows 边框消失
- 圆角从 12px 加大到 20px
- 统一品牌色，移除蓝紫渐变组合

---

## 二、色彩系统

### 2.1 主色板

```
Primary (翠绿 Emerald)  #10B981  ← 品牌色
Accent  (青色 Cyan)     #06B6D4  ← 次级渐变
Sidebar (深 slate)      #0F172A
Surface (slate-100)     #F1F5F9
```

### 2.2 完整调色板

```css
/* 表面色 - 层级结构 (主区) */
--surface-base: #F1F5F9;       /* 主区背景 - slate-100，卡片浮于其上 */
--surface-container: #FFFFFF;  /* 卡片/容器 - 纯白 */
--surface-elevated: #FFFFFF;   /* 抬升元素 */
--surface-hover: #E2E8F0;      /* Hover 状态 */
--surface-subtle: #F8FAFC;     /* 表头/分隔区 */

/* 文字色 - 可访问性优先 */
--on-surface-primary: #0F172A;   /* 主要文字 - WCAG AAA */
--on-surface-secondary: #475569; /* 次要文字 - WCAG AA */
--on-surface-tertiary: #94A3B8;   /* 三级文字 */

/* 边框色 (Windows 可见性) */
--outline: #CBD5E1;        /* slate-300 - 默认边框 */
--outline-variant: #E2E8F0;/* 极细分隔 */
--outline-strong: #94A3B8; /* 强调边框 */

/* 侧栏色 (深色主题) */
--sidebar-bg: #0F172A;         /* slate-900 */
--sidebar-bg-hover: #1E293B;   /* slate-800 */
--sidebar-border: #1E293B;
--sidebar-text: #94A3B8;
--sidebar-text-strong: #F1F5F9;
--sidebar-text-active: #34D399;

/* Primary 翠绿色阶 */
--primary-50:  #ECFDF5;
--primary-100: #D1FAE5;
--primary-200: #A7F3D0;
--primary-300: #6EE7B7;
--primary-400: #34D399;
--primary-500: #10B981;  /* 主色 */
--primary-600: #059669;
--primary-700: #047857;
--primary-800: #065F46;
--primary-900: #064E3B;

/* Accent 青色阶 */
--accent-400: #22D3EE;
--accent-500: #06B6D4;
--accent-600: #0891B2;

/* 语义色 */
--success: #10B981;  /* 与 primary 同源 */
--warning: #F59E0B;
--error:   #EF4444;
```

### 2.3 渐变配方

```css
/* 主按钮 - 翠绿单色渐变 */
background: linear-gradient(135deg, #10B981 0%, #059669 100%);

/* 进度条 */
background: linear-gradient(90deg, #10B981 0%, #34D399 100%);

/* Logo 盒 */
background: linear-gradient(135deg, #34D399 0%, #059669 100%);
```

---

## 三、字体系统

### 3.1 字体选择

```css
/* 标题/数字 - 等宽科技感 */
font-family: 'Fira Code', monospace;

/* 正文 - 清晰易读 */
font-family: 'Fira Sans', sans-serif;
```

### 3.2 字体规范

| 用途 | 字体 | 字重 | 字号示例 |
|------|------|------|----------|
| 页面标题 | Fira Code | 700 | 24px |
| 卡片标题 | Fira Code | 600 | 18px |
| 正文 | Fira Sans | 400 | 14px |
| 标签/辅助 | Fira Sans | 500 | 12px |
| 数字数据 | Fira Code | 600 | tabular-nums |

### 3.3 数字显示

所有数字金额、百分比、统计数据使用 `tabular-nums` 特性，确保表格数据对齐。

---

## 四、阴影与光效

### 4.1 阴影层级 (Windows 优化)

```css
/* 卡片 - 边+阴影组合，对比更强 */
--shadow-card: 0 0 0 1px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.04);

/* 抬升 - 悬浮元素 */
--shadow-elevated: 0 4px 6px -1px rgba(15,23,42,0.08),
                   0 2px 4px -2px rgba(15,23,42,0.04);

/* 浮动 - 弹窗/下拉 */
--shadow-float: 0 10px 25px -3px rgba(15,23,42,0.12),
                0 4px 6px -2px rgba(15,23,42,0.06);
```

### 4.2 翠绿发光 (品牌色)

```css
/* 强调按钮/Logo */
--glow-sm: 0 0 0 1px rgba(16,185,129,0.2), 0 4px 12px rgba(16,185,129,0.15);
--glow-md: 0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px rgba(16,185,129,0.2);
--glow-lg: 0 0 0 1px rgba(16,185,129,0.3), 0 12px 40px rgba(16,185,129,0.25);
```

---

## 五、圆角系统

```css
/* v3.0 加大圆角，更现代 */
--radius-sm:   0.25rem;   /* 4px  - 小标签 */
--radius-md:   0.5rem;    /* 8px  - 输入框/按钮 */
--radius-lg:   0.75rem;   /* 12px - 中型容器 */
--radius-xl:   1rem;      /* 16px - 卡片 */
--radius-2xl:  1.25rem;   /* 20px - 大卡片 (默认) */
--radius-3xl:  1.5rem;    /* 24px - 弹窗 */
--radius-full: 9999px;    /* 胶囊 */
```

---

## 六、动画系统

### 6.1 背景流动效果

```css
/* Blob 漂浮动画 - 营造流动感 */
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* 渐变流动 - 背景层 */
@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
```

### 6.2 交互过渡

```css
/* 通用过渡 - 150-200ms ease-out */
transition: all duration-200 ease-out;

/* 特定属性过渡 */
transition: width duration-300 ease-out;
transition: transform duration-150 ease-out;
```

### 6.3 Hover 效果

| 元素 | Hover 效果 |
|------|-----------|
| 按钮 | scale(1.02) + shadow-glow-sm |
| 卡片 | scale(1.02) + shadow-elevated |
| 表格行 | bg-primary-50/50 |
| 图标按钮 | bg-surface-hover + text-primary-500 |

---

## 七、组件规范

### 7.1 按钮

**主按钮 (翠绿渐变)**
```jsx
className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600
          text-white rounded-lg font-medium
          hover:shadow-glow-sm hover:from-primary-600 hover:to-primary-700
          transition-all duration-200"
```

**次要按钮 (实色白底)**
```jsx
className="px-3 py-2 bg-white border border-outline
          text-on-surface-primary rounded-lg font-medium
          hover:bg-surface-hover hover:border-outline-strong
          transition-all duration-200"
```

**图标按钮**
```jsx
className="w-9 h-9 flex items-center justify-center rounded-lg
          text-on-surface-tertiary
          hover:bg-primary-50 hover:text-primary-600
          transition-all duration-150"
```

### 7.2 卡片

**标准卡片 (主区)**
```jsx
className="bg-white rounded-2xl border border-outline shadow-card
          hover:shadow-elevated transition-all duration-200"
```

**强调卡片 (翠绿渐变)**
```jsx
className="bg-gradient-to-br from-primary-500 to-primary-700
          text-white rounded-2xl shadow-elevated"
```

### 7.3 输入框

```jsx
className="w-full px-4 py-2 bg-surface-base border border-outline rounded-lg
          text-on-surface-primary placeholder:text-on-surface-tertiary
          focus:outline-none focus:border-primary-500 focus:bg-white
          focus:ring-2 focus:ring-primary-500/20
          transition-all duration-200"
```

### 7.4 状态徽章

```jsx
// 进行中 (主品牌色)
className="bg-primary-50 text-primary-600 border border-primary-200"

// 已完成
className="bg-success/10 text-success border border-success/20"

// 暂停中
className="bg-warning/10 text-warning border border-warning/20"
```

### 7.5 侧栏 (v3.0 新增)

```jsx
// 容器
<aside className="bg-sidebar-bg border-r border-sidebar-border">

  // 激活导航项
  <button className="bg-[rgba(16,185,129,0.1)] text-sidebar-text-active
                    font-medium relative">
    // 左侧 4px 翠绿指示条
    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5
                     bg-primary-400 rounded-r-full" />
  </button>
</aside>
```

---

## 八、布局规范

### 8.1 间距系统

基于 4px 基准的 8pt 网格：

| Token | 值 | 用途 |
|-------|-----|------|
| space-1 | 4px | 紧凑间距 |
| space-2 | 8px | 小间距 |
| space-3 | 12px | 中小间距 |
| space-4 | 16px | 中间距 |
| space-5 | 20px | 中大间距 |
| space-6 | 24px | 大间距 |

### 8.2 Z-Index 层

| 层级 | 值 | 用途 |
|------|-----|------|
| Base | 0 | 普通内容 |
| Dropdown | 10 | 下拉菜单 |
| Sticky | 20 | 固定导航 |
| Modal | 30 | 弹窗 |
| Toast | 40 | 通知 |

---

## 九、无障碍设计

### 9.1 颜色对比

| 组合 | 对比度 | 等级 |
|------|--------|------|
| #0F172A on #F8FAFC | 18:1 | AAA |
| #475569 on #F8FAFC | 7:1 | AAA |
| #94A3B8 on #FFFFFF | 3:1 | AA |

### 9.2 交互反馈

- 所有可点击元素有 `cursor-pointer`
- Focus 状态有可见的 ring (focus:ring-2)
- 图标按钮有 aria-label
- 删除等危险操作有确认对话框

### 9.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 十、实现文件

| 文件路径 | 说明 |
|----------|------|
| `tailwind.config.js` | 完整设计系统配置 |
| `src/styles/globals.css` | 全局样式、动画、工具类 |
| `src/components/Sidebar.tsx` | 侧边导航 |
| `src/components/Header.tsx` | 顶部栏 |
| `src/components/StatsCard.tsx` | 统计卡片 |
| `src/components/ProjectTable.tsx` | 项目表格 |
| `src/components/ProgressSlider.tsx` | 进度滑块 |
| `src/components/Timeline.tsx` | 时间线 |
| `src/pages/Dashboard.tsx` | 仪表板页面 |

---

## 十一、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-04-17 | 初始版本 - 企业蓝灰配色 |
| 2.0.0 | 2026-04-17 | 科技风升级 - 浅色+流动渐变+紫色强调 |
| 3.0.0 | 2026-06-08 | **配色重构** - 深色侧栏+翠绿品牌色，移除蓝紫渐变，加深边框/圆角/阴影解决 Windows 朴素感 |

## 十二、UI 审查记录

**审查日期：** 2026-04-17
**审查范围：** Dashboard 首页所有组件

### 已修复问题（P0/P1 全部解决）

| 组件 | 问题 | 修复方案 |
|------|------|----------|
| ProjectTable | 删除操作无确认 | 添加 `window.confirm()` 确认对话框 |
| Header | 图标按钮缺 aria-label | 所有按钮添加 `aria-label` |
| ProjectTable | 分页 ellipsis 缺 aria-label | 添加 `aria-label="更多页码"` |
| Sidebar | 激活状态无视觉指示 | 使用渐变背景 + 白色文字 |
| Header | 搜索框无 focus ring | 添加 `focus:ring-2 focus:ring-primary-500/20` |
| StatsCard | 进度条动画可能抖动 | 改用 `transition-[width] duration-500 ease-out` |
| Dashboard | 无空状态设计 | 添加空状态图标和提示文案 |

详细审查报告已归档至 `docs/archive/ui-review-dashboard.md`。

---

*文档生成: Claude Code + ui-ux-pro-max Design Intelligence*
