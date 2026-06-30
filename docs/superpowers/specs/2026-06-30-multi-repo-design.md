# Multi-Repository Support Design

## Context

当前项目每个项目只能存储一个代码仓（`repository` + `branch`）。用户需要支持多个代码仓，例如一个项目同时有前端和后端仓库。

## Data Model

### New type: `Repository`

```typescript
interface Repository {
  id: string
  url: string
  branch: string
  note?: string
}
```

### Project type change

```diff
- repository: string
- branch: string
+ repositories: Repository[]
```

### Database

```diff
- repository TEXT DEFAULT ''
- branch TEXT DEFAULT ''
+ repositories TEXT DEFAULT '[]'
```

存储为 JSON 数组，与 milestones、team 等字段模式一致。

### Migration

`initDatabase` 中检测旧列是否存在：有 `repository` 列无 `repositories` 列时，将旧数据转为 `[{url: old_repo, branch: old_branch}]` 格式。

## Files to Modify

### 1. `src/types/index.ts`
- Add `Repository` interface
- Replace `repository` + `branch` with `repositories: Repository[]`

### 2. `src/db/index.ts`
- Schema: replace two columns with `repositories TEXT DEFAULT '[]'`
- Add migration logic for existing data

### 3. `src/db/projectDao.ts`
- findAll/findById: JSON.parse repositories
- create/update/upsert: JSON.stringify repositories

### 4. `src/data/seedData.ts`
- Convert single repo to `repositories: [{...}]` array

### 5. `src/pages/ProjectDetail.tsx`
- View mode: render list of repo cards (icon + url@branch + note)
- Edit mode: editable list with per-row URL/branch/note inputs + delete button, "添加代码仓" button at bottom
- Min 1 row, last row hides delete
- Replace `repoEditRepository`/`repoEditBranch`/`isRepoEditing` state with `repositories` array state

### 6. `src/pages/ProjectForm.tsx`
- No change (user chose detail-page-only editing)

### 7. `src/pages/Dashboard.tsx`
- Export: flatten repos to `代码仓1, 分支1, 备注1, 代码仓2, 分支2, 备注2...` columns
- Import: parse back from multi-column format
- Template: update optional headers for multi-repo

### 8. `src/constants/project.ts`
- Update IMPORT_OPTIONAL_HEADERS for multi-repo columns

### 9. `src/components/ProjectSelector.tsx`
- Display "N个代码仓" badge instead of single URL

### 10. `src/store/codeReviewStore.ts`
- Iterate `project.repositories` array for MR fetching

### 11. `tests/e2e_dashboard.py`
- Add multi-repo test cases

## Implementation Order

1. Types → Repository interface, Project update
2. Database → schema migration, CRUD serialization
3. Seed data → convert to array format
4. ProjectDetail → multi-repo card list UI
5. Dashboard → import/export multi-column handling
6. Code review → iterate repos array
7. Constants → update headers
8. E2E tests → add coverage

## Verification

1. Run existing 49 E2E tests, ensure all pass
2. Create project with seed data, verify repo displays
3. Edit project → add/remove repos → save → reload → verify persistence
4. Add repo with only URL, verify branch defaults to empty
5. Export project with 3 repos → verify all 3 in Excel
6. Import Excel with 2 repos → verify both imported
7. Code Review page → verify repo count badge for multi-repo projects
