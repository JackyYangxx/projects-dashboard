# Icon and Font Improvement Design

**Date:** 2026-05-12
**Status:** Approved

## Overview

Replace self-hosted Material Symbols font with Lucide React (SVG icons) and update font stack to include Microsoft YaHei for Windows Chinese localization.

## Problem Statement

1. **Icon Failure on Windows**: Self-hosted `material-symbols.woff2` (3.9MB) uses absolute path `/material-symbols.woff2` which fails in Electron packaged app (file:// protocol)
2. **Font Compatibility**: Chinese text needs Microsoft YaHei fallback on Windows

## Solution

### 1. Icon Replacement

**Package:** `lucide-react` (latest stable)

**Icon Mapping:**

| Current Symbol | Lucide Component | Notes |
|----------------|-------------------|-------|
| `dashboard` | `LayoutDashboard` | |
| `search` | `Search` | |
| `trending_up` | `TrendingUp` | |
| `inbox` | `Inbox` | |
| `visibility` | `Eye` | |
| `edit` | `Pencil` | |
| `delete` | `Trash2` | |
| `progress_activity` | `Loader2` | Add spin animation |
| `folder_copy` | `FolderCopy` | |
| `chevron_left` | `ChevronLeft` | |
| `chevron_right` | `ChevronRight` | |
| `upload_file` | `Upload` | |
| `download` | `Download` | |
| `add` | `Plus` | |
| `folder_open` | `FolderOpen` | |
| `arrow_back` | `ArrowLeft` | |

**Implementation:**
1. Create `src/components/Icon.tsx` unified icon wrapper
2. Replace all `<span class="material-symbols-outlined">...</span>` with `<Icon name="..." />`
3. Add `size` and `className` props for flexibility

### 2. Font Strategy

**Font Stack:**
```css
/* Base body - Chinese */
'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Microsoft Sans Serif', system-ui

/* Headings/Numbers - Fira */
'Fira Code', 'Fira Sans', system-ui
```

**Files to modify:**
- `src/styles/globals.css` - Update font-family declarations
- `src/constants/project.ts` - No changes needed

### 3. Cleanup

**Delete:**
- `public/material-symbols.css`
- `public/material-symbols.woff2` (saves 3.9MB)

**Update:**
- `index.html` - Remove `<link href="/material-symbols.css" ...>`
- `electron-builder.yml` - No icon path changes needed

## Component Design

### Icon.tsx

```tsx
import {
  LayoutDashboard, Search, TrendingUp, Inbox, Eye, Pencil,
  Trash2, Loader2, FolderCopy, ChevronLeft, ChevronRight,
  Upload, Download, Plus, FolderOpen, ArrowLeft, LucideIcon
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
}

interface IconProps {
  name: keyof typeof iconMap
  size?: number
  className?: string
  spin?: boolean
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', spin = false }) => {
  const IconComponent = iconMap[name]
  return (
    <IconComponent
      size={size}
      className={`${className} ${spin ? 'animate-spin' : ''}`}
    />
  )
}
```

## Implementation Steps

1. `npm install lucide-react`
2. Create `src/components/Icon.tsx`
3. Update `src/styles/globals.css` font stacks
4. Update `index.html` - remove material-symbols.css link
5. Replace all icon usages across components
6. Delete `public/material-symbols.css` and `public/material-symbols.woff2`
7. Test on both macOS and Windows

## Verification Criteria

- [ ] Icons display correctly in dev mode
- [ ] Icons display correctly in packaged Windows app
- [ ] Chinese text renders with Microsoft YaHei on Windows
- [ ] English text/numbers use Fira Code/Sans
- [ ] Bundle size reduction (remove 3.9MB font file)
- [ ] No console errors related to missing assets