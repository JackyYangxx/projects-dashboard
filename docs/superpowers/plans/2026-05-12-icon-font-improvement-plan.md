# Icon and Font Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace self-hosted Material Symbols font with Lucide React SVG icons, and update font stack to include Microsoft YaHei for Windows Chinese text.

**Architecture:** Install lucide-react npm package, create unified Icon wrapper component, replace all `<span class="material-symbols-outlined">` usages with `<Icon name="..." />` component, update font-family CSS to include Microsoft YaHei, remove unused font files.

**Tech Stack:** lucide-react (SVG icons), CSS font-family

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add lucide-react dependency |
| `src/components/Icon.tsx` | Create | Unified icon wrapper component |
| `src/styles/globals.css` | Modify | Update font stacks with Microsoft YaHei |
| `index.html` | Modify | Remove material-symbols.css link |
| `src/components/Sidebar.tsx` | Modify | Replace dashboard icon |
| `src/components/Header.tsx` | Modify | Replace search icon |
| `src/components/StatsCard.tsx` | Modify | Replace trending_up icon |
| `src/components/ProjectTable.tsx` | Modify | Replace inbox, visibility, edit, delete, progress_activity icons |
| `src/components/ProgressSlider.tsx` | Modify | Replace icon usage |
| `src/components/PrevNextNav.tsx` | Modify | Replace chevron_left/right icons |
| `src/pages/Dashboard.tsx` | Modify | Replace upload_file, download, add, folder_open, progress_activity icons |
| `src/pages/ProjectForm.tsx` | Modify | Replace arrow_back icon |
| `src/pages/ProjectDetail.tsx` | Modify | Replace multiple icons (folder_copy, progress_activity, add, arrow_back, chevron) |
| `public/material-symbols.css` | Delete | Remove self-hosted icon CSS |
| `public/material-symbols.woff2` | Delete | Remove 3.9MB font file |

---

## Tasks

### Task 1: Install lucide-react

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install lucide-react package**

Run: `npm install lucide-react`
Expected: Package installed, no errors

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add lucide-react for SVG icons

Replaces self-hosted Material Symbols font with Lucide React
to fix Windows packaged app icon failure.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 2: Create Icon.tsx wrapper component

**Files:**
- Create: `src/components/Icon.tsx`

- [ ] **Step 1: Create Icon.tsx**

```tsx
import React from 'react'
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  Inbox,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  FolderCopy,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Plus,
  FolderOpen,
  ArrowLeft,
  LucideIcon
} from 'lucide-react'

const iconMap = {
  dashboard: LayoutDashboard,
  search: Search,
  trending_up: TrendingUp,
  inbox: Inbox,
  visibility: Eye,
  edit: Pencil,
  delete: Trash2,
  progress_activity: Loader2,
  folder_copy: FolderCopy,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  upload_file: Upload,
  download: Download,
  add: Plus,
  folder_open: FolderOpen,
  arrow_back: ArrowLeft,
} as const

export type IconName = keyof typeof iconMap

interface IconProps {
  name: IconName
  size?: number
  className?: string
  spin?: boolean
}

const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', spin = false }) => {
  const IconComponent: LucideIcon = iconMap[name]
  return (
    <IconComponent
      size={size}
      className={`${className} ${spin ? 'animate-spin' : ''}`}
    />
  )
}

export default Icon
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat: add Icon wrapper component for Lucide icons

Provides unified interface for all icon usage across the app.
Supports size, className, and spin animation props.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 3: Update font stacks in globals.css

**Files:**
- Modify: `src/styles/globals.css:1-15`

- [ ] **Step 1: Update html font-family**

Read `src/styles/globals.css` lines 1-15, then replace:

```css
@layer base {
  html {
    font-family: 'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Microsoft Sans Serif', system-ui, sans-serif;
    scroll-behavior: smooth;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: update font stack with Microsoft YaHei for Windows Chinese

Adds Microsoft YaHei as primary font for Chinese text on Windows.
Preserves Fira Code/Sans for English/numbers via heading styles.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 4: Update index.html to remove Material Symbols CSS

**Files:**
- Modify: `index.html:9-12`

- [ ] **Step 1: Remove material-symbols.css link**

Read `index.html`, then remove lines 9-12:
```html
    <link
      href="/material-symbols.css"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "chore: remove Material Symbols CSS link

Replaced by lucide-react SVG icons. No longer needed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 5: Replace icons in Sidebar.tsx

**Files:**
- Modify: `src/components/Sidebar.tsx:51-60`

- [ ] **Step 1: Add Icon import and replace icon spans**

Read `src/components/Sidebar.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace lines 51-60 (both active and inactive icon spans):
```tsx
                  {isActive && (
                    <>
                      <Icon name="dashboard" size={24} className="text-white" />
                    </>
                  )}
                  {!isActive && (
                    <Icon name="dashboard" size={24} />
                  )}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in Sidebar

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 6: Replace icons in Header.tsx

**Files:**
- Modify: `src/components/Header.tsx:25`

- [ ] **Step 1: Add Icon import and replace search span**

Read `src/components/Header.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace line 25 (search icon span):
```tsx
          <Icon name="search" size={24} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-tertiary transition-colors group-focus-within:text-primary-500" />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in Header

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 7: Replace icons in StatsCard.tsx

**Files:**
- Modify: `src/components/StatsCard.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/components/StatsCard.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace all `material-symbols-outlined` spans with `<Icon name="..." />`

- [ ] **Step 2: Commit**

```bash
git add src/components/StatsCard.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in StatsCard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 8: Replace icons in ProjectTable.tsx

**Files:**
- Modify: `src/components/ProjectTable.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/components/ProjectTable.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace all `material-symbols-outlined` spans with `<Icon name="..." />`:
   - `inbox` → `Icon name="inbox"`
   - `visibility` → `Icon name="visibility"`
   - `edit` → `Icon name="edit"`
   - `delete` → `Icon name="delete"`
   - `progress_activity` (with spin) → `Icon name="progress_activity" spin`

- [ ] **Step 2: Commit**

```bash
git add src/components/ProjectTable.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in ProjectTable

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 9: Replace icons in ProgressSlider.tsx

**Files:**
- Modify: `src/components/ProgressSlider.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/components/ProgressSlider.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace all `material-symbols-outlined` spans with `<Icon name="..." />`

- [ ] **Step 2: Commit**

```bash
git add src/components/ProgressSlider.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in ProgressSlider

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 10: Replace icons in PrevNextNav.tsx

**Files:**
- Modify: `src/components/PrevNextNav.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/components/PrevNextNav.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace:
   - `chevron_left` → `Icon name="chevron_left"`
   - `chevron_right` → `Icon name="chevron_right"`

- [ ] **Step 2: Commit**

```bash
git add src/components/PrevNextNav.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in PrevNextNav

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 11: Replace icons in Dashboard.tsx

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/pages/Dashboard.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace all `material-symbols-outlined` spans with `<Icon name="..." />`:
   - `upload_file` → `Icon name="upload_file"`
   - `download` → `Icon name="download"`
   - `add` → `Icon name="add"`
   - `folder_open` → `Icon name="folder_open"`
   - `progress_activity` (with spin) → `Icon name="progress_activity" spin`

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in Dashboard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 12: Replace icons in ProjectForm.tsx

**Files:**
- Modify: `src/pages/ProjectForm.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/pages/ProjectForm.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace `arrow_back` → `Icon name="arrow_back"`

- [ ] **Step 2: Commit**

```bash
git add src/pages/ProjectForm.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in ProjectForm

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 13: Replace icons in ProjectDetail.tsx

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

- [ ] **Step 1: Add Icon import and replace icons**

Read `src/pages/ProjectDetail.tsx`, then:

1. Add import at top:
```tsx
import Icon from './Icon'
```

2. Replace all `material-symbols-outlined` spans with `<Icon name="..." />`:
   - `folder_copy` → `Icon name="folder_copy"`
   - `progress_activity` (with spin) → `Icon name="progress_activity" spin`
   - `add` → `Icon name="add"`
   - `arrow_back` → `Icon name="arrow_back"`
   - `chevron_left/right` for accordions → `Icon name="chevron_left/right"`

- [ ] **Step 2: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "refactor: replace Material Symbols with Lucide Icon in ProjectDetail

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 14: Delete unused Material Symbols files

**Files:**
- Delete: `public/material-symbols.css`
- Delete: `public/material-symbols.woff2`

- [ ] **Step 1: Delete Material Symbols files**

Run:
```bash
rm public/material-symbols.css public/material-symbols.woff2
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove unused Material Symbols font files

Deletes 3.9MB self-hosted font file that caused Windows icon failure.
Icons now served as SVG via lucide-react.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

### Task 15: Final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run dev server and verify icons**

Run: `npm run dev`
Expected: Icons display correctly, no console errors about missing fonts

- [ ] **Step 2: Verify no material-symbols references remain**

Run: `grep -r "material-symbols" src/ public/ --include="*.tsx" --include="*.ts" --include="*.css" --include="*.html" 2>/dev/null`
Expected: No output (no matches)

- [ ] **Step 3: Test in Electron dev mode**

Run: `npm run electron:dev`
Expected: All icons display correctly on macOS

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] All icons render correctly (no missing icon squares)
- [ ] No console errors about missing `/material-symbols.woff2`
- [ ] Chinese text renders with Microsoft YaHei on Windows (when tested)
- [ ] Bundle size reduced by ~4MB (removed font file)
- [ ] `grep -r "material-symbols" src/` returns empty