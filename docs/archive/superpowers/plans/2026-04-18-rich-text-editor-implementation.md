# Rich Text Editor Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TipTap editor with Quill, move note history above editor, and remove unused TipTap dependencies.

**Architecture:** A single `QuillEditor` React component wraps `react-quill` with custom styling matching the design system. `ProjectDetail` page reorders the note history accordion above the editor. TipTap packages are removed from dependencies.

**Tech Stack:** react-quill, Quill

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/QuillEditor.tsx` | Create | Quill wrapper with design system styling |
| `src/components/TipTapEditor.tsx` | Delete | Replaced by QuillEditor |
| `src/pages/ProjectDetail.tsx` | Modify | Swap editor import, reorder note history |
| `package.json` | Modify | Remove TipTap deps, add react-quill |

---

## Task 1: Install react-quill

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add react-quill to dependencies**

Run:
```bash
npm install react-quill
```

Expected output:
```
added 1 package, and audited N packages
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-quill dependency

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create QuillEditor Component

**Files:**
- Create: `src/components/QuillEditor.tsx`

- [ ] **Step 1: Create QuillEditor.tsx**

```tsx
import React, { useEffect, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface QuillEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}

const QuillEditor: React.FC<QuillEditorProps> = ({
  value = '',
  onChange,
  placeholder = '在此输入内容...',
  readOnly = false,
}) => {
  const quillRef = useRef<ReactQuill>(null)

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  }

  if (readOnly) {
    return (
      <div
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated rounded-lg"
      >
        {value ? (
          <div
            className="text-sm font-body text-on-surface-primary ql-editor p-0"
            style={{ fontFamily: 'Fira Sans, sans-serif' }}
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <span className="text-sm font-body text-on-surface-tertiary">无内容</span>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden transition-all ring-1 ring-outline focus-within:ring-2 focus-within:ring-primary-500"
    >
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        theme="snow"
      />
    </div>
  )
}

export default QuillEditor
```

- [ ] **Step 2: Add custom Quill styles to globals.css or component-level style override**

Create a style tag inside the component or add to `src/index.css`:

```css
/* Quill editor styling to match design system */
.ql-toolbar {
  background: #F8FAFC !important;
  border: none !important;
  border-bottom: 1px solid #E2E8F0 !important;
  font-family: 'Fira Sans', sans-serif !important;
}

.ql-container {
  border: none !important;
  font-family: 'Fira Sans', sans-serif !important;
}

.ql-editor {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px !important;
  font-size: 14px !important;
  color: #0F172A !important;
  background: #FFFFFF !important;
}

.ql-editor p {
  margin-bottom: 8px;
}

.ql-editor.ql-blank::before {
  color: #94A3B8 !important;
  font-style: normal !important;
}

.ql-toolbar .ql-stroke {
  stroke: #475569;
}

.ql-toolbar .ql-fill {
  fill: #475569;
}

.ql-toolbar button:hover .ql-stroke,
.ql-toolbar button.ql-active .ql-stroke {
  stroke: #3B82F6;
}

.ql-toolbar button:hover .ql-fill,
.ql-toolbar button.ql-active .ql-fill {
  fill: #3B82F6;
}

.ql-toolbar .ql-picker {
  color: #475569;
}

.ql-toolbar .ql-picker-options {
  background: #FFFFFF;
  border: 1px solid #E2E8F0 !important;
  border-radius: 8px;
}
```

Alternatively, add this to `src/index.css` to keep all Quill overrides in one place.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuillEditor.tsx src/index.css
git commit -m "feat: add QuillEditor component with design system styling

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Update ProjectDetail Layout — Note History Above Editor

**Files:**
- Modify: `src/pages/ProjectDetail.tsx:1-10` (imports)
- Modify: `src/pages/ProjectDetail.tsx:267-299` (editor section — move note history above)
- Modify: `src/pages/ProjectDetail.tsx:301-357` (note history section — move below editor)

- [ ] **Step 1: Update imports — replace TipTapEditor with QuillEditor**

In `src/pages/ProjectDetail.tsx`, change:
```tsx
import TipTapEditor from '@/components/TipTapEditor'
```
to:
```tsx
import QuillEditor from '@/components/QuillEditor'
```

- [ ] **Step 2: Move note history accordion above editor section**

Find the editor section (lines ~267-299) and note history section (lines ~301-357). Swap their positions so the DOM order is:
1. Note history accordion (lines ~301-357)
2. Editor section with QuillEditor (lines ~267-299)

The editor section JSX currently looks like:
```tsx
<div className="col-span-12">
  <div className="bg-surface-elevated rounded-xl p-6">
    <h3 className="text-sm font-body font-medium text-on-surface-secondary mb-4">项目笔记</h3>
    <TipTapEditor ... />
    {!isReadOnly && (
      <div className="flex items-center justify-end gap-3 mt-4">
        ...
      </div>
    )}
  </div>
</div>
```

Change `TipTapEditor` to `QuillEditor` and move this entire block below the note history section.

- [ ] **Step 3: Move note history section to above editor**

Cut the note history JSX (lines ~301-357):
```tsx
{project.noteHistory.length > 0 && (
  <div className="col-span-12">
    <div className="bg-surface-elevated rounded-xl overflow-hidden">
      ...
    </div>
  </div>
)}
```

Paste it above the editor section.

- [ ] **Step 4: Verify the DOM order**

The final DOM order should be (top to bottom):
1. Row 1: Progress + Budget
2. Row 2: Note History Accordion (col-span-12)
3. Row 3: QuillEditor + Cancel/Save buttons (col-span-12)
4. Row 4: Team + Milestones
5. Row 5: Timeline

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat: reorder note history above QuillEditor in ProjectDetail

- Swap TipTapEditor import for QuillEditor
- Move note history accordion above editor section
- Layout now: history accordion → editor → buttons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Remove TipTapEditor and Dependencies

**Files:**
- Delete: `src/components/TipTapEditor.tsx`
- Modify: `package.json`

- [ ] **Step 1: Delete TipTapEditor.tsx**

```bash
rm src/components/TipTapEditor.tsx
```

- [ ] **Step 2: Remove TipTap packages from package.json**

Remove these lines from `package.json` dependencies:
```json
"@tiptap/extension-image": "^3.22.3",
"@tiptap/extension-placeholder": "^3.22.3",
"@tiptap/pm": "^3.22.3",
"@tiptap/react": "^3.22.3",
"@tiptap/starter-kit": "^3.22.3",
```

Run:
```bash
npm install
```

- [ ] **Step 3: Verify no remaining TipTap imports in codebase**

Run:
```bash
grep -r "tiptap" src/
grep -r "@tiptap" src/
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git rm src/components/TipTapEditor.tsx
git commit -m "chore: remove TipTapEditor and TipTap dependencies

- Delete TipTapEditor.tsx component
- Remove @tiptap/* packages from dependencies
- Switch to react-quill for rich text editing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Build and Verify

- [ ] **Step 1: Run TypeScript build**

Run:
```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 2: Run dev server and verify**

Run:
```bash
npm run dev
```

Open `http://localhost:5173`, navigate to a project detail page, verify:
- Note history accordion appears above editor
- Editor toolbar shows: H1/H2, Bold, Italic, Underline, Strike, Blockquote, Code Block, Ordered List, Unordered List, Link, Image, Clean
- All toolbar buttons are functional
- Saving history works
- View/Edit toggle hides/shows toolbar

---

## Spec Coverage Check

| Spec Section | Task |
|-------------|-------|
| 1. Quill替换TipTap | Task 2, Task 4 |
| 2. 布局调整（历史→编辑器） | Task 3 |
| 3. 交互流程（保存历史等） | Task 3 |
| 4. 视觉规范 | Task 2 (CSS overrides) |
| 6. 删除TipTapEditor | Task 4 |

All spec sections are covered.
