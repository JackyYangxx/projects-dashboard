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

  let wasmBinary: ArrayBuffer
  if (window.electronAPI?.getWasmBinary) {
    console.log('[DB] Using IPC to get WASM binary')
    const binary = await window.electronAPI.getWasmBinary()
    const uint8 = new Uint8Array(binary)
    wasmBinary = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)
    console.log('[DB] WASM loaded via IPC, binary size:', wasmBinary.byteLength)
  } else {
    console.log('[DB] Using fetch for WASM (dev mode)')
    const wasmUrl = window.location.origin + '/sql-wasm.wasm'
    const wasmResponse = await fetch(wasmUrl)
    wasmBinary = await wasmResponse.arrayBuffer()
    console.log('[DB] WASM loaded via fetch, binary size:', wasmBinary.byteLength)
  }

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
      note_history TEXT DEFAULT '[]',
      team TEXT DEFAULT '[]',
      scope TEXT DEFAULT '[]',
      milestones TEXT DEFAULT '[]',
      timeline TEXT DEFAULT '[]',
      leader TEXT DEFAULT '',
      repository TEXT DEFAULT '',
      branch TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    )
  `)
  console.log('[DB] Table created')

  // Create mcp_services table
  db.run(`
    CREATE TABLE IF NOT EXISTS mcp_services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      auth_header TEXT DEFAULT '',
      tools TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    )
  `)

  // Create skills table
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    )
  `)

  // Create code_reviews table
  db.run(`
    CREATE TABLE IF NOT EXISTS code_reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      file_path TEXT DEFAULT '',
      line_range TEXT DEFAULT '',
      ai_trace TEXT DEFAULT '',
      created_at TEXT
    )
  `)

  // Create llm_config table
  db.run(`
    CREATE TABLE IF NOT EXISTS llm_config (
      id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      model_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    )
  `)

  // Create mr_review_records table
  db.run(`
    CREATE TABLE IF NOT EXISTS mr_review_records (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      mr_id TEXT NOT NULL,
      mr_title TEXT NOT NULL,
      mr_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      issues TEXT DEFAULT '[]',
      reviewed_at TEXT,
      created_at TEXT
    )
  `)

  // Create review_reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS review_reports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_ids TEXT NOT NULL,
      total_mr_count INTEGER DEFAULT 0,
      total_issue_count INTEGER DEFAULT 0,
      issues_preview TEXT DEFAULT '',
      created_at TEXT
    )
  `)

  // Create budget_sources table
  db.run(`
    CREATE TABLE IF NOT EXISTS budget_sources (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      label TEXT NOT NULL,
      amount REAL DEFAULT 0,
      used_amount REAL DEFAULT 0,
      date TEXT DEFAULT '',
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

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
            progress, sub_progress, notes, note_history, team, scope, milestones, timeline, leader, repository, branch, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            JSON.stringify(project.noteHistory || []),
            JSON.stringify(project.team),
            JSON.stringify(project.scope),
            JSON.stringify(project.milestones || []),
            JSON.stringify(project.timeline),
            project.leader,
            project.repository || '',
            project.branch || '',
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

  // Migrate projects without budget_sources: create a default source from totalAmount/usedAmount
  const existingProjects = db.exec('SELECT id, total_amount, used_amount FROM projects')
  const existingSources = db.exec('SELECT DISTINCT project_id FROM budget_sources')
  const projectsWithSources = new Set((existingSources[0]?.values || []).map(row => row[0] as string))
  const projectRows = existingProjects[0]?.values || []

  for (const row of projectRows) {
    const projectId = row[0] as string
    const totalAmount = row[1] as number
    const usedAmount = row[2] as number

    if (!projectsWithSources.has(projectId)) {
      const now = new Date().toISOString()
      db.run(`
        INSERT INTO budget_sources (id, project_id, label, amount, used_amount, date, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), projectId, '默认来源', totalAmount || 0, usedAmount || 0, now.slice(0, 10), null, now, now])
    }
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
