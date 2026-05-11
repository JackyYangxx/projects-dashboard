# Bugfix Record — Precision Curator

> 记录实际遇到的 bug、成因及解决方案，供后续参考。

---

## 1. 打包后 exe 空白页（loadURL 仍指向 localhost:5173）

**现象：** Windows 上解压运行 exe 后，页面完全空白（连背景色都没有）。Network 面板可见 localhost:5173 请求。

**排查过程：**

1. 检查 `dist-electron/main.js` — 发现是**开发版本**（未压缩、变量名未混淆、含 `localhost`）
2. 确认 `electron-builder.json` 配置正确
3. 发现 `vite-plugin-electron` 在 watch 模式下运行，当 `dist-electron/main.js` 被删除重建时，立即用开发配置覆盖了 production 构建

**根因：** `npm run electron:dev` 在后台以 watch 模式持续运行，当执行 `rm dist-electron/main.js && npm run build` 时，watch 进程检测到文件变化，用**开发构建配置**（`isDev = !app.isPackaged || process.env.NODE_ENV !== 'production'`）重建了 main.js。由于 `process.env.NODE_ENV` 在 vite-plugin-electron 的生产构建中没有正确替换为 `"production"`，导致 `isDev` 在打包后仍为 `true`，走了 `loadURL("http://localhost:5173")` 分支。

**修复方案：**

1. 在 `vite.config.ts` 中对 electron 主进程构建使用 `define` 替换 `process.env.NODE_ENV`：
   ```ts
   electron([
     {
       entry: 'electron/main.ts',
       vite: {
         define: {
           'process.env.NODE_ENV': '"production"',
           'import.meta.env.MODE': '"production"',
         },
       },
     },
   ])
   ```

2. 同时在 `package.json` 的 `electron:build` 脚本中显式传递：
   ```json
   "electron:build": "NODE_ENV=production npm run build && electron-builder"
   ```

3. 修改 `electron/main.ts` 使用 `import.meta.env.PROD`（Vite 编译时常量）：
   ```ts
   const isDev = !import.meta.env.PROD && !app.isPackaged
   ```

**验证方法：** 检查构建后的 `dist-electron/main.js`：
- 正确：`~0.9 kB`、单字母变量（`e`, `o`, `n` 等）、只有 `loadFile`、无 `localhost` 字符串
- 错误：变量名未混淆（`electron`, `BrowserWindow`）、含 `localhost`、`loadURL`

---

## 2. asar 打包导致 HTML 相对资源路径失效

**现象：** exe 打开空白页，但 localhost:5173 问题修复后仍无效。检查发现 `win-unpacked/resources/app.asar` 内包含所有文件。

**分析：** Electron 的 asar 打包将所有文件压入虚拟文件系统。当 `index.html` 内通过 `./assets/index-xxx.js` 等相对路径引用资源时，Chromium 在解析 asar 内部文件时无法正确处理相对路径。

**修复方案：** `asar: false`（不解包整个 app），所有文件直接放在文件系统上：

```json
{
  "asar": false,
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "public/**/*"
  ]
}
```

**验证方法：** 检查 `win-unpacked/resources/app/` 目录是否存在且包含 `dist/`、`dist-electron/`、`node_modules/` 等完整文件结构。

---

## 3. Windows 构建在 Apple Silicon Mac 上缺少 Wine/NSIS 支持

**现象：** electron-builder 报错 `cannot execute wine64: bad CPU type in executable`。

**根因：** Apple Silicon Mac 无法运行 x86_64 的 Wine 和 NSIS（makensis）二进制。electron-builder 的 Windows 打包依赖这两个工具做签名和安装程序生成。

**绕过方案：** 使用 `dir` target（只打包不解包），跳过 NSIS 生成步骤：

```json
"win": {
  "target": ["dir"],
  "defaultArch": "x64",
  "signAndEditExecutable": false
}
```

最终分发形式为 zip 压缩包，用户解压后直接运行 `.exe`。

---

## 4. 菜单栏和 DevTools 在打包后仍然可见

**现象：** 打包后 exe 打开时，顶部菜单栏可见，DevTools 窗口自动弹出。

**根因：**
- `autoHideMenuBar: false`（应为 `true`）
- `win.webContents.openDevTools()` 无条件调用，打包后仍执行

**修复：** `electron/main.ts` 中：
```ts
autoHideMenuBar: true,
// ...
if (isDev) {
  win.loadURL('http://localhost:5173')
} else {
  // openDevTools() 移除，autoHideMenuBar 已设为 true
}
```

---

## 5. WASM 文件路径在打包后失效

**现象：** 数据库初始化失败，WASM 文件加载 404。

**根因：** `src/db/index.ts` 中使用绝对路径 `fetch('/sql-wasm.wasm')`。打包后 Electron 使用 `file://` 协议，绝对路径无法映射到 asar 或 unpacked 目录内的文件。

**修复：**
```ts
const wasmResponse = await fetch(new URL('./sql-wasm.wasm', window.location.href).href)
```
`window.location.href` 在 Electron 打包后为 `file://.../index.html`，配合 `new URL('./...', ...)` 可正确解析相对路径。

---

## 6. Windows 架构打包错误（arm64 vs x64）

**现象：** Windows x64 用户下载 zip 解压后 exe 无法启动，或启动后空白页。

**根因：** 在 Apple Silicon Mac 上执行 `npx electron-builder --win` 时，未显式指定架构，默认使用当前机器的架构（arm64）作为 target 架构。导致打包出的 `win-unpacked` 目录内为 ARM64 二进制，在 x64 Windows 上无法运行。

**修复：** 明确指定 x64 架构：
```bash
npx electron-builder --win --x64
```

**验证方法：** 检查 `win-unpacked/Precision Curator.exe` 文件属性，或任务管理器中查看进程架构。也可在 Windows 上查看日志输出的 `__dirname` 和 `isDev` 值确认打包配置。

---

## 经验总结：为什么空白页问题反复出现

这是一个**多层级、跨工具链的问题**，每次只修了表面，没有验证打包产物：

| 迭代 | 表面修复 | 遗漏的验证 |
|------|----------|------------|
| 1 | 关闭 asar | 没验证路径是否正确 |
| 2 | 修 loadURL | 没停止 dev server，main.js 被覆盖 |
| 3 | 关闭 DevTools | 调试代码没删干净 |
| 4 | 打开 DevTools | 打包 arch 用错（arm64） |

### 根因

1. **工具链干扰**：`vite-plugin-electron` 的 watch 模式在后台持续运行，检测到文件变化后用开发配置覆盖 production 构建。
2. **验证缺失**：没有检查打包产物的实际内容，直接交给用户测试，浪费迭代周期。
3. **跨平台打包认知不足**：Apple Silicon Mac 无法打包 x64 Windows 应用，需要显式指定架构。

### 教训

- 每次打包后，**必须检查** `dist-electron/main.js` 的内容（大小、变量名、是否含 localhost）
- 跨平台打包时，**明确指定目标架构**，不要依赖默认值
- 发给用户前先本地解压运行验证，不要直接丢 zip 让用户当小白鼠

---

## 多平台分发架构

当前 Release 包含三个构建产物：

| 文件 | 平台 | 架构 | 适用场景 |
|------|------|------|----------|
| `Precision Curator-1.0.0-arm64.dmg` | macOS | ARM64 | Apple Silicon Mac |
| `PrecisionCurator-1.0.0-win64.zip` | Windows | x64 | Intel/AMD 64位 Windows |
| `PrecisionCurator-1.0.0-win-arm64.zip` | Windows | ARM64 | ARM Windows (Surface Pro X 等) |

**注意**：在 macOS 上打包 Windows 应用时，必须使用 `--x64` 或 `--arm64` 显式指定目标架构，否则默认使用当前机器架构，导致另一架构 Windows 用户无法使用。
---

## 7. 重置按钮只重置了一项进度

**现象：** 点击重置按钮，只有"质量审计"进度归零，其他三项（底层架构、UI-UX设计、工程开发）没有归零。

**根因：** `onReset` 中使用循环调用 `handleSubProgressChange`：

```tsx
onReset={() => {
  handleProgressChange(0)
  ;(['architecture', 'uiux', 'engineering', 'qa'] as const).forEach((key) => {
    handleSubProgressChange(key, 0)
  })
}}
```

问题在于 `handleSubProgressChange` 每次都是基于 `project.subProgress` 构建新对象：

```tsx
const handleSubProgressChange = (key, value) => {
  updateProject(project.id, {
    subProgress: { ...project.subProgress, [key]: value },  // 读取的是捕获时的旧值
    ...
  })
}
```

由于 React 的闭包特性，循环中每次调用 `handleSubProgressChange` 读取的 `project.subProgress` 都是同一个旧快照（四个值都是非零），导致每次更新都基于旧值写入，最终只生效最后一次（或完全覆盖）。

**修复：** 改为一次性更新 `progress` 和 `subProgress`：

```tsx
onReset={() => {
  updateProject(project.id, {
    progress: 0,
    subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
    updatedAt: new Date().toISOString(),
  })
}}
```

**教训：** 需要一次性更新多个相关状态时，应合并为一次 `updateProject` 调用，而不是拆成多次循环调用，否则 React 闭包会导致读取到陈旧的状态快照。
