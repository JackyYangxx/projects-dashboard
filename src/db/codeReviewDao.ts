import { getDatabase } from './index'
import type { MCPService, Skill, CodeReview } from '@/types'

// ── MCP Services ──────────────────────────────────────────────

export function insertMCPService(svc: MCPService): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO mcp_services (id, name, url, auth_header, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [svc.id, svc.name, svc.url, svc.authHeader || '', svc.enabled ? 1 : 0, svc.createdAt]
  )
}

export function getAllMCPServices(): MCPService[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM mcp_services ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    url: row[2] as string,
    authHeader: row[3] as string,
    enabled: row[4] === 1,
    createdAt: row[5] as string,
  }))
}

export function updateMCPService(id: string, updates: Partial<MCPService>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.name !== undefined) { fields.push('name = ?'); vals.push(updates.name) }
  if (updates.url !== undefined) { fields.push('url = ?'); vals.push(updates.url) }
  if (updates.authHeader !== undefined) { fields.push('auth_header = ?'); vals.push(updates.authHeader) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE mcp_services SET ${fields.join(', ')} WHERE id = ?`, vals)
}

export function deleteMCPService(id: string): void {
  getDatabase()?.run('DELETE FROM mcp_services WHERE id = ?', [id])
}

// ── Skills ─────────────────────────────────────────────────────

export function insertSkill(skill: Skill): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO skills (id, name, description, content, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [skill.id, skill.name, skill.description || '', skill.content, skill.enabled ? 1 : 0, skill.createdAt]
  )
}

export function getAllSkills(): Skill[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM skills ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    description: row[2] as string,
    content: row[3] as string,
    enabled: row[4] === 1,
    createdAt: row[5] as string,
  }))
}

export function updateSkill(id: string, updates: Partial<Skill>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.name !== undefined) { fields.push('name = ?'); vals.push(updates.name) }
  if (updates.description !== undefined) { fields.push('description = ?'); vals.push(updates.description) }
  if (updates.content !== undefined) { fields.push('content = ?'); vals.push(updates.content) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`, vals)
}

export function deleteSkill(id: string): void {
  getDatabase()?.run('DELETE FROM skills WHERE id = ?', [id])
}

// ── Code Reviews ──────────────────────────────────────────────

export function insertCodeReview(record: CodeReview): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO code_reviews (id, project_id, repository, branch, severity, title, description, file_path, line_range, ai_trace, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.id, record.projectId, record.repository, record.branch, record.severity,
     record.title, record.description, record.filePath || '', record.lineRange || '',
     record.aiTrace, record.createdAt]
  )
}

export function getCodeReviewsByProject(projectId: string): CodeReview[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec(
    `SELECT * FROM code_reviews WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  )
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    repository: row[2] as string,
    branch: row[3] as string,
    severity: row[4] as 'critical' | 'warning' | 'suggestion',
    title: row[5] as string,
    description: row[6] as string,
    filePath: row[7] as string,
    lineRange: row[8] as string,
    aiTrace: row[9] as string,
    createdAt: row[10] as string,
  }))
}

export function deleteCodeReview(id: string): void {
  getDatabase()?.run('DELETE FROM code_reviews WHERE id = ?', [id])
}