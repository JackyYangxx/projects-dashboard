import { getDatabase } from './index'
import type { Project, SubProgress, TeamMember, ScopeItem, TimelineEvent, NoteHistory, Milestone } from '../types'
import type { SqlValue } from 'sql.js'
import { generateAvatarUrl } from '../utils/avatar'

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
  if (!db) {
    console.log('[DAO] findAll: db is null!')
    return []
  }

  const results = db.exec('SELECT * FROM projects ORDER BY created_at DESC')
  console.log('[DAO] findAll: query results length:', results.length)
  if (results.length === 0) return []

  console.log('[DAO] findAll: rows count:', results[0].values.length)
  return results[0].values.map((row) => {
    const columns = results[0].columns
    const rowObj: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      rowObj[col] = row[i]
    })

    return {
      id: rowObj.id as string,
      name: rowObj.name as string,
      productLine: rowObj.product_line as string,
      status: rowObj.status as Project['status'],
      tag: rowObj.tag as string,
      totalAmount: rowObj.total_amount as number,
      usedAmount: rowObj.used_amount as number,
      progress: rowObj.progress as number,
      subProgress: parseJsonField<SubProgress>(rowObj.sub_progress, { architecture: 0, uiux: 0, engineering: 0, qa: 0 }),
      notes: rowObj.notes as string,
      noteHistory: parseJsonField<NoteHistory[]>(rowObj.note_history, []),
      team: parseJsonField<TeamMember[]>(rowObj.team, []),
      scope: parseJsonField<ScopeItem[]>(rowObj.scope, []),
      milestones: parseJsonField<Milestone[]>(rowObj.milestones, []),
      timeline: parseJsonField<TimelineEvent[]>(rowObj.timeline, []),
      createdAt: rowObj.created_at as string,
      updatedAt: rowObj.updated_at as string,
      leader: rowObj.leader as string,
    }
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
    noteHistory: parseJsonField<NoteHistory[]>(row.note_history, []),
    team: parseJsonField<TeamMember[]>(row.team, []),
    scope: parseJsonField<ScopeItem[]>(row.scope, []),
    milestones: parseJsonField<Milestone[]>(row.milestones, []),
    timeline: parseJsonField<TimelineEvent[]>(row.timeline, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    leader: row.leader as string,
  }
}

export function create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  const id = generateId()
  const now = new Date().toISOString()

  // Auto-create team[0] from leader if team is empty but leader is set
  let team = project.team
  if (team.length === 0 && project.leader) {
    team = [{
      id: generateId(),
      name: project.leader,
      role: '负责人',
      avatar: generateAvatarUrl(project.leader),
    }]
  }

  db.run(
    `INSERT INTO projects (
      id, name, product_line, status, tag, total_amount, used_amount,
      progress, sub_progress, notes, note_history, team, scope, milestones, timeline, leader, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      JSON.stringify(project.noteHistory || []),
      JSON.stringify(team),
      JSON.stringify(project.scope),
      JSON.stringify(project.milestones || []),
      JSON.stringify(project.timeline),
      project.leader,
      now,
      now,
    ]
  )

  return { ...project, team, id, createdAt: now, updatedAt: now } as Project
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
  if (updates.noteHistory !== undefined) {
    setClauses.push('note_history = ?')
    values.push(JSON.stringify(updates.noteHistory))
  }
  if (updates.team !== undefined) {
    setClauses.push('team = ?')
    values.push(JSON.stringify(updates.team))
  }
  if (updates.scope !== undefined) {
    setClauses.push('scope = ?')
    values.push(JSON.stringify(updates.scope))
  }
  if (updates.milestones !== undefined) {
    setClauses.push('milestones = ?')
    values.push(JSON.stringify(updates.milestones))
  }
  if (updates.timeline !== undefined) {
    setClauses.push('timeline = ?')
    values.push(JSON.stringify(updates.timeline))
  }
  if (updates.leader !== undefined) {
    setClauses.push('leader = ?')
    values.push(updates.leader)
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

export function upsert(projectData: {
  name: string
  productLine: string
  leader: string
  status?: Project['status']
  progress: number
  totalAmount: number
  usedAmount: number
}): Project {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  const existing = db.exec(
    'SELECT id, team FROM projects WHERE name = ?',
    [projectData.name]
  )

  const now = new Date().toISOString()

  if (existing.length > 0 && existing[0].values.length > 0) {
    const existingId = existing[0].values[0][0] as string
    let existingTeam: TeamMember[] = []
    try {
      existingTeam = JSON.parse(existing[0].values[0][1] as string || '[]')
    } catch (e) {
      console.error('[DAO] upsert: failed to parse existing team JSON', e)
    }

    const updatedTeam: TeamMember[] = existingTeam.length > 0
      ? [{ ...existingTeam[0], name: projectData.leader, avatar: generateAvatarUrl(projectData.leader) }]
      : [{ id: crypto.randomUUID(), name: projectData.leader, role: '负责人', avatar: generateAvatarUrl(projectData.leader) }]

    const updates: string[] = ['product_line = ?', 'total_amount = ?', 'used_amount = ?', 'progress = ?', 'leader = ?', 'team = ?', 'updated_at = ?']
    const values: SqlValue[] = [projectData.productLine, projectData.totalAmount, projectData.usedAmount, projectData.progress, projectData.leader, JSON.stringify(updatedTeam), now]
    if (projectData.status !== undefined) {
      updates.unshift('status = ?')
      values.unshift(projectData.status)
    }
    updates.push('WHERE id = ?')
    values.push(existingId)

    db.run(`UPDATE projects SET ${updates.join(', ')}`, values)
    // Return updated data directly — no need to re-query
    return {
      ...findById(existingId)!,
      name: projectData.name,
      productLine: projectData.productLine,
      leader: projectData.leader,
      progress: projectData.progress,
      totalAmount: projectData.totalAmount,
      usedAmount: projectData.usedAmount,
    }
  } else {
    const newTeam: TeamMember[] = [{
      id: crypto.randomUUID(),
      name: projectData.leader,
      role: '负责人',
      avatar: generateAvatarUrl(projectData.leader),
    }]
    const newProject = {
      name: projectData.name,
      productLine: projectData.productLine,
      status: projectData.status ?? 'paused',
      tag: '',
      totalAmount: projectData.totalAmount,
      usedAmount: projectData.usedAmount,
      progress: projectData.progress,
      subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
      notes: '',
      noteHistory: [],
      team: newTeam,
      scope: [],
      milestones: [],
      timeline: [],
      leader: projectData.leader,
    }
    return create(newProject)
  }
}
