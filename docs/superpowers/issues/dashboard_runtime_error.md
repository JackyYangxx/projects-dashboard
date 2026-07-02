# Issue: Dashboard 页面运行时错误 - useState is not defined

## 问题描述

访问 Dashboard 首页时，出现运行时错误：

```
ReferenceError: useState is not defined
    at Dashboard (http://localhost:5173/src/pages/Dashboard.tsx:33:47)
```

## 复现步骤

1. 启动 dev server: `npm run dev` 或 `npm run electron:dev`
2. 打开浏览器访问 http://localhost:5173
3. 页面显示 "Application Error"
4. 控制台显示 "useState is not defined" 错误

## 环境信息

- macOS Darwin 25.4.0
- 开发服务器端口: 5173 (5174 不可用，连接被拒绝)
- Node 环境需确认

## 初步判断

可能是 Dashboard.tsx 文件中 React 导入语句问题，或者是 Vite 编译问题。需要检查：

1. Dashboard.tsx 是否正确导入 useState
2. Vite dev server 是否正常运行
3. 依赖包是否完整安装

## 状态

**2026-05-12**: 发现问题，E2E 测试无法执行