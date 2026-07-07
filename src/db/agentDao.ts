import { getDatabase, persistDatabase } from './index'
import type { AgentRule, AgentMemory, ReviewTask, AgentReport, TaskStatus } from '@/types/agent'

// ─── Agent Rules ─────────────────────────────────

export function getAllAgentRules(): AgentRule[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM agent_rules ORDER BY is_builtin DESC, created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string,
    name: row[idx('name')] as string,
    description: row[idx('description')] as string,
    content: row[idx('content')] as string,
    examplesGood: JSON.parse(row[idx('examples_good')] as string || '[]'),
    examplesBad: JSON.parse(row[idx('examples_bad')] as string || '[]'),
    severity: row[idx('severity')] as AgentRule['severity'],
    scope: row[idx('scope')] as AgentRule['scope'],
    projectId: (row[idx('project_id')] as string) || undefined,
    filePatterns: JSON.parse(row[idx('file_patterns')] as string || '[]'),
    matchPatterns: JSON.parse(row[idx('match_patterns')] as string || '[]'),
    enabled: !!row[idx('enabled')],
    isBuiltin: !!row[idx('is_builtin')],
    createdAt: row[idx('created_at')] as string,
    updatedAt: row[idx('updated_at')] as string,
  }))
}

export function insertAgentRule(rule: AgentRule): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO agent_rules (id, name, description, content, examples_good, examples_bad, severity, scope, project_id, file_patterns, match_patterns, enabled, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rule.id, rule.name, rule.description, rule.content,
     JSON.stringify(rule.examplesGood), JSON.stringify(rule.examplesBad),
     rule.severity, rule.scope, rule.projectId || null,
     JSON.stringify(rule.filePatterns), JSON.stringify(rule.matchPatterns),
     rule.enabled ? 1 : 0, rule.isBuiltin ? 1 : 0,
     rule.createdAt, rule.updatedAt]
  )
  persistDatabase()
}

export function updateAgentRule(id: string, updates: Partial<AgentRule>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  const fields: string[] = []
  const values: (string | number | null)[] = []
  const map: Record<string, string> = { name: 'name', description: 'description', content: 'content', severity: 'severity', scope: 'scope', projectId: 'project_id' }
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = ?`); values.push((updates as Record<string, unknown>)[key] as string | number | null) }
  }
  if ('filePatterns' in updates) { fields.push('file_patterns = ?'); values.push(JSON.stringify(updates.filePatterns)) }
  if ('matchPatterns' in updates) { fields.push('match_patterns = ?'); values.push(JSON.stringify(updates.matchPatterns)) }
  if ('examplesGood' in updates) { fields.push('examples_good = ?'); values.push(JSON.stringify(updates.examplesGood)) }
  if ('examplesBad' in updates) { fields.push('examples_bad = ?'); values.push(JSON.stringify(updates.examplesBad)) }
  if ('enabled' in updates) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0) }
  if ('isBuiltin' in updates) { fields.push('is_builtin = ?'); values.push(updates.isBuiltin ? 1 : 0) }
  if (fields.length === 0) return
  fields.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
  db.run(`UPDATE agent_rules SET ${fields.join(', ')} WHERE id = ?`, values)
  persistDatabase()
}

export function deleteAgentRule(id: string): void {
  getDatabase()?.run('DELETE FROM agent_rules WHERE id = ?', [id])
  persistDatabase()
}

// ─── Agent Memories ──────────────────────────────

export function getAllMemories(): AgentMemory[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM agent_memories ORDER BY updated_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string,
    type: row[idx('type')] as AgentMemory['type'],
    category: (row[idx('category')] as string) || '',
    title: row[idx('title')] as string,
    content: row[idx('content')] as string,
    projectId: (row[idx('project_id')] as string) || undefined,
    filePattern: (row[idx('file_pattern')] as string) || undefined,
    sourceReviewId: (row[idx('source_review_id')] as string) || undefined,
    occurrenceCount: row[idx('occurrence_count')] as number,
    confidence: row[idx('confidence')] as number,
    lastAccessedAt: (row[idx('last_accessed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string,
    updatedAt: row[idx('updated_at')] as string,
  }))
}

export function searchMemories(projectId?: string, filePatterns?: string[], limit = 5): AgentMemory[] {
  const db = getDatabase()
  if (!db) return []
  void filePatterns
  let sql = 'SELECT * FROM agent_memories WHERE 1=1'
  const params: (string | number | null)[] = []
  if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }
  sql += ' ORDER BY (confidence * occurrence_count) DESC LIMIT ?'
  params.push(limit)

  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: unknown[][] = []
  while (stmt.step()) { rows.push(stmt.getAsObject() as unknown as unknown[]) }
  stmt.free()
  if (rows.length === 0) return []

  const cols = Object.keys(rows[0] as unknown as Record<string, unknown>)
  const idx = (n: string) => cols.indexOf(n)
  return rows.map((row: unknown[]) => ({
    id: row[idx('id')] as string,
    type: row[idx('type')] as AgentMemory['type'],
    category: (row[idx('category')] as string) || '',
    title: row[idx('title')] as string,
    content: row[idx('content')] as string,
    projectId: (row[idx('project_id')] as string) || undefined,
    filePattern: (row[idx('file_pattern')] as string) || undefined,
    sourceReviewId: (row[idx('source_review_id')] as string) || undefined,
    occurrenceCount: row[idx('occurrence_count')] as number,
    confidence: row[idx('confidence')] as number,
    lastAccessedAt: (row[idx('last_accessed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string,
    updatedAt: row[idx('updated_at')] as string,
  }))
}

export function insertMemory(memory: AgentMemory): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO agent_memories (id, type, category, title, content, project_id, file_pattern, source_review_id, occurrence_count, confidence, last_accessed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [memory.id, memory.type, memory.category, memory.title, memory.content,
     memory.projectId || null, memory.filePattern || null, memory.sourceReviewId || null,
     memory.occurrenceCount, memory.confidence, memory.lastAccessedAt || null,
     memory.createdAt, memory.updatedAt]
  )
  persistDatabase()
}

export function updateMemory(id: string, updates: Partial<AgentMemory>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  const fields: string[] = []
  const values: (string | number | null)[] = []
  const map: Record<string, string> = { type: 'type', category: 'category', title: 'title', content: 'content', projectId: 'project_id', filePattern: 'file_pattern', sourceReviewId: 'source_review_id', lastAccessedAt: 'last_accessed_at' }
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = ?`); values.push((updates as Record<string, unknown>)[key] as string | number | null) }
  }
  if ('occurrenceCount' in updates) { fields.push('occurrence_count = ?'); values.push(updates.occurrenceCount ?? 0) }
  if ('confidence' in updates) { fields.push('confidence = ?'); values.push(updates.confidence ?? 0) }
  if (fields.length === 0) return
  fields.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
  db.run(`UPDATE agent_memories SET ${fields.join(', ')} WHERE id = ?`, values)
  persistDatabase()
}

export function findSimilarMemory(category: string, title: string, projectId?: string): AgentMemory | null {
  const db = getDatabase()
  if (!db) return null

  const stmt = db.prepare('SELECT * FROM agent_memories WHERE category = ? AND title = ? AND project_id = ?')
  stmt.bind([category, title, projectId || null])
  const rows: unknown[][] = []
  while (stmt.step()) { rows.push(stmt.getAsObject() as unknown as unknown[]) }
  stmt.free()
  if (rows.length === 0) return null

  const cols = Object.keys(rows[0] as unknown as Record<string, unknown>)
  const idx = (n: string) => cols.indexOf(n)
  const row = rows[0]
  return {
    id: row[idx('id')] as string, type: row[idx('type')] as AgentMemory['type'], category: (row[idx('category')] as string) || '',
    title: row[idx('title')] as string, content: row[idx('content')] as string,
    projectId: (row[idx('project_id')] as string) || undefined, filePattern: (row[idx('file_pattern')] as string) || undefined,
    sourceReviewId: (row[idx('source_review_id')] as string) || undefined, occurrenceCount: row[idx('occurrence_count')] as number,
    confidence: row[idx('confidence')] as number, lastAccessedAt: (row[idx('last_accessed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string, updatedAt: row[idx('updated_at')] as string,
  }
}

export function evictOldMemories(): void {
  const db = getDatabase()
  if (!db) return
  // Evict by age (90 days)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  db.run('DELETE FROM agent_memories WHERE last_accessed_at < ? AND last_accessed_at IS NOT NULL', [cutoff])
  // Evict by count (keep top 1000)
  const countResult = db.exec('SELECT COUNT(*) as c FROM agent_memories')
  const count = countResult[0]?.values[0]?.[0] as number
  if (count > 1000) {
    const toDelete = Math.floor(count * 0.1)
    db.run('DELETE FROM agent_memories WHERE id IN (SELECT id FROM agent_memories ORDER BY (confidence * occurrence_count) ASC LIMIT ?)', [toDelete])
  }
  persistDatabase()
}

// ─── Review Tasks ────────────────────────────────

export function getAllReviewTasks(): ReviewTask[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM review_tasks ORDER BY created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string, projectId: row[idx('project_id')] as string,
    triggerType: row[idx('trigger_type')] as ReviewTask['triggerType'],
    status: row[idx('status')] as TaskStatus, phase: (row[idx('phase')] as string) || undefined,
    progress: row[idx('progress')] as number, totalMrCount: row[idx('total_mr_count')] as number,
    completedMrCount: row[idx('completed_mr_count')] as number, totalIssueCount: row[idx('total_issue_count')] as number,
    summary: (row[idx('summary')] as string) || undefined, errorMessage: (row[idx('error_message')] as string) || undefined,
    startedAt: (row[idx('started_at')] as string) || undefined, completedAt: (row[idx('completed_at')] as string) || undefined,
    createdAt: row[idx('created_at')] as string,
  }))
}

export function getActiveReviewTask(): ReviewTask | null {
  const tasks = getAllReviewTasks()
  return tasks.find(t => !['completed', 'failed', 'cancelled'].includes(t.status)) || null
}

export function insertReviewTask(task: ReviewTask): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO review_tasks (id, project_id, trigger_type, status, phase, progress, total_mr_count, completed_mr_count, total_issue_count, summary, error_message, started_at, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.projectId, task.triggerType, task.status, task.phase || null,
     task.progress, task.totalMrCount, task.completedMrCount, task.totalIssueCount,
     task.summary || null, task.errorMessage || null, task.startedAt || null, task.completedAt || null, task.createdAt]
  )
  persistDatabase()
}

export function updateReviewTask(id: string, updates: Partial<ReviewTask>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  const fields: string[] = []
  const values: (string | number | null)[] = []
  const map: Record<string, string> = { triggerType: 'trigger_type', status: 'status', phase: 'phase', summary: 'summary', errorMessage: 'error_message', startedAt: 'started_at', completedAt: 'completed_at' }
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = ?`); values.push((updates as Record<string, unknown>)[key] as string | number | null) }
  }
  if ('progress' in updates) { fields.push('progress = ?'); values.push(updates.progress ?? 0) }
  if ('totalMrCount' in updates) { fields.push('total_mr_count = ?'); values.push(updates.totalMrCount ?? 0) }
  if ('completedMrCount' in updates) { fields.push('completed_mr_count = ?'); values.push(updates.completedMrCount ?? 0) }
  if ('totalIssueCount' in updates) { fields.push('total_issue_count = ?'); values.push(updates.totalIssueCount ?? 0) }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE review_tasks SET ${fields.join(', ')} WHERE id = ?`, values)
  persistDatabase()
}

// ─── Agent Reports ───────────────────────────────

export function getAllAgentReports(): AgentReport[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM agent_reports ORDER BY created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (n: string) => cols.indexOf(n)
  return result[0].values.map((row: unknown[]) => ({
    id: row[idx('id')] as string, timeRangeStart: row[idx('time_range_start')] as string,
    timeRangeEnd: row[idx('time_range_end')] as string, projectIds: JSON.parse(row[idx('project_ids')] as string || '[]'),
    summary: (row[idx('summary')] as string) || '', statsJson: row[idx('stats_json')] as string,
    topIssuesJson: row[idx('top_issues_json')] as string, createdAt: row[idx('created_at')] as string,
  }))
}

export function insertAgentReport(report: AgentReport): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO agent_reports (id, time_range_start, time_range_end, project_ids, summary, stats_json, top_issues_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [report.id, report.timeRangeStart, report.timeRangeEnd, JSON.stringify(report.projectIds), report.summary, report.statsJson, report.topIssuesJson, report.createdAt]
  )
  persistDatabase()
}

export function deleteAgentReport(id: string): void {
  getDatabase()?.run('DELETE FROM agent_reports WHERE id = ?', [id])
  persistDatabase()
}