# Precision Curator - 设计系统文档

**版本:** 2.0.0
**更新日期:** 2026-04-17
**设计风格:** 浅色科技风 + 流动渐变

---

## 一、设计理念

### 1.1 核心概念

**"轻盈的科技感"** — 在保持专业企业级观感的同时，通过流动的渐变背景和精致的毛玻璃效果赋予界面现代感和活力。

- **轻盈感**: 浅色基调 + 毛玻璃 + 柔和阴影
- **科技感**: Fira Code 字体 + 紫色渐变 + 流动动画
- **专业感**: 清晰的信息层级 + 规范的间距系统

### 1.2 设计参考

基于 ui-ux-pro-max 设计系统的 Enterprise Dashboard 规范，结合现代 SaaS 产品美学。

---

## 二、色彩系统

### 2.1 主色板

```
Primary (电光蓝)     #3B82F6
Accent (科技紫)      #8B5CF6
```

从传统的蓝色/灰色企业配色转向蓝紫渐变，体现科技感和现代性。

### 2.2 完整调色板

```css
/* 表面色 - 层级结构 */
--surface-base: #F8FAFC;      /* 主背景 - 浅灰白 */
--surface-container: #FFFFFF;   /* 卡片/容器 - 纯白 */
--surface-elevated: #FFFFFF;   /* 抬升元素 */
--surface-hover: #F1F5F9;      /* Hover 状态 */

/* 文字色 - 可访问性优先 */
--on-surface-primary: #0F172A;   /* 主要文字 - WCAG AAA */
--on-surface-secondary: #475569; /* 次要文字 - WCAG AA */
--on-surface-tertiary: #94A3B8;   /* 三级文字 */

/* 边框色 */
--outline: #E2E8F0;
--outline-variant: #F1F5F9;

/* Primary 渐变色阶 */
--primary-50: #EFF6FF;
--primary-100: #DBEAFE;
--primary-200: #BFDBFE;
--primary-300: #93C5FD;
--primary-400: #60A5FA;
--primary-500: #3B82F6;  /* 主色 */
--primary-600: #2563EB;
--primary-700: #1D4ED8;

/* Accent 渐变色阶 */
--accent-400: #A78BFA;
--accent-500: #8B5CF6;  /* 强调色 */
--accent-600: #7C3AED;

/* 语义色 */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
```

### 2.3 渐变配方

```css
/* 按钮/卡片背景渐变 */
background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);

/* 背景流动渐变 */
background: linear-gradient(135deg,
  rgba(99, 102, 241, 0.08) 0%,
  rgba(139, 92, 246, 0.05) 30%,
  rgba(236, 72, 153, 0.03) 60%,
  rgba(59, 130, 246, 0.08) 100%
);

/* 进度条渐变 */
background: linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%);
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

### 4.1 阴影层级

```css
/* 卡片阴影 - 轻柔层次感 */
--shadow-surface: 0 1px 3px rgba(0, 0, 0, 0.05),
                  0 1px 2px rgba(0, 0, 0, 0.03);

/* 抬升阴影 - 悬浮元素 */
--shadow-elevated: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
                   0 2px 4px -1px rgba(0, 0, 0, 0.03);

/* 浮动阴影 - 弹窗/下拉 */
--shadow-float: 0 10px 25px -3px rgba(0, 0, 0, 0.08),
                0 4px 6px -2px rgba(0, 0, 0, 0.04);
```

### 4.2 发光效果

```css
/* 按钮/图标发光 - 强调交互 */
--glow-sm: 0 0 15px rgba(59, 130, 246, 0.15);
--glow-md: 0 0 30px rgba(59, 130, 246, 0.20);
--glow-lg: 0 0 50px rgba(59, 130, 246, 0.25);
```

---

## 五、圆角系统

```css
/* 遵循 4px 基准 */
--radius-sm: 0.125rem;   /* 2px - 小标签 */
--radius-md: 0.375rem;   /* 6px - 输入框 */
--radius-lg: 0.5rem;    /* 8px - 按钮 */
--radius-xl: 0.75rem;   /* 12px - 卡片 */
--radius-2xl: 1rem;     /* 16px - 大容器 */
--radius-full: 9999px;   /* 胶囊按钮 */
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

**主按钮**
```jsx
className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500
          text-white rounded-xl font-medium
          hover:shadow-glow-sm transition-all duration-200"
```

**次要按钮**
```jsx
className="px-4 py-2 bg-white border border-outline rounded-xl
          text-on-surface-primary
          hover:bg-surface-hover transition-colors duration-150"
```

**图标按钮**
```jsx
className="w-10 h-10 flex items-center justify-center rounded-xl
          text-on-surface-secondary
          hover:bg-surface-hover hover:text-primary-500
          transition-all duration-200"
```

### 7.2 卡片

**标准卡片**
```jsx
className="bg-white rounded-2xl border border-outline shadow-card
          hover:shadow-elevated transition-all duration-200"
```

**强调卡片 (渐变背景)**
```jsx
className="bg-gradient-to-br from-primary-500 to-accent-500
          text-white rounded-2xl shadow-lg"
```

### 7.3 输入框

```jsx
className="w-full px-4 py-2 bg-surface-base border border-outline rounded-xl
          text-on-surface-primary placeholder:text-on-surface-tertiary
          focus:outline-none focus:border-primary-500
          focus:ring-2 focus:ring-primary-500/20
          transition-all duration-200"
```

### 7.4 状态徽章

```jsx
// 进行中
className="bg-primary-50 text-primary-600 border border-primary-200"

// 已完成
className="bg-success/10 text-success border border-success/20"

// 暂停中
className="bg-warning/10 text-warning border border-warning/20"
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

---

*文档生成: Claude Code + ui-ux-pro-max Design Intelligence*
