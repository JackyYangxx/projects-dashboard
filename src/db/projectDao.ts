import { getDatabase } from './index'
import type { Project, SubProgress, TeamMember, ScopeItem, TimelineEvent } from '../types'
import type { SqlValue } from 'sql.js'

function generateId(): string {
  return crypto.randomUUID()
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

export function findAll(): Project[] {
  const db = getDatabase()
  if (!db) return []

  const results = db.exec('SELECT * FROM projects ORDER BY created_at DESC')
  if (results.length === 0) return []

  const columns = results[0].columns
  return results[0].values.map((row) => {
    const project: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      if (col === 'sub_progress' || col === 'team' || col === 'scope' || col === 'timeline') {
        try {
          project[col] = JSON.parse(row[i] as string || '{}')
        } catch {
          project[col] = row[i]
        }
      } else {
        project[col] = row[i]
      }
    })
    return project as unknown as Project
  })
}

export function findById(id: string): Project | undefined {
  const db = getDatabase()
  if (!db) return undefined

  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  stmt.bind([id])

  if (!stmt.step()) {
    stmt.free()
    return undefined
  }

  const row = stmt.getAsObject()
  stmt.free()

  return {
    id: row.id as string,
    name: row.name as string,
    productLine: row.product_line as string,
    status: row.status as Project['status'],
    tag: row.tag as string,
    totalAmount: row.total_amount as number,
    usedAmount: row.used_amount as number,
    progress: row.progress as number,
    subProgress: parseJsonField<SubProgress>(row.sub_progress, { architecture: 0, uiux: 0, engineering: 0, qa: 0 }),
    notes: row.notes as string,
    team: parseJsonField<TeamMember[]>(row.team, []),
    scope: parseJsonField<ScopeItem[]>(row.scope, []),
    timeline: parseJsonField<TimelineEvent[]>(row.timeline, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  const id = generateId()
  const now = new Date().toISOString()

  db.run(
    `INSERT INTO projects (
      id, name, product_line, status, tag, total_amount, used_amount,
      progress, sub_progress, notes, team, scope, timeline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
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

  return { ...project, id, createdAt: now, updatedAt: now } as Project
}

export function update(id: string, updates: Partial<Project>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  const setClauses: string[] = []
  const values: SqlValue[] = []

  if (updates.name !== undefined) {
    setClauses.push('name = ?')
    values.push(updates.name)
  }
  if (updates.productLine !== undefined) {
    setClauses.push('product_line = ?')
    values.push(updates.productLine)
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?')
    values.push(updates.status)
  }
  if (updates.tag !== undefined) {
    setClauses.push('tag = ?')
    values.push(updates.tag)
  }
  if (updates.totalAmount !== undefined) {
    setClauses.push('total_amount = ?')
    values.push(updates.totalAmount)
  }
  if (updates.usedAmount !== undefined) {
    setClauses.push('used_amount = ?')
    values.push(updates.usedAmount)
  }
  if (updates.progress !== undefined) {
    setClauses.push('progress = ?')
    values.push(updates.progress)
  }
  if (updates.subProgress !== undefined) {
    setClauses.push('sub_progress = ?')
    values.push(JSON.stringify(updates.subProgress))
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes = ?')
    values.push(updates.notes)
  }
  if (updates.team !== undefined) {
    setClauses.push('team = ?')
    values.push(JSON.stringify(updates.team))
  }
  if (updates.scope !== undefined) {
    setClauses.push('scope = ?')
    values.push(JSON.stringify(updates.scope))
  }
  if (updates.timeline !== undefined) {
    setClauses.push('timeline = ?')
    values.push(JSON.stringify(updates.timeline))
  }

  setClauses.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.run(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export function remove(id: string): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM projects WHERE id = ?', [id])
}
