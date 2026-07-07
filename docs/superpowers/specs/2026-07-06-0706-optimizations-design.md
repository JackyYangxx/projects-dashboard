# 0706 优化方案设计文档

**日期:** 2026-07-06
**Spec:** `docs/PRD/0706-optimizations.md`

---

## 一、首页看板

### 1.1 初始化默认值

**需求:** 初始化时项目总预算为0，默认暂停状态

**设计:**
- `src/data/seedData.ts`: 示例项目 totalAmount=0, usedAmount=0, status='paused'
- `src/pages/ProjectForm.tsx`: 创建项目表单初始值 totalAmount: 0, usedAmount: 0, status: 'paused'

### 1.2 状态列

**需求:** 表格中新增一列，通过下拉选择修改项目状态

**设计:**
- ProjectTable 新增"状态"列（位于"进展"和"预算执行"之间，宽度 8%）
- 渲染 `<select>` 下拉，选项来自 VALID_STATUSES + STATUS_LABELS
- onChange 调用 `updateProject(id, { status })`
- select 样式匹配表格单元格风格
- 调整现有列宽百分比以容纳新列

### 1.3 负责人角色重命名

**需求:** 首页负责人改为"开发责任人"，当前负责人改为"业务责任人"放入战略团队

**设计:**
- ProjectTable 列头 "负责人" → "开发责任人"（数据仍来自 `project.leader`）
- 导入/导出 headers 同步更新
- ProjectDetail 团队区域展示"业务责任人"角色，战略团队展示开发团队内容

---

## 二、项目详情

### 2.1 侧边栏路由高亮

**需求:** 进入项目详情页时，左侧菜单应有对应高亮

**设计:**
- Sidebar 新增 `{ label: '项目详情', icon: 'description', path: '/project' }` 导航项
- 高亮逻辑: `/project` 路径使用 `startsWith('/project')` 匹配，其他保持精确匹配
- 导航项位于"项目看板"下方

### 2.2 代码仓 ProjectId 字段

**需求:** 代码仓信息缺少 ProjectId 字段

**设计:**
- `Repository` 接口新增 `projectId?: string` 可选字段
- ProjectDetail 编辑模式: 新增 ProjectId 输入列
- ProjectDetail 只读模式: 展示 ProjectId（与 code/url/branch/note 同级）
- 导入/导出: 新增 "代码仓ProjectId1-3" 可选字段

### 2.3 多标签支持

**需求:** 标签支持多个，首页筛选支持按标签筛选

**设计:**
- **数据模型**: `tag: string` → `tags: string[]`
- **迁移**: projectDao.findAll() 检测旧 tag 字段，自动转换为 `tags: [tag]`
- **Dashboard 表格**: 项目名列下方展示多个标签 pill（最多2个，超出显示 "+N"）
- **ProjectDetail**: 标签编辑改为多标签输入（输入后回车添加，点击×删除）
- **Dashboard 筛选**: 月份筛选替换为标签筛选，收集所有唯一标签供选择
- **导入**: 标签以逗号分隔解析；导出: 标签以逗号连接

---

## 三、代码评审

### 3.1 项目选择表格

**需求:** 表格显示进行中的项目，包含项目名称、代码仓地址、分支、ProjectId、备注

**设计:**
- ProjectSelector 已筛选 `status === 'ongoing'`，保持不变
- 扩展表格列: 项目名称 | 代码仓地址 | 分支 | ProjectId | 备注
- 多仓库项目每个仓库一行展示

---

## 四、全局样式

### 4.1 标题栏颜色区分

**需求:** 标题栏颜色应区分内容栏

**设计:**
- 所有页面顶部导航栏背景从 `bg-white` 改为 `bg-surface-subtle` (#FAFAFA)
- 涉及: Dashboard Header, ProjectDetail top nav, ProjectForm top nav, CodeReview top nav, Settings top nav
- 内容卡片保持 `bg-white`，形成视觉层次

---

## 五、数据迁移

| 变更 | 策略 |
|------|------|
| tag → tags[] | findAll() 自动检测转换，JSON TEXT 存储 |
| Repository.projectId | 新可选字段，无需迁移 |
| 种子数据 | 更新默认值 |

---

## 六、测试策略

- **E2E 测试**: 通过 Chrome DevTools MCP 执行
- **存量测试**: 不允许修改
- **新增测试**: 覆盖所有需求区域
- **验证**: 截图对比 + 控制台无 error
