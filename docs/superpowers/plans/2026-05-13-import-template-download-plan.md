# 导入模版下载功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Dashboard 页面的"导入"按钮增加下拉菜单，包含"导入项目"和"下载导入模版"两个选项。下载的模版包含所有字段（必填+可选），必填字段用 `*` 标记，示例行必填单元格有灰色背景。

**Architecture:** 将现有"导入"按钮改为 SplitButton 样式（按钮 + 下拉箭头），点击展开下拉菜单。选择"下载导入模版"后，使用 xlsx 库生成 Excel 文件并触发浏览器下载。

**Tech Stack:** React, xlsx, Material Symbols Icons

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/pages/Dashboard.tsx` | 修改 - 添加下拉菜单状态、下拉箭头、菜单项、下载模版函数 |
| `src/constants/project.ts` | 只读 - 提供 `IMPORT_REQUIRED_HEADERS` 和 `IMPORT_OPTIONAL_HEADERS` |

---

## 任务清单

### Task 1: 添加下拉菜单状态和 UI

**Files:**
- Modify: `src/pages/Dashboard.tsx:212-236`

- [ ] **Step 1: 读取当前按钮区域的完整代码**

读取 Dashboard.tsx 第 200-280 行，理解现有导入/导出/新增项目按钮的结构。

- [ ] **Step 2: 添加下拉菜单状态**

在 Dashboard 组件内添加状态：
```tsx
const [showImportMenu, setShowImportMenu] = useState(false)
```

在 `useEffect` 中添加点击空白处关闭菜单的逻辑：
```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (showImportMenu && !(e.target as Element).closest('.import-menu-trigger')) {
      setShowImportMenu(false)
    }
  }
  document.addEventListener('click', handleClickOutside)
  return () => document.removeEventListener('click', handleClickOutside)
}, [showImportMenu])
```

- [ ] **Step 3: 将"导入"按钮改为 SplitButton 样式**

将：
```tsx
<button onClick={handleImport} ...>
  <Icon name="upload_file" size={16} />
  导入
</button>
```

改为：
```tsx
<div className="relative import-menu-trigger">
  <button
    onClick={() => setShowImportMenu(!showImportMenu)}
    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-outline text-on-surface-primary rounded-xl text-sm font-body font-medium hover:bg-surface-hover transition-all duration-200 cursor-pointer"
  >
    <Icon name="upload_file" size={16} />
    导入
    <Icon name="expand_more" size={12} />
  </button>

  {showImportMenu && (
    <div className="absolute top-full left-0 mt-1 bg-white border border-outline rounded-xl shadow-lg py-1 min-w-[140px] z-50">
      <button
        onClick={() => { handleImport(); setShowImportMenu(false); }}
        className="w-full px-3 py-2 text-left text-sm font-body text-on-surface-primary hover:bg-surface-hover flex items-center gap-2"
      >
        <Icon name="upload_file" size={14} />
        导入项目
      </button>
      <button
        onClick={() => { handleDownloadTemplate(); setShowImportMenu(false); }}
        className="w-full px-3 py-2 text-left text-sm font-body text-on-surface-primary hover:bg-surface-hover flex items-center gap-2"
      >
        <Icon name="download" size={14} />
        下载导入模版
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 4: 验证编译**

运行 `npm run dev` 确认无语法错误。

---

### Task 2: 实现 handleDownloadTemplate 函数

**Files:**
- Modify: `src/pages/Dashboard.tsx` - 在 handleExport 函数附近添加新函数

- [ ] **Step 1: 在 handleExport 函数下方添加模版下载函数**

```tsx
const handleDownloadTemplate = () => {
  const allHeaders = [
    ...IMPORT_REQUIRED_HEADERS.map(h => ({ name: h, required: true })),
    ...IMPORT_OPTIONAL_HEADERS.map(h => ({ name: h, required: false })),
  ]

  // 表头行：必填字段加 *
  const headerRow = allHeaders.map(h => (h.required ? `${h.name}*` : h.name))

  // 示例数据行
  const sampleRow = allHeaders.map(h => {
    if (h.required) {
      // 必填字段示例值
      const examples: Record<string, string> = {
        '项目名称': '示例项目',
        '产品线': '示例产品线',
        '负责人': '张三',
        '总预算': '100000',
        '已用预算': '50000',
      }
      return examples[h.name] || ''
    }
    return ''
  })

  // 构建工作簿
  const wsData = [headerRow, sampleRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 为必填字段示例单元格添加灰色背景 (Fill)
  const requiredIndices = allHeaders.map((h, i) => h.required ? i : -1).filter(i => i >= 0)
  wsData.forEach((row, rowIdx) => {
    if (rowIdx === 1) { // 示例行
      requiredIndices.forEach(colIdx => {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c: colIdx })
        if (!ws[cellRef]) ws[cellRef] = {}
        ws[cellRef].s = { fill: { fgColor: { rgb: 'E0E0E0' } } }
      })
    }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '导入模版')
  XLSX.writeFile(wb, '导入模版.xlsx')
}
```

- [ ] **Step 2: 在组件顶部确保 xlsx 已导入**（已有，无需修改）

- [ ] **Step 3: 验证编译和功能**

运行 `npm run dev`，在浏览器中点击"导入"按钮，验证：
1. 下拉菜单正常展开
2. 点击"下载导入模版"能下载 Excel 文件
3. Excel 包含 7 个字段，必填字段有 `*` 标记

---

## 验收标准检查清单

- [ ] Task 1 完成：下拉菜单状态管理正常，UI 正确渲染
- [ ] Task 2 完成：下载的 Excel 包含所有 7 个字段
- [ ] 必填字段（5个）在表头有 `*` 标记
- [ ] 示例行必填单元格有灰色背景（`E0E0E0`）
- [ ] 点击空白处关闭下拉菜单
- [ ] 点击"导入项目"正常执行原有导入功能

---

## 注意事项

1. 下拉菜单使用绝对定位，`z-index: 50` 确保在内容之上
2. 菜单 hover 态使用 `bg-surface-hover`（项目已有样式变量）
3. 点击"导入项目"后关闭菜单，点击"下载导入模版"后也关闭菜单
4. 示例行数据仅用于提示格式，实际导入时用户需自行填写