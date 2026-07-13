import Database from 'better-sqlite3'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

let db: Database.Database | null = null

function getDefaultDbPath(): string {
  const appName = 'project-dashboard'
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName, 'projects-dashboard.db')
    case 'win32':
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName, 'projects-dashboard.db')
    default:
      return path.join(os.homedir(), '.config', appName, 'projects-dashboard.db')
  }
}

export function getDbPath(): string {
  return process.env.PROJECTS_DB_PATH || getDefaultDbPath()
}

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()

  if (!fs.existsSync(dbPath)) {
    throw new Error(`数据库未初始化，请先启动应用。\n预期路径: ${dbPath}`)
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get()
  if (!tableCheck) {
    db.close()
    db = null
    throw new Error(`数据库未初始化，请先启动应用。\n数据库文件存在但缺少 projects 表: ${dbPath}`)
  }

  return db
}

export function getDatabase(): Database.Database {
  if (!db) return initDatabase()
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
