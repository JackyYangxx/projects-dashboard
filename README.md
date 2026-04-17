# Precision Curator

A desktop application for project management built with Electron + React + TypeScript.

## Features

- **Project Dashboard** - Overview of all projects with key metrics
- **Project Detail View** - Individual project management with:
  - Team member management
  - Scope & progress tracking with draggable sliders
  - Milestone timeline
  - Note history with rich text editor (Tiptap)
  - Budget tracking with inline editing
- **Offline-First** - Data persisted locally via sql.js (SQLite in WebAssembly)
- **Light Tech Theme** - Modern UI with glassmorphism and gradient accents

## Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Desktop**: Electron 32
- **Build Tool**: Vite 5
- **State Management**: Zustand
- **Rich Text Editor**: Tiptap
- **Database**: sql.js (SQLite WASM)
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start Vite dev server (frontend only)
npm run dev

# OR start full Electron app with dev server
npm run electron:dev
```

### Build for Production

```bash
# Build frontend + package Electron app
npm run electron:build
```

Output will be in `dist-electron/` (unpacked) or `release/` (dmg/pkg).

## Project Structure

```
src/
├── App.tsx              # Router config
├── main.tsx             # Bootstrap: DB init + React mount
├── pages/
│   ├── Dashboard.tsx    # / - Project list with stats
│   └── ProjectDetail.tsx # /project/:id - Single project view
├── components/          # UI components
├── store/
│   └── projectStore.ts  # Zustand store
├── db/
│   ├── index.ts         # sql.js init + schema
│   └── projectDao.ts    # CRUD operations
├── data/
│   └── seedData.ts      # Demo data
└── types/
    └── index.ts         # TypeScript interfaces
electron/
├── main.ts              # Main process
└── preload.ts           # Context bridge
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run electron:dev` | Run Electron with live dev server |
| `npm run build` | TypeScript compile + Vite build |
| `npm run electron:build` | Build + package with electron-builder |

## Data Storage

- Uses sql.js (SQLite compiled to WebAssembly)
- Database file stored locally, survives restarts
- Auto-seeds demo data on first run

## License

MIT
