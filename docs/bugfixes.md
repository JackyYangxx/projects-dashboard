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
         // ...
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
   或者直接只依赖 `app.isPackaged`：
   ```ts
   const isDev = !app.isPackaged
   ```

**验证方法：** 检查构建后的 `dist-electron/main.js`：
- 正确：`0.89 kB`、单字母变量（`e`, `o`, `n` 等）、只有 `loadFile`、无 `localhost` 字符串
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

## 总结

| # | 问题 | 根因 | 修复 |
|---|---|---|---|
| 1 | 打包后空白（localhost） | watch 模式覆盖了 production main.js | `define` 替换 + `NODE_ENV=production` 构建 |
| 2 | asar 内相对路径失效 | Chromium 无法解析 asar 内相对 URL | `asar: false` |
| 3 | Apple Silicon 无法 build Windows NSIS | x86_64 only 二进制 | `target: ["dir"]` 跳过 NSIS |
| 4 | 菜单栏和 DevTools 可见 | 配置错误 | `autoHideMenuBar: true` + 移除 `openDevTools()` |
| 5 | WASM 加载 404 | 绝对路径在 file:// 下失效 | 改用 `new URL('./...', window.location.href)` |
