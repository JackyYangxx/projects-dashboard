# Issue List - Precision Curator

**测试日期：** 2026-04-17
**测试人员：** tester (via chrome-devtools MCP)

---

## Issue #1: WASM 数据库初始化失败

**严重程度：** 🔴 严重

**问题描述：**
控制台报错 WebAssembly 初始化失败，导致数据库无法加载，页面显示"项目总数 0"和"暂无项目数据"。

**控制台错误信息：**
```
msgid=6 [error] wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type. Expected 'application/wasm'.
msgid=7 [error] falling back to ArrayBuffer instantiation
msgid=8 [error] Failed to load resource: the server responded with a status of 404 (Not Found)
msgid=9 [error] failed to asynchronously prepare wasm: CompileError: WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 44 4f @+0
msgid=10 [error] Aborted(CompileError: WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 44 4f @+0)
```

**根本原因分析：**
- WASM 文件存在于 `public/sql-wasm.wasm`（658KB）
- 通过 `http://localhost:5173/sql-wasm.wasm` 可以正常访问（HTTP 200, Content-Type: application/wasm）
- 但 sql.js 在尝试通过 `locateFile` 加载时可能存在路径或缓存问题
- 错误信息 `3c 21 44 4f` 是 `<!DO` 的十六进制，说明实际收到的是 HTML 内容（可能是 404 页面）

**预期行为：**
- Dashboard 页面应显示 3 个预置项目
- 显示项目总数、进行中项目数、预算执行率等统计数据

**实际行为：**
- 页面显示"项目总数 0"
- 显示"暂无项目数据"
- 数据库操作为空

**修复建议：**
1. ~~检查 `src/db/index.ts` 中 `locateFile` 的实现，确保正确返回 `/sql-wasm.wasm`~~
2. ~~考虑添加错误处理和重试机制~~
3. ~~验证 Vite 开发服务器的 WASM 传输配置~~

**✅ 已修复 (2026-04-17)：**
- 使用 `wasmBinary` + `fetch` 替代 `locateFile`
- 添加 `initDatabase` 共享 promise 避免竞态条件
- 修复 `findAll()` snake_case → camelCase 转换问题
- 页面现在正确显示 3 个项目

---

## Issue #2: 表单字段缺少 id/name 属性

**严重程度：** 🟡 中等

**问题描述：**
控制台有 3 个表单字段缺少 id 或 name 属性的警告。

**控制台信息：**
```
msgid=12 [issue] A form field element should have an id or name attribute (count: 3)
```

**位置：** 可能是搜索框或筛选器表单

**修复建议：**
为所有表单字段添加 `id` 或 `name` 属性

**✅ 已修复 (2026-04-17)：**
- Header 搜索框：`id="search"`
- 月份筛选：`id="monthFilter"`, `name="monthFilter"`
- 状态筛选：`id="statusFilter"`, `name="statusFilter"`

---

## Issue #3: React Router 升级警告

**严重程度：** 🟢 低

**问题描述：**
React Router 6 有两个 future flag 警告，建议在 v7 之前处理。

**控制台信息：**
```
msgid=3 [warn] React Router Future Flag Warning: v7_startTransition
msgid=4 [warn] React Router Future Flag Warning: v7_relativeSplatPath
```

**修复建议：**
在升级到 React Router v7 前，评估并添加相应的 future flag 配置

**✅ 已修复 (2026-04-17)：**
- `App.tsx` 添加 `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`

---

## Issue #4: 新增项目按钮缺少点击处理程序

**严重程度：** 🟡 中等

**问题描述：**
Dashboard 页面上的"新增项目"按钮点击后没有任何响应，缺少 onClick 处理程序。

**测试结果：**
```
=== Test 6: Create button check ===
⚠ No modal opened after clicking '新增项目' - handler may be missing
✗ FAIL: Create button
```

**根本原因分析：**
在 `src/pages/Dashboard.tsx` 第 62-65 行：
```tsx
<button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors">
  <span className="material-symbols-outlined text-lg">add</span>
  新增项目
</button>
```
按钮没有 `onClick` 属性绑定到任何处理函数。

**预期行为：**
点击"新增项目"按钮应打开一个模态框或表单，允许用户创建新项目。

**实际行为：**
点击按钮后无任何响应。

**修复建议：**
1. 创建一个 ProjectForm 组件（模态框或表单页面）
2. 在 Dashboard 中添加状态管理 `const [showForm, setShowForm] = useState(false)`
3. 绑定按钮的 onClick: `onClick={() => setShowForm(true)}`
4. 使用 `addProject` store action 处理表单提交

**相关代码：**
- `src/store/projectStore.ts:40-52` - `addProject` action 已存在
- `src/db/projectDao.ts:93-125` - `create` DAO 函数已存在

**✅ 已修复 (2026-04-17)：**
- 新建 `src/pages/ProjectForm.tsx` - 独立表单页面
- 修改 `src/App.tsx` - 添加 `/project/new` 路由
- 修改 `src/pages/Dashboard.tsx` - 按钮添加 `onClick={() => navigate('/project/new')}`
- 表单提交后跳转到 Dashboard 并显示新项目

---

## Issue #6: 点击列表编辑按钮应跳转到编辑状态

**严重程度：** 🟡 中等

**问题描述：**
在项目列表中点击"编辑"按钮后，跳转到的是项目查看状态，而非编辑状态。

**预期行为：**
点击"编辑"按钮应跳转到项目编辑模式。

**实际行为：**
点击"编辑"按钮跳转到项目查看模式。

**修复建议：**
1. 检查 Dashboard 或 ProjectTable 中的编辑按钮绑定
2. 确认路由是否正确传递编辑状态参数

**✅ 已修复 (2026-04-18)：**
- Dashboard handleEdit 导航到 `/project/${id}?edit=true`
- ProjectDetail 使用 useEffect 在挂载时从 URL 读取 edit 参数初始化 isReadOnly
- 提交 `c6cc07f` (Issue #6)
- 提交 `f9f77a3` (Issue #9 - 修复 isReadOnly 被 URL 覆盖的问题)

---

## Issue #7: 预算统计在编辑状态下没有正确回显数值

**严重程度：** 🟡 中等

**问题描述：**
项目详情页中的预算统计卡片，在编辑状态下数值没有正确回显。

**预期行为：**
编辑状态下应显示当前已保存的预算数值。

**实际行为：**
数值未正确回显或显示为空。

**修复建议：**
检查 BudgetCard 组件在 edit 模式下的 value 回显逻辑。

**✅ 已修复 (2026-04-18)：**
- 使用 useEffect + useRef 监听 isReadOnly 从 true 变为 false 时初始化 budgetEditTotal 和 budgetEditUsed
- 提交 `0ccf1a5`

---

## Issue #8: 笔记历史未正确解析 Markdown 格式

**严重程度：** 🟡 中等

**问题描述：**
笔记历史中显示的内容没有正确解析项目笔记编辑时的加粗和斜体 Markdown 格式。

**预期行为：**
`*bold*` 和 `_italic_` 应分别显示为加粗和斜体。

**实际行为：**
Markdown 格式未解析，直接显示原始文本。

**修复建议：**
在 Timeline 或笔记历史组件中添加 Markdown 解析器（如 marked + DOMPurify）。

**✅ 已修复 (2026-04-18)：**
- 安装 marked + dompurify
- 使用 marked.parse() 解析 + DOMPurify.sanitize() 防止 XSS
- 提交 `a6e64f5`

---

## Issue #9: isReadOnly 状态在切换后被 URL 参数覆盖

**严重程度：** 🔴 严重

**问题描述：**
当通过 `?edit=true` URL 参数进入编辑模式后，点击切换按钮（从"查看"到"编辑"）切换到查看模式，但状态没有正确保持。页面重渲染后，`isReadOnly` 又被 URL 参数覆盖回 `false`。

**根本原因：**
`isReadOnly` 初始值直接使用 `useState(searchParams.get('edit') !== 'true')`，每次渲染时 `searchParams.get('edit')` 表达式都会被重新评估（虽然 `useState` 只在首次渲染时使用初始值，但在某些情况下可能导致问题）。

**修复方案：**
使用 `useEffect` + 空依赖数组，在组件首次挂载时从 URL 读取参数作为初始值，之后不再受 URL 影响：
```typescript
const [isReadOnly, setIsReadOnly] = useState(true)
useEffect(() => {
  setIsReadOnly(searchParams.get('edit') !== 'true')
}, []) // 空 deps = 只在挂载时执行一次
```

**修复文件：** `src/pages/ProjectDetail.tsx`

**提交：** `f9f77a3`
