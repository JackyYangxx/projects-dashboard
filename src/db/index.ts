import initSqlJs, { Database } from 'sql.js'
import { seedProjects } from '../data/seedData'

let db: Database | null = null
let dbPromise: Promise<Database> | null = null
let seeded = false

export async function initDatabase(): Promise<Database> {
  // Return existing promise if already initializing
  if (dbPromise) return dbPromise

  dbPromise = doInitDatabase()
  return dbPromise
}

async function doInitDatabase(): Promise<Database> {
  if (db) return db

  console.log('[DB] Loading WASM...')
  const wasmResponse = await fetch('/sql-wasm.wasm')
  if (!wasmResponse.ok) {
    throw new Error(`Failed to load WASM: ${wasmResponse.status} ${wasmResponse.statusText}`)
  }
  const wasmBinary = await wasmResponse.arrayBuffer()
  console.log('[DB] WASM loaded, binary size:', wasmBinary.byteLength)

  const SQL = await initSqlJs({ wasmBinary })
  console.log('[DB] SQL.js initialized')

  db = new SQL.Database()
  console.log('[DB] Database created')

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
  console.log('[DB] Table created')

  // Load seed data if database is empty
  if (!seeded) {
    const result = db.exec('SELECT COUNT(*) as count FROM projects')
    const count = result[0]?.values[0]?.[0] as number || 0
    console.log('[DB] Current project count:', count, 'seeded flag:', seeded)

    if (count === 0) {
      console.log('[DB] Seeding', seedProjects.length, 'projects...')
      const now = new Date().toISOString()
      for (const project of seedProjects) {
        db.run(
          `INSERT INTO projects (
            id, name, product_line, status, tag, total_amount, used_amount,
            progress, sub_progress, notes, team, scope, timeline, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            project.name,
            project.productLine,
            project.status,
            project.tag,
            project.totalAmount,
            project.usedAmount,
            project.progress,
            JSON.stringify(project.subProgress),
            project.notes,
            JSON.stringify(project.team),
            JSON.stringify(project.scope),
            JSON.stringify(project.timeline),
            now,
            now,
          ]
        )
        console.log('[DB] Inserted:', project.name)
      }
      seeded = true
      console.log('[DB] Seed complete, seeded flag set to true')
    } else {
      console.log('[DB] Skipping seed, count != 0')
    }
  } else {
    console.log('[DB] Skipping seed, already seeded')
  }

  // Verify
  const verifyResult = db.exec('SELECT COUNT(*) as count FROM projects')
  const verifyCount = verifyResult[0]?.values[0]?.[0] as number || 0
  console.log('[DB] Final project count:', verifyCount)

  return db
}

export function getDatabase(): Database | null {
  return db
}

export type { Database }
