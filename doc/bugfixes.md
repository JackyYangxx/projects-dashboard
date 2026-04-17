# Bug 修复记录 - Precision Curator

**日期：** 2026-04-17
**参与角色：** architect（架构审核）、tester（功能测试）、developer（开发修复）

---

## 问题 #1：WASM 文件加载依赖外部 CDN

**严重程度：** 🔴 严重

**问题描述：**
控制台报错 WebAssembly 初始化失败，页面显示"项目总数 0"，数据库未加载。

**错误信息：**
```
wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type.
falling back to ArrayBuffer instantiation
failed to asynchronously prepare wasm: CompileError: expected magic word 00 61 73 6d, found 3c 21 44 4f
```

**根本原因：**
`locateFile: (file) => '/sql-wasm.wasm'` 依赖 sql.js 内部 fetch，在某些环境下路径解析错误，返回 HTML 而非 WASM 二进制。

**修复方案：**
使用 `wasmBinary` + `fetch` 显式加载：
```typescript
const wasmResponse = await fetch('/sql-wasm.wasm')
if (!wasmResponse.ok) {
  throw new Error(`Failed to load WASM: ${wasmResponse.status}`)
}
const wasmBinary = await wasmResponse.arrayBuffer()
const SQL = await initSqlJs({ wasmBinary })
```

**修复文件：** `src/db/index.ts`

**提交：** `99fae8b`

---

## 问题 #2：initDatabase 时序问题（竞态条件）

**严重程度：** 🔴 严重

**问题描述：**
数据库初始化和 seed 数据插入后，页面仍显示"项目总数 0"。控制台显示 seed 已完成（Final project count: 3），但查询返回 0 条记录。

**根本原因：**
多个组件同时调用 `initDatabase()` 时，创建了多个独立的 DB 实例。seed 数据插入到实例 A，但查询在实例 B 中执行（为空）。

**修复方案：**
使用共享 promise 确保所有调用使用同一个 DB 实例：
```typescript
let db: Database | null = null
let dbPromise: Promise<Database> | null = null

export async function initDatabase(): Promise<Database> {
  if (dbPromise) return dbPromise
  dbPromise = doInitDatabase()
  return dbPromise
}
```

**修复文件：** `src/db/index.ts`

---

## 问题 #3：findAll() 类型转换错误

**严重程度：** 🔴 严重

**问题描述：**
数据库返回的列名是 snake_case（`product_line`, `total_amount`），但 TypeScript 类型期望 camelCase（`productLine`, `totalAmount`）。查询结果类型不匹配。

**修复方案：**
使用显式字段映射替代通用类型转换：
```typescript
return results[0].values.map((row) => {
  const columns = results[0].columns
  const rowObj: Record<string, unknown> = {}
  columns.forEach((col, i) => { rowObj[col] = row[i] })

  return {
    id: rowObj.id as string,
    name: rowObj.name as string,
    productLine: rowObj.product_line as string,
    totalAmount: rowObj.total_amount as number,
    // ... 其他字段
  }
})
```

**修复文件：** `src/db/projectDao.ts`

---

## 问题 #4：表单字段缺少 id/name 属性

**严重程度：** 🟡 中等

**问题描述：**
控制台有 3 个表单字段缺少属性的警告。

**修复方案：**
为表单字段添加 `id` 和 `name` 属性：
- 搜索框：`id="search"`
- 月份筛选：`id="monthFilter"`, `name="monthFilter"`
- 状态筛选：`id="statusFilter"`, `name="statusFilter"`

**修复文件：**
- `src/components/Header.tsx`
- `src/components/ProjectTable.tsx`

**提交：** `745db6c`

---

## 问题 #5：React Router v7 升级警告

**严重程度：** 🟢 低

**问题描述：**
React Router 6 有两个 future flag 警告。

**修复方案：**
在 `BrowserRouter` 添加 future props：
```tsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

**修复文件：** `src/App.tsx`

**提交：** `745db6c`

---

## 验证结果

| 验证项 | 结果 |
|--------|------|
| Dashboard 显示项目列表 | ✅ 3 个项目 |
| 统计数据正确 | ✅ 项目总数、进行中、预算执行率 |
| ProjectDetail 页面 | ✅ 完整显示 |
| 控制台错误 | ✅ 无错误 |

---

## 相关文件变更

| 文件 | 变更 |
|------|------|
| `src/db/index.ts` | WASM 加载、共享 promise |
| `src/db/projectDao.ts` | findAll 字段映射 |
| `src/components/Header.tsx` | 搜索框 id |
| `src/components/ProjectTable.tsx` | 筛选器 id/name |
| `src/App.tsx` | React Router future flags |
| `.mcp.json` | 新增 chrome-devtools MCP 配置 |
| `doc/issues.md` | 问题追踪文档 |
