# Project Form Page Design

## Overview

Add a standalone project creation page at `/project/new` to fix the missing "新增项目" button handler.

## Design

### Page Layout
- Uses same top navigation bar as ProjectDetail
- Back button navigates to `/`
- Page title: "新增项目"
- Form in a card layout (not Bento Grid — simpler for creation)

### Form Fields

| Field | Type | Required | Default |
|-------|------|----------|---------|
| 项目名称 | text input | yes | - |
| 产品线 | text input | no | - |
| 状态 | select | no | ongoing |
| 标签 | text input | no | - |
| 总金额 | number input | no | 0 |
| 已使用金额 | number input | no | 0 |
| 进度 | range slider | no | 0 |

### Submit Flow
1. User fills form
2. Clicks "创建项目" button
3. Call `store.addProject(projectData)`
4. Navigate to `/` (Dashboard)

### Cancel Flow
1. Click back button or cancel
2. Navigate to `/` without saving

## File Changes

1. **New:** `src/pages/ProjectForm.tsx` — form page component
2. **Modify:** `src/App.tsx` — add route `/project/new` → `ProjectForm`
3. **Modify:** `src/pages/Dashboard.tsx` — add `onClick={() => navigate('/project/new')}` to create button

## Implementation Notes

- Reuse existing Tailwind classes from ProjectDetail
- Use same `useProjectStore` for `addProject`
- Validate required fields before submit
- Pre-populate defaults: status='ongoing', progress=0, amounts=0
