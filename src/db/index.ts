import initSqlJs, { Database } from 'sql.js'
import { seedProjects } from '../data/seedData'
import { create as createProject } from './projectDao'

let db: Database | null = null
let seeded = false

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const wasmResponse = await fetch('/sql-wasm.wasm')
  if (!wasmResponse.ok) {
    throw new Error(`Failed to load WASM: ${wasmResponse.status} ${wasmResponse.statusText}`)
  }
  const wasmBinary = await wasmResponse.arrayBuffer()

  const SQL = await initSqlJs({ wasmBinary })

  db = new SQL.Database()

  // Create projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      product_line TEXT DEFAULT '',
      status TEXT DEFAULT 'ongoing',
      tag TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      used_amount REAL DEFAULT 0,
      progress INTEGER DEFAULT 0,
      sub_progress TEXT DEFAULT '{}',
      notes TEXT DEFAULT '',
      team TEXT DEFAULT '[]',
      scope TEXT DEFAULT '[]',
      timeline TEXT DEFAULT '[]',
      created_at TEXT,
      updated_at TEXT
    )
  `)

  // Load seed data if database is empty
  if (!seeded) {
    const result = db.exec('SELECT COUNT(*) as count FROM projects')
    const count = result[0]?.values[0]?.[0] as number || 0
    if (count === 0) {
      for (const project of seedProjects) {
        createProject(project)
      }
      seeded = true
    }
  }

  return db
}

export function getDatabase(): Database | null {
  return db
}

export type { Database }
