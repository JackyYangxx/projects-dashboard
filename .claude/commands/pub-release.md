# pub-release — 构建新的 release 版本并推送至 GitHub Release

## 执行步骤

### 1. 检查并推送本地未提交的代码

```bash
git status
```

如果有未提交的代码变更（modified/untracked），先提交并推送：

```bash
git add <files>
git commit -m "<message>"
git push origin main
```

确保所有本地代码已同步到远程仓库后再继续。

### 2. 读取当前版本号

从 `package.json` 读取 `version` 字段，获取当前版本号（如 `1.0.11`）。

### 3. 计算新版本号

自动 bump patch 版本号：`1.0.11` → `1.0.12`。

### 4. 更新 package.json

将 `version` 字段更新为新版本号。

### 5. 提交版本 bump

```bash
git add package.json
git commit -m "chore: bump version to ${NEW_VERSION}"
```

### 6. 推送到远程

```bash
git push origin main
```

### 7. 创建并推送 tag

```bash
git tag "v${NEW_VERSION}"
git push origin "v${NEW_VERSION}"
```

### 8. 等待 CI 构建并自动发布

Tag 推送后，GitHub Actions (`build-windows.yml`) 自动：
- 在 Windows 环境构建 Electron 应用（NSIS 安装包）
- 创建并**直接发布**正式 release，附上 .exe 安装包

### 9. 报告结果

CI 完成后即可在以下链接查看已发布的 release：
`https://github.com/JackyYangxx/projects-dashboard/releases/tag/v${NEW_VERSION}`

> **注意**：NSIS 安装包无法在 macOS 上交叉编译，因此由 GitHub Actions 在 Windows runner 上完成构建。
