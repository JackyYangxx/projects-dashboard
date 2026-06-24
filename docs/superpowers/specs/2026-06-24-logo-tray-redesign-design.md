# Logo & Tray Icon Redesign

**Date**: 2026-06-24
**Status**: Draft (pending user review)

## Background

应用从 Precision Curator 重命名为「项目管理看板」(v1.0.7)，但品牌资产未同步：

- `src/components/Sidebar.tsx` 仍渲染白色 "P" 字母（来自旧名）
- `docs/app-icon/` 目录不存在 → electron-builder 找不到图标源，Windows 包体使用默认占位图标
- `electron/main.ts` 没有 `Tray` 实现 → Windows 系统托盘无应用入口
- `electron-builder.yml` 中 `productName: Precision Curator`、`appId: com.precisioncurator.app` 未同步
- `docs/icon-design-philosophy.md` 仍描述旧的 "Precision Monolith" 概念（紫色渐变 + PC 字母）

## Goal

设计一个能跨平台、跨尺寸（512px → 16px）保持识别度的主 logo，并将 Windows 系统托盘图标从默认 Electron 图标替换为同形简化版。同时同步 `productName` 等打包元数据。

## Design Concept: 人 · People-Centered

汉字「人」由两笔组成（撇 + 捺），寓意「以人为本」——项目管理以团队协作为核心。

视觉上以 SVG 渲染真正的「人」字形（带书法粗细），叠加 3 个装饰性节点呼应原始「点线连接」想法。

### Sidebar 主 logo（36×36）

**容器**（沿用现有视觉系统，不改）：
- `bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700`
- `rounded-md` (8px)
- `shadow-glow-sm`、`ring-1 ring-black/5`
- 顶部白色高光叠加层 `bg-gradient-to-tr from-white/0 to-white/30`
- `animateLogoPulse` 保留

**内部图形**：白色「人」字（书法笔意 SVG path）

| 元素 | 描述 | 颜色/粗细 |
|---|---|---|
| 撇 (左笔) | 从 (12, 8) 起笔，向 (17, 28) 收笔 | stroke: white, stroke-width: 2.5, stroke-linecap: round |
| 捺 (右笔) | 从 (24, 8) 起笔，向 (20, 28) 收笔（带书法收笔弧度） | stroke: white, stroke-width: 2.5, stroke-linecap: round |
| 节点 1 (撇起笔) | 位于 (12, 8) | r=2, fill: white |
| 节点 2 (捺起笔) | 位于 (24, 8) | r=2, fill: white |
| 节点 3 (汇点) | 位于 (18.5, 27) | r=2.5, fill: white |

两笔在下方区域自然交叉重叠（不尖锐汇聚为一点），保留「人」字识别度。

### Windows 系统托盘图标（16×16 同形简化）

**形态**：与主 logo 同形简化

| 元素 | 描述 |
|---|---|
| 撇 | (3, 3) → (7.5, 12), stroke-width: 1.5 |
| 捺 | (13, 3) → (8.5, 12), stroke-width: 1.5 |
| 节点 | r=1 (三个) |
| 颜色 | 单色：深色主题用 `#FFFFFF`，浅色主题用 `#1F2937`（由 `nativeTheme` 判定） |

**多尺寸资产**：

```
docs/app-icon/
├── logo-mark.svg          # Sidebar 用 SVG（仅「人」字+节点，无容器）
├── icon.svg               # 主 logo 源（容器+字形）
├── icon-512.png           # electron-builder 主图标源
├── icon-256.png
├── icon-128.png
├── icon-64.png
├── icon-48.png
├── icon-32.png
├── icon-16.png
├── icon.ico               # Windows 应用图标（16/24/32/48/256 嵌入）
├── tray.svg               # 托盘图标源（单色）
└── tray.ico               # Windows 托盘图标（16/24/32/48）
```

生成方式：SVG → 多尺寸 PNG（用 `sharp` CLI 或 `electron-icon-builder`），PNG → ICO（用 `png2icons` 或 `electron-icon-builder`）。

## Implementation Plan

### 1. 资产生成（新增）

创建 `scripts/build-icons.js`：
- 输入：`docs/app-icon/icon.svg`、`docs/app-icon/logo-mark.svg`、`docs/app-icon/tray.svg`
- 输出：上述 PNG/ICO 列表
- 工具：`sharp` (PNG 缩放) + `png2icons` (ICO 打包) — 均已是常用 npm 包

### 2. Sidebar 改造（修改 `src/components/Sidebar.tsx`）

替换 lines 33-39 的内联 div：

```tsx
// 原：圆角方块 + 白色 "P"
// 改为：圆角方块（保留） + <svg> 渲染「人」字+节点
<div
  ref={logoRef}
  className="relative w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-glow-sm ring-1 ring-black/5"
>
  <svg viewBox="0 0 36 36" className="w-6 h-6 relative z-10">
    {/* 撇 + 捺 + 三个节点 */}
  </svg>
  <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-white/0 to-white/30" />
</div>
```

### 3. Windows 托盘实现（修改 `electron/main.ts`）

新增：

```ts
import { Tray, Menu, nativeImage } from 'electron'
import { pathToFileURL } from 'url'

let tray: Tray | null = null

function createTray() {
  const iconPath = path.join(__dirname, '../docs/app-icon/tray.ico')
  let image = nativeImage.createFromPath(iconPath)
  if (process.platform === 'win32' && image.isEmpty()) {
    // 兜底：使用 PNG
    image = nativeImage.createFromPath(
      path.join(__dirname, '../docs/app-icon/tray.png')
    )
  }
  tray = new Tray(image)
  tray.setToolTip('项目管理看板')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => BrowserWindow.getAllWindows()[0]?.show() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]))
  tray.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) { win.isVisible() ? win.hide() : win.show() }
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
})
```

Windows 主题感知：注册 `nativeTheme.on('updated', ...)` 重建托盘图标以切换黑白。

### 4. 元数据同步（修改 `electron-builder.yml`）

```yaml
productName: 项目管理看板    # 原: Precision Curator
appId: com.projects-dashboard.app  # 原: com.precisioncurator.app
```

### 5. 文档更新（修改 `docs/icon-design-philosophy.md`）

重写为「人 · 以人为本」概念，更新：
- 视觉哲学段：删除 "Precision Monolith"、"cursor traversing digital workspace"、"PC letters"
- 配色段：从 `#3B82F6 → #8B5CF6` 改为 trust blue `#2E6BB8 → #002D62`（参考 `tailwind.config.js`）
- 新增「人」字节点说明（呼应 Sidebar 主 logo 与里程碑时间轴的视觉一致性）

## Out of Scope

- ❌ macOS 托盘（CLAUDE.md 明确 macOS 构建非必需）
- ❌ favicon、社交媒体卡片等次级资产
- ❌ 重做 Sidebar 整体布局
- ❌ 容器渐变色调整（保留现有 trust blue 渐变）
- ❌ favicon.ico、Linux .desktop 入口

## Success Criteria

- [ ] Sidebar 顶部 logo 在 36×36 下清晰显示「人」字 + 3 节点，视觉重心在底汇点
- [ ] Windows 应用窗口图标（任务栏、Alt-Tab）显示新 logo
- [ ] Windows 系统托盘出现应用图标，左键唤起/隐藏主窗口，右键菜单有「显示」「退出」
- [ ] 16×16 托盘图标仍可识别为「人」字形
- [ ] `productName: 项目管理看板` 生效（Windows 窗口标题、开始菜单、应用列表显示新名称）
- [ ] `docs/icon-design-philosophy.md` 文档与新设计一致
- [ ] 现有视觉系统（trust blue 渐变、glow、字号、布局）零回归

## Verification

1. **Sidebar logo**：浏览器加载应用（`npm run dev`），观察左上角 logo 形态、对齐、动效
2. **Windows 包体图标**：`npm run electron:build` 后检查 `release/win-unpacked/项目管理看板.exe` 图标（Windows 上查看）
3. **托盘图标**：在 Windows 上运行打包后的 exe，确认托盘出现新图标 + 菜单功能
4. **产品名**：`electron-builder` 构建后产物目录名为「项目管理看板」

## Reference Files

- 当前 Sidebar logo：`src/components/Sidebar.tsx:33-39`
- 当前 main.ts（无 Tray）：`electron/main.ts:1-66`
- 当前打包配置：`electron-builder.yml:1-30`
- 品牌色源：`tailwind.config.js:39-51` (primary 调色板)
- 旧设计哲学：`docs/icon-design-philosophy.md`