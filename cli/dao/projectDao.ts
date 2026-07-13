import { randomUUID } from 'node:crypto'
import { getDatabase } from '../db'
import type { Project, TeamMember } from '../types'

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

function parseTags(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string')
    } catch {
      return [value.trim()]
    }
  }
  return []
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    productLine: row.product_line as string,
    status: row.status as Project['status'],
    tags: parseTags(row.tag),
    totalAmount: row.total_amount as number,
    usedAmount: row.used_amount as number,
    progress: row.progress as number,
    subProgress: parseJsonField(row.sub_progress, { architecture: 0, uiux: 0, engineering: 0, qa: 0 }),
    notes: (row.notes as string) || '',
    noteHistory: parseJsonField(row.note_history, []),
    team: parseJsonField<TeamMember[]>(row.team, []),
    scope: parseJsonField(row.scope, []),
    milestones: parseJsonField(row.milestones, []),
    timeline: parseJsonField(row.timeline, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    leader: (row.leader as string) || '',
    repositories: parseJsonField(row.repositories, []),
    projectId: (row.project_id as string) || '',
    ext1: (row.ext1 as string) || '',
    ext2: (row.ext2 as string) || '',
    ext3: (row.ext3 as string) || '',
    ext4: (row.ext4 as string) || '',
    ext5: (row.ext5 as string) || '',
  }
}

export interface ListFilters {
  status?: string
  productLine?: string
  search?: string
}

export function findAll(filters?: ListFilters): Project[] {
  const db = getDatabase()

  let sql = 'SELECT * FROM projects'
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters?.productLine) {
    conditions.push('product_line = ?')
    params.push(filters.productLine)
  }
  if (filters?.search) {
    conditions.push('name LIKE ?')
    params.push(`%${filters.search}%`)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY created_at DESC'

  const stmt = db.prepare(sql)
  const rows = stmt.all(...params)
  return rows.map((row: unknown) => rowToProject(row as Record<string, unknown>))
}

export function findById(id: string): Project | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  const row = stmt.get(id) as Record<string, unknown> | undefined
  return row ? rowToProject(row) : undefined
}

export function findByName(name: string): Project | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects WHERE name = ?')
  const row = stmt.get(name) as Record<string, unknown> | undefined
  return row ? rowToProject(row) : undefined
}

function generateAvatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
}

export interface CreateProjectInput {
  name: string
  productLine: string
  leader: string
  status?: string
  progress?: number
  totalAmount?: number
  usedAmount?: number
  tags?: string[]
  projectId?: string
  repositories?: Array<{ id?: string; url: string; branch: string; note?: string }>
  notes?: string
}

export function create(input: CreateProjectInput): Project {
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  const status = input.status || 'paused'
  const progress = input.progress ?? 0
  const totalAmount = input.totalAmount ?? 0
  const usedAmount = input.usedAmount ?? 0
  const tags = input.tags || []
  const projectId = input.projectId || ''
  const repositories = input.repositories || []
  const notes = input.notes || ''

  const team: TeamMember[] = [{
    id: randomUUID(),
    name: input.leader,
    role: '负责人',
    avatar: generateAvatarUrl(input.leader),
  }]

  db.prepare(`
    INSERT INTO projects (
      id, name, product_line, status, tag, total_amount, used_amount,
      progress, sub_progress, notes, note_history, team, scope, milestones,
      timeline, leader, repositories, project_id, ext1, ext2, ext3, ext4, ext5,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.name, input.productLine, status, JSON.stringify(tags),
    totalAmount, usedAmount, progress,
    JSON.stringify({ architecture: 0, uiux: 0, engineering: 0, qa: 0 }),
    notes, JSON.stringify([]), JSON.stringify(team), JSON.stringify([]),
    JSON.stringify([]), JSON.stringify([]), input.leader,
    JSON.stringify(repositories), projectId, '', '', '', '', '', now, now
  )

  return findById(id)!
}

export function update(id: string, updates: Partial<Project>): Project {
  const db = getDatabase()
  const existing = findById(id)
  if (!existing) throw new Error('项目不存在')

  const setClauses: string[] = []
  const values: unknown[] = []

  const fieldMap: Array<[unknown, string]> = [
    [updates.name, 'name'],
    [updates.productLine, 'product_line'],
    [updates.status, 'status'],
    [updates.tags !== undefined ? JSON.stringify(updates.tags) : undefined, 'tag'],
    [updates.totalAmount, 'total_amount'],
    [updates.usedAmount, 'used_amount'],
    [updates.progress, 'progress'],
    [updates.subProgress !== undefined ? JSON.stringify(updates.subProgress) : undefined, 'sub_progress'],
    [updates.notes !== undefined ? updates.notes : undefined, 'notes'],
    [updates.noteHistory !== undefined ? JSON.stringify(updates.noteHistory) : undefined, 'note_history'],
    [updates.team !== undefined ? JSON.stringify(updates.team) : undefined, 'team'],
    [updates.scope !== undefined ? JSON.stringify(updates.scope) : undefined, 'scope'],
    [updates.milestones !== undefined ? JSON.stringify(updates.milestones) : undefined, 'milestones'],
    [updates.timeline !== undefined ? JSON.stringify(updates.timeline) : undefined, 'timeline'],
    [updates.leader, 'leader'],
    [updates.repositories !== undefined ? JSON.stringify(updates.repositories) : undefined, 'repositories'],
    [updates.projectId, 'project_id'],
    [updates.ext1, 'ext1'],
    [updates.ext2, 'ext2'],
    [updates.ext3, 'ext3'],
    [updates.ext4, 'ext4'],
    [updates.ext5, 'ext5'],
  ]

  for (const [value, column] of fieldMap) {
    if (value !== undefined) {
      setClauses.push(`${column} = ?`)
      values.push(value)
    }
  }

  setClauses.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)

  return findById(id)!
}

export function remove(id: string): void {
  const db = getDatabase()
  const existing = findById(id)
  if (!existing) throw new Error('项目不存在')
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}
