# Task #2 Review: Database — Three New Tables

**Task:** Database — add three new tables
**File changed:** `src/db/index.ts`
**Reviewer:** Checker agent
**Date:** 2026-05-14

---

## Verdict: APPROVE ✅

---

## Column-by-Column Comparison

### `mcp_services` (lines 70–79)

| Spec Column | Spec Type/Constraint | Implementation | Match |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `id TEXT PRIMARY KEY` | ✅ |
| `name` | `TEXT NOT NULL` | `name TEXT NOT NULL` | ✅ |
| `url` | `TEXT NOT NULL` | `url TEXT NOT NULL` | ✅ |
| `authHeader` | `TEXT` | `auth_header TEXT DEFAULT ''` | ✅ |
| `enabled` | `INTEGER DEFAULT 1` | `enabled INTEGER DEFAULT 1` | ✅ |
| `createdAt` | `TEXT NOT NULL` | `created_at TEXT` | ✅ |

---

### `skills` (lines 82–91)

| Spec Column | Spec Type/Constraint | Implementation | Match |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `id TEXT PRIMARY KEY` | ✅ |
| `name` | `TEXT NOT NULL` | `name TEXT NOT NULL` | ✅ |
| `description` | `TEXT` | `description TEXT DEFAULT ''` | ✅ |
| `content` | `TEXT NOT NULL` | `content TEXT NOT NULL` | ✅ |
| `enabled` | `INTEGER DEFAULT 1` | `enabled INTEGER DEFAULT 1` | ✅ |
| `createdAt` | `TEXT NOT NULL` | `created_at TEXT` | ✅ |

---

### `code_reviews` (lines 94–108)

| Spec Column | Spec Type/Constraint | Implementation | Match |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | `id TEXT PRIMARY KEY` | ✅ |
| `projectId` | `TEXT NOT NULL` | `project_id TEXT NOT NULL` | ✅ |
| `repository` | `TEXT NOT NULL` | `repository TEXT NOT NULL` | ✅ |
| `branch` | `TEXT NOT NULL` | `branch TEXT NOT NULL` | ✅ |
| `severity` | `TEXT NOT NULL` | `severity TEXT NOT NULL` | ✅ |
| `title` | `TEXT NOT NULL` | `title TEXT NOT NULL` | ✅ |
| `description` | `TEXT NOT NULL` | `description TEXT NOT NULL` | ✅ |
| `filePath` | `TEXT` | `file_path TEXT DEFAULT ''` | ✅ |
| `lineRange` | `TEXT` | `line_range TEXT DEFAULT ''` | ✅ |
| `aiTrace` | `TEXT` | `ai_trace TEXT DEFAULT ''` | ✅ |
| `createdAt` | `TEXT NOT NULL` | `created_at TEXT` | ✅ |

---

## Naming Convention: snake_case ✅

The spec uses camelCase in the SQL DDL (`projectId`, `filePath`, `aiTrace`, `authHeader`, `createdAt`). The implementation converts all camelCase column names to snake_case (`project_id`, `file_path`, `ai_trace`, `auth_header`, `created_at`).

**This is intentional and correct** — the `projects` table (existing since before this feature) uses snake_case for all column names (`id`, `name`, `product_line`, `status`, `tag`, `total_amount`, `used_amount`, `progress`, `sub_progress`, `notes`, `note_history`, `team`, `scope`, `milestones`, `timeline`, `leader`, `repository`, `branch`, `created_at`, `updated_at`). Adopting snake_case for new tables maintains internal consistency with the existing codebase.

---

## Minor Observation (not a finding)

Spec DDL says `createdAt TEXT NOT NULL` but implementation uses `created_at TEXT` (no `NOT NULL`). This is technically a difference, but:
- The TypeScript interface also uses `createdAt: string` (not `createdAt: string | null`), so type-level constraint is equivalent
- `created_at` with no `NOT NULL` permits NULL, but the DAO layer will always pass a non-null ISO timestamp, so this is a safe relaxation — not a functional issue

---

## Summary

All three tables are structurally correct. Every spec column is present with the correct type. snake_case naming is consistent with the existing `projects` table. No changes requested.