# Skill 批量上传功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 CodeReview 页面的 SkillPanel 添加多文件选择和拖拽上传功能，支持批量导入多个 Skill ZIP 包

**Architecture:** 复用现有 SkillPanel 组件，新增拖拽上传区域和文件列表状态。使用 JSZip 解析 ZIP 包，提取 .txt/.md 文件作为 prompt 内容。

**Tech Stack:** React, TypeScript, JSZip, 现有 codeReviewStore

---

## 文件结构

- `src/pages/CodeReview.tsx` - 修改 SkillPanel 组件
- `src/types/index.ts` - 已有的 Skill 类型
- `package.json` - 新增 jszip 依赖

---

### Task 1: 安装 JSZip 依赖

- [ ] **Step 1: 安装 jszip**

Run: `npm install jszip @types/jszip --save`

Expected: 安装成功，无 error

---

### Task 2: 添加批量上传状态到 SkillPanel

**Files:**
- Modify: `src/pages/CodeReview.tsx:125-202`

- [ ] **Step 1: 添加文件列表状态**

在 SkillPanel 函数内，form state 后面添加：

```typescript
const [selectedFiles, setSelectedFiles] = useState<File[]>([])
const [isDragging, setIsDragging] = useState(false)
```

- [ ] **Step 2: 添加拖拽处理函数**

```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(true)
}

const handleDragLeave = () => {
  setIsDragging(false)
}

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
  const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.zip'))
  setSelectedFiles(prev => [...prev, ...files])
}

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : []
  setSelectedFiles(prev => [...prev, ...files])
}

const removeFile = (index: number) => {
  setSelectedFiles(prev => prev.filter((_, i) => i !== index))
}

const toggleFileSelect = (index: number) => {
  // toggle selection state handled by checkbox in UI
}
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/CodeReview.tsx package.json package-lock.json
git commit -m "feat(skill): add batch upload state and handlers"
```

---

### Task 3: 实现 ZIP 解析和 Skill 导入逻辑

**Files:**
- Modify: `src/pages/CodeReview.tsx`

- [ ] **Step 1: 添加 JSZip 导入**

在文件顶部添加：

```typescript
import JSZip from 'jszip'
```

- [ ] **Step 2: 添加解析函数**

```typescript
const parseSkillFromZip = async (file: File): Promise<{ name: string; description?: string; content: string } | null> => {
  try {
    const zip = await JSZip.loadAsync(file)
    const txtFile = zip.file(/\.txt$/) || zip.file(/\.md$/)
    if (!txtFile) return null

    const content = await txtFile.async('string')
    const name = file.name.replace(/\.zip$/i, '')

    return {
      name,
      description: `从 ${file.name} 导入`,
      content: content.trim(),
    }
  } catch (err) {
    console.error('[Skill] Failed to parse zip:', file.name, err)
    return null
  }
}
```

- [ ] **Step 3: 添加批量导入函数**

```typescript
const handleBatchImport = async () => {
  const checkedFiles = selectedFiles.filter((_, i) => checkedFiles.includes(i))
  let successCount = 0

  for (const file of checkedFiles) {
    const skillData = await parseSkillFromZip(file)
    if (skillData) {
      addSkill({ ...skillData, enabled: true })
      successCount++
    }
  }

  setSelectedFiles([])
  setCheckedFiles([])
  alert(`成功导入 ${successCount} 个 Skill`)
}
```

需要同时添加 `checkedFiles` state：

```typescript
const [checkedFiles, setCheckedFiles] = useState<number[]>([])
```

- [ ] **Step 4: 提交**

```bash
git add src/pages/CodeReview.tsx
git commit -m "feat(skill): add zip parsing and batch import logic"
```

---

### Task 4: 更新 SkillPanel UI

**Files:**
- Modify: `src/pages/CodeReview.tsx:139-177` (showForm 区域)

- [ ] **Step 1: 替换上传表单 UI**

将原来的 textarea 替换为拖拽区域 + 文件列表：

```typescript
{showForm && (
  <div className="space-y-2 mb-3">
    {/* 拖拽区域 */}
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-outline hover:border-primary-500'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".zip"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="skill-zip-upload"
      />
      <label htmlFor="skill-zip-upload" className="cursor-pointer">
        <div className="text-2xl mb-2">📦</div>
        <p className="text-sm text-on-surface-secondary">点击或拖拽 ZIP 文件到此处</p>
        <p className="text-xs text-on-surface-tertiary mt-1">支持多文件同时选择</p>
      </label>
    </div>

    {/* 文件列表 */}
    {selectedFiles.length > 0 && (
      <div className="bg-surface-secondary rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center text-xs text-on-surface-tertiary mb-2">
          <span>已选择 {selectedFiles.length} 个文件</span>
          <button onClick={() => setSelectedFiles([])} className="text-primary-500 hover:underline">清空</button>
        </div>
        {selectedFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checkedFiles.includes(index)}
                onChange={() => {
                  if (checkedFiles.includes(index)) {
                    setCheckedFiles(checkedFiles.filter(i => i !== index))
                  } else {
                    setCheckedFiles([...checkedFiles, index])
                  }
                }}
              />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-on-surface-tertiary">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              onClick={() => removeFile(index)}
              className="text-xs text-red-500 hover:underline"
            >
              移除
            </button>
          </div>
        ))}
        <button
          onClick={handleBatchImport}
          disabled={checkedFiles.length === 0}
          className="w-full mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm disabled:opacity-50"
        >
          导入选中 ({checkedFiles.length})
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/CodeReview.tsx
git commit -m "feat(skill): update SkillPanel UI with drag-drop and file list"
```

---

## 验证步骤

1. 打开 CodeReview 页面
2. 点击 Skill 面板的"+ 上传"按钮
3. 验证拖拽区域显示
4. 拖拽或选择多个 ZIP 文件
5. 验证文件列表正确显示
6. 点击导入，验证 Skill 添加到列表