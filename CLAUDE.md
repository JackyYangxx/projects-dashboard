# CLAUDE.md

**Precision Curator** — Electron desktop app for project management. Offline-first, sql.js (SQLite in WASM), React SPA.

## Commands

```bash
npm run dev           # Vite dev server only (http://localhost:5173)
npm run electron:dev  # Full Electron + Vite (use this for development)
npm run electron:build # Build + package
```

## Architecture

**Electron processes:**
- `electron/main.ts` — window management, IPC, single-instance lock
- `electron/preload.ts` — contextBridge API
- `src/` — React SPA, fully isolated from Node.js

**src layout:**
```
src/
├── App.tsx / main.tsx        # Router + DB bootstrap
├── pages/                    # Dashboard, ProjectDetail, ProjectForm
├── components/               # Sidebar, Header, StatsCard, ProjectTable, ProgressSlider, RichEditor
├── store/projectStore.ts     # Zustand (CRUD + loading state)
├── db/                       # sql.js init + projectDao CRUD
├── constants/project.ts      # STATUS_MAP, STATUS_LABELS, VALID_STATUSES, IMPORT_REQUIRED_HEADERS
├── utils/avatar.ts           # generateAvatarUrl(name)
├── data/seedData.ts          # 3 demo projects, auto-seeded on first run
└── types/index.ts            # Project, TeamMember, ScopeItem, etc.
```

**Data flow:** `main.tsx` → `initDatabase()` → seed if empty → Zustand store → `projectDao` → sql.js (in-memory, resets on restart)

**Routing:** `/` Dashboard · `/project/:id` detail (supports `?edit=true`) · `/project/new` create

## Design System

Light Tech Theme. Full spec: `docs/ui-design-system.md`.
- Fonts: Fira Code (headings/numbers), Fira Sans (body)
- Primary: `#3B82F6` → Accent: `#8B5CF6`; Icons: Material Symbols Outlined
- Danger actions require confirmation dialog

## Key Patterns

**Read-only mode** (`ProjectDetail`): `isReadOnly` state → `readOnly` prop on `ProgressSlider` and `RichEditor`; budget cards show text instead of inputs.

**Inline edit**: click text → input → Enter/blur saves, ESC cancels, restore original on cancel.

**Accordion**: `expandedId` state, default expand newest. Chevron: collapsed=−90°, expanded=0°.

**Modal**: `showModal` state, form + preview, use `generateAvatarUrl(name)` for avatars.

**Edit navigation**: `navigate(\`/project/${id}?edit=true\`)` → `ProjectDetail` reads `edit` param in `useEffect` with empty deps (mount only).

## Code Conventions

- **Shared utilities/constants**: Before adding an inline pattern, check `src/utils/` and `src/constants/` first.
- **After UPDATE/INSERT**: return updated fields directly — don't re-fetch with `findById`.
- **catch blocks**: always log — no silent `catch {}`.
- **Comments**: only explain *why*, not *what*. Delete narrating comments.
- **Magic strings**: use named constants (`VALID_STATUSES` not `['ongoing', 'completed', 'paused']`).

## Rules

1. **Think first** — State assumptions explicitly. Ask when unclear. Present tradeoffs before picking silently.
2. **Simplicity** — Minimum code. No speculative features, abstractions, or error handling for impossible cases.
3. **Surgical changes** — Touch only what's required. Match existing style. Don't improve adjacent code.
4. **Verify** — Define success criteria before starting. State a brief plan with checks for multi-step tasks.
5. **Mature components** — Prefer shadcn/ui, Radix, stable npm packages over rolling your own.
