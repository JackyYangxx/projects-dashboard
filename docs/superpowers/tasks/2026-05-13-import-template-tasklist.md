# 导入模版下载功能任务清单

**功能概述：** Dashboard 页面"导入"按钮改为 SplitButton 样式，点击展开下拉菜单，包含"导入项目"和"下载导入模版"两个选项。下载的模版包含所有字段（必填+可选），必填字段用 `*` 标记，示例行必填单元格有灰色背景。

**依赖：** `src/constants/project.ts` 中的 `IMPORT_REQUIRED_HEADERS` 和 `IMPORT_OPTIONAL_HEADERS`（已存在）

---

## Task 1: 添加下拉菜单状态和 SplitButton UI

**文件修改:** `src/pages/Dashboard.tsx`

**依赖任务:** 无

**前置条件:** 读取 Dashboard.tsx 第 200-280 行，理解现有导入/导出/新增项目按钮结构

### Sub-tasks

- [ ] **1.1** 添加下拉菜单状态
  ```tsx
  const [showImportMenu, setShowImportMenu] = useState(false)
  ```

- [ ] **1.2** 添加点击空白处关闭菜单的 useEffect
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

- [ ] **1.3** 将"导入"按钮改为 SplitButton 样式，包含：
  - `.import-menu-trigger` 包装容器（用于 clickOutside 检测）
  - 主按钮：Icon `upload_file` + "导入" + Icon `expand_more`
  - 下拉菜单：`position: absolute`，`z-index: 50`
  - 菜单项 1：`upload_file` Icon + "导入项目"，点击触发 `handleImport` + 关闭菜单
  - 菜单项 2：`download` Icon + "下载导入模版"，点击触发 `handleDownloadTemplate` + 关闭菜单

- [ ] **1.4** 验证编译：`npm run dev` 无语法错误

### 验收标准
- [ ] 编译通过
- [ ] 点击"导入"按钮，菜单展开
- [ ] 点击空白处，菜单关闭
- [ ] 菜单项 hover 有 `bg-surface-hover` 效果

---

## Task 2: 实现 handleDownloadTemplate 函数

**文件修改:** `src/pages/Dashboard.tsx`

**依赖任务:** Task 1（需使用已添加的菜单状态）

### Sub-tasks

- [ ] **2.1** 确认 xlsx 已导入（应有 `import * as XLSX from 'xlsx'`）

- [ ] **2.2** 在 handleExport 函数附近添加 handleDownloadTemplate 函数：
  - 合并 `IMPORT_REQUIRED_HEADERS` 和 `IMPORT_OPTIONAL_HEADERS` 为完整表头
  - 表头行：必填字段加 `*` 后缀
  - 示例数据行：5 个必填字段有示例值，可选字段为空
  - 使用 `XLSX.utils.aoa_to_sheet` 构建工作表
  - 为示例行必填单元格设置灰色背景 `fgColor: { rgb: 'E0E0E0' }`
  - 使用 `XLSX.writeFile` 触发下载，文件名为 `导入模版.xlsx`

- [ ] **2.3** 验证编译：`npm run dev` 无语法错误

### 验收标准
- [ ] 编译通过
- [ ] 点击"下载导入模版"能触发浏览器下载
- [ ] 下载的 Excel 文件名为 `导入模版.xlsx`
- [ ] 表头包含全部 7 个字段
- [ ] 5 个必填字段表头有 `*` 标记
- [ ] 示例行必填单元格有灰色背景

---

## Task 3: 集成验证

**文件修改:** 无

**依赖任务:** Task 1 + Task 2

### 验收标准
- [ ] 下拉菜单可正常展开/收起
- [ ] 点击"导入项目"正常执行原有导入功能（菜单关闭）
- [ ] 点击"下载导入模版"正常下载 Excel（菜单关闭）
- [ ] 整个功能在 Vite dev server 下正常运行

---

## 任务依赖图

```
Task 1 (SplitButton UI)
    │
    └── Task 2 (handleDownloadTemplate)
              │
              └── Task 3 (集成验证)
```

**说明：** Task 2 依赖 Task 1 的菜单状态结构；Task 3 依赖 Task 1 + Task 2 完成后的完整功能。

---

## 技术备注

- 表格字段定义来源：`src/constants/project.ts`
  - `IMPORT_REQUIRED_HEADERS`: 项目名称, 产品线, 负责人, 总预算, 已用预算（5个）
  - `IMPORT_OPTIONAL_HEADERS`: 代码仓, 分支（2个）
- xlsx 库版本：已安装在项目中
- Material Symbols Icons：项目已有 `upload_file`, `expand_more`, `download`