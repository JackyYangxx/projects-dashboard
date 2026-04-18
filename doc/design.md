# Precision Curator - 项目管理控制台 设计方案

## 1. 概述

**项目名称：** Precision Curator（精准策展人）
**项目类型：** Electron 桌面应用
**核心功能：** 基于项目维度的离线项目管理控制台
**设计风格：** High-End Editorial，高端编辑风格，遵循设计系统文档

---

## 2. 技术架构

### 2.1 技术栈

| 层级 | 技术选型 | 版本 | 说明 |
|-----|---------|------|------|
| 桌面框架 | Electron | 最新稳定版 | 跨平台桌面应用框架 |
| 前端框架 | React | 18.x | TypeScript |
| UI 样式 | Tailwind CSS | 3.x | 直接复用设计稿配色和组件样式 |
| 构建工具 | Vite | 5.x | 快速开发构建 |
| 路由 | React Router | v6 | SPA 页面导航 |
| 状态管理 | Zustand | 4.x | 轻量级状态管理 |
| 本地存储 | sql.js | 1.x | SQLite WebAssembly，纯 JS 实现 |

### 2.2 项目结构

```
precision-curator/
├── electron/
│   ├── main.ts           # Electron 主进程
│   └── preload.ts        # 预加载脚本（暴露安全 API）
├── src/
│   ├── components/       # 公共组件
│   │   ├── Sidebar.tsx    # 侧边栏导航
│   │   ├── Header.tsx     # 顶部栏
│   │   ├── ProjectTable.tsx    # 项目表格
│   │   ├── StatsCard.tsx       # 统计卡片
│   │   ├── ProgressSlider.tsx  # 进度滑块
│   │   ├── RichTextEditor.tsx  # 富文本编辑器
│   │   └── Timeline.tsx        # 时间线
│   ├── pages/
│   │   ├── Dashboard.tsx      # 项目仪表盘
│   │   └── ProjectDetail.tsx  # 项目详情
│   ├── store/
│   │   └── projectStore.ts    # Zustand store
│   ├── db/
│   │   ├── index.ts           # 数据库初始化
│   │   └── projectDao.ts      # 项目数据访问对象
│   ├── types/
│   │   └── index.ts           # TypeScript 类型定义
│   ├── data/
│   │   └── seedData.ts        # 预置演示数据
│   ├── styles/
│   │   └── globals.css         # 全局样式
│   ├── App.tsx                # 应用入口（路由配置）
│   └── main.tsx               # React 渲染入口
├── public/
│   └── sql-wasm.wasm          # SQLite WebAssembly 文件
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── electron-builder.json
```

---

## 3. 数据模型

### 3.1 Project 接口

```typescript
interface Project {
  id: string;                    // UUID
  name: string;                  // 项目名称
  productLine: string;           // 产品线
  status: 'ongoing' | 'completed' | 'paused';  // 状态
  tag: string;                   // 标签（如"项目 A - 三月"）
  totalAmount: number;           // 总金额
  usedAmount: number;            // 已使用金额
  progress: number;              // 总体进度 0-100
  subProgress: SubProgress;     // 子进度
  notes: string;                // 项目笔记（HTML 格式）
  team: TeamMember[];           // 团队成员
  scope: ScopeItem[];           // 策展范围
  timeline: TimelineEvent[];    // 演进历程
  createdAt: string;            // ISO 时间戳
  updatedAt: string;            // ISO 时间戳
}

interface SubProgress {
  architecture: number;  // 底层架构 0-100
  uiux: number;          // UI/UX 设计 0-100
  engineering: number;   // 工程开发 0-100
  qa: number;           // 质量审计 0-100
}

interface TeamMember {
  id: string;
  name: string;         // 中英文姓名
  role: string;        // 职位
  avatar: string;      // 头像 URL
}

interface ScopeItem {
  icon: string;         // Material Symbols 图标名
  title: string;       // 标题
  description: string;  // 描述
  color: 'primary' | 'secondary' | 'tertiary' | 'outline';  // 边框颜色
}

interface TimelineEvent {
  date: string;         // 日期（如"2024年3月"）
  version: string;      // 版本号
  title: string;        // 版本标题
  items: string[];      // 更新项列表
  isActive: boolean;    // 是否当前版本
  isCompleted: boolean; // 是否已完成
}
```

### 3.2 数据库 Schema

**表：projects**

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_line TEXT DEFAULT '',
  status TEXT DEFAULT 'ongoing',
  tag TEXT DEFAULT '',
  total_amount REAL DEFAULT 0,
  used_amount REAL DEFAULT 0,
  progress INTEGER DEFAULT 0,
  sub_progress TEXT DEFAULT '{}',  -- JSON
  notes TEXT DEFAULT '',
  team TEXT DEFAULT '[]',          -- JSON 数组
  scope TEXT DEFAULT '[]',         -- JSON 数组
  timeline TEXT DEFAULT '[]',      -- JSON 数组
  created_at TEXT,
  updated_at TEXT
);
```

---

## 4. 页面与路由

| 路径 | 页面组件 | 说明 |
|-----|---------|------|
| `/` | Dashboard | 项目仪表盘（dashboard_1 设计） |
| `/project/:id` | ProjectDetail | 项目详情页（project_details 设计） |

### 4.1 Dashboard 页面

**布局：**
- 固定左侧侧边栏（宽 256px）
- 右侧主内容区（margin-left: 256px）

**侧边栏内容：**
- Logo + 应用名称
- 导航菜单：项目概览、项目库、数据分析、团队管理
- 底部：帮助中心、退出登录

**顶部栏：**
- 当前页面标题面包屑
- 搜索框（预留功能）
- 通知图标、设置图标、用户头像

**主体内容：**
1. **页面标题区：** "业务概览" + 新增项目按钮
2. **统计卡片（3列）：**
   - 项目总数（带增长率）
   - 进行中（带本周到期数）
   - 全局预算执行率（带进度条）
3. **项目表格：**
   - 筛选器：月份下拉、状态下拉、筛选按钮
   - 表格列：项目名称、产品线、负责人、总金额、已使用金额、预算执行率、操作
   - 分页组件

### 4.2 ProjectDetail 页面

**布局：** 全宽布局，无侧边栏

**顶部导航栏：**
- 返回仪表盘按钮
- 项目 ID 显示

**主体内容（Bento 网格）：**
1. **进度跟踪区域（8列）：**
   - 进度动态标题 + 百分比显示
   - 可拖动进度滑块
   - 最后更新时间
   - 四个子进度卡片（底层架构/UI-UX设计/工程开发/质量审计）

2. **预算统计面板（4列）：**
   - 蓝色背景
   - 总金额
   - 已使用金额及百分比

3. **富文本编辑器（12列）：**
   - 工具栏：粗体、斜体、列表、链接、图片
   - 可编辑内容区

4. **战略团队（5列）：**
   - 团队成员卡片列表
   - 添加成员按钮

5. **策展范围（7列）：**
   - 四个范围卡片（AI智能策展/全渠道互联/隐私保护层/开放式框架）

6. **演进历程（12列）：**
   - 按月/按季度切换
   - 时间线节点

---

## 5. 核心功能

### 5.1 项目 CRUD

| 操作 | 触发方式 | 响应 |
|-----|---------|------|
| 创建 | Dashboard 新增项目按钮 | 打开创建表单/弹窗 |
| 读取 | 页面加载 | 从 sql.js 查询并渲染 |
| 更新 | 编辑按钮/表单提交 | 更新数据库 + 同步 Zustand store |
| 删除 | 删除按钮 | 确认弹窗后删除 |

### 5.2 进度更新

- 拖动进度滑块时实时更新百分比显示
- 更新日志显示最后调整时间
- 数据自动保存

### 5.3 搜索与筛选

- 月份筛选
- 状态筛选（进行中/已完成/暂停中）
- 前端实时筛选

### 5.4 分页

- 每页显示固定数量项目
- 页码导航

---

## 6. 状态管理

### 6.1 Zustand Store 结构

```typescript
interface ProjectStore {
  // 状态
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
}
```

### 6.2 持久化策略

- 初始化时从 sql.js 加载数据到 store
- 每次 CRUD 操作后同步更新数据库和 store

---

## 7. 数据库操作

### 7.1 sql.js 初始化

```typescript
// 初始化流程
1. 加载 sql-wasm.wasm 文件
2. 创建数据库实例
3. 执行建表 SQL（如不存在）
4. 加载预置数据（如数据库为空）
5. 渲染应用
```

### 7.2 预置演示数据

应用首次启动时，如数据库为空，自动插入以下示例项目：

| 项目名称 | 产品线 | 标签 | 总金额 | 进度 |
|---------|-------|------|-------|------|
| 战略品牌重塑 | 营销云 | 项目 A - 三月 | ￥2,240,000 | 75% |
| 次世代界面设计 | UI 系统 | 项目 B - 五月 | ￥1,916,000 | 42% |
| 全球扩张路线图 | 运营策略 | 项目 C - 七月 | ￥40,600,000 | 10% |

---

## 8. Electron 配置

### 8.1 主进程职责

- 创建 BrowserWindow
- 管理应用生命周期
- 注册 IPC 通信处理
- 单例锁：防止多窗口，通过 `requestSingleInstanceLock()` 实现

### 8.2 预加载脚本

暴露安全的 API 给渲染进程：
- `window.electronAPI.db.*` - 数据库操作

### 8.3 窗口配置

```typescript
{
  width: 1400,
  height: 900,
  minWidth: 1280,
  minHeight: 800,
  webPreferences: {
    preload: 'preload.js',
    contextIsolation: true,
    nodeIntegration: false
  }
}
```

---

## 9. 打包配置

使用 electron-builder：

- 目标平台：macOS（.dmg）、Windows（.exe）
- 应用图标：自定义
- 代码签名：预留

---

## 10. 设计系统遵循

### 10.1 颜色系统

直接复用设计稿 Tailwind 配置中的颜色变量。

### 10.2 字体

- 标题/数字：Manrope
- 正文/标签：Inter

### 10.3 组件规范

- 无 1px 边框分隔，使用 surface 层级区分
- 毛玻璃效果用于浮动元素
- 圆角：sm(0.125rem)、md(0.25rem)、lg(0.5rem)、full(0.75rem)
- 阴影：on_surface 色，4-6% 透明度，24-40px 模糊

---

*设计文档版本：1.0*
*创建日期：2026-04-16*
