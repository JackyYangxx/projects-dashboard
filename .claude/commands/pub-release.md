# pub-release — 构建新的 release 版本并推送至 GitHub Release

## 执行步骤

### 1. 读取当前版本号

从 `package.json` 读取 `version` 字段，获取当前版本号（如 `1.0.11`）。

### 2. 计算新版本号

自动 bump patch 版本号：`1.0.11` → `1.0.12`。

### 3. 更新 package.json

将 `version` 字段更新为新版本号。

### 4. 提交版本 bump

```bash
git add package.json
git commit -m "chore: bump version to ${NEW_VERSION}"
```

### 5. 推送到远程

```bash
git push origin main
```

### 6. 创建并推送 tag

```bash
git tag "v${NEW_VERSION}"
git push origin "v${NEW_VERSION}"
```

### 7. 本地构建

```bash
rm -rf dist dist-electron release && npm run electron:build
```

electron-builder 在 macOS 上交叉编译 Windows x64 ZIP（`electron-builder.yml` 已配置 `win.target: zip/x64`）。

### 8. 创建 Release 并上传

```bash
gh release create "v${NEW_VERSION}" release/*.zip --title "v${NEW_VERSION}" --notes "Release v${NEW_VERSION}"
```

`gh release create` 直接创建**正式发布**（非 draft）。

### 9. 报告结果

输出 release 页面链接：
`https://github.com/JackyYangxx/projects-dashboard/releases/tag/v${NEW_VERSION}`
