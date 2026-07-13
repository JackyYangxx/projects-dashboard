import Database from 'better-sqlite3'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT '',
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
      repositories TEXT DEFAULT '[]',
      ext1 TEXT DEFAULT '',
      ext2 TEXT DEFAULT '',
      ext3 TEXT DEFAULT '',
      ext4 TEXT DEFAULT '',
      ext5 TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    )
  `)
  return db
}
