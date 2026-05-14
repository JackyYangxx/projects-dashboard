import { getDatabase } from './index'
import type { MCPService, Skill, CodeReview, LLMConfig, MRReviewRecord, ReviewReport } from '@/types'

// ── LLM Config ──────────────────────────────────────────────

export function insertLLMConfig(cfg: LLMConfig): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO llm_config (id, model_name, model_url, api_key, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cfg.id, cfg.modelName, cfg.modelUrl, cfg.apiKey, cfg.enabled ? 1 : 0, cfg.createdAt]
  )
}

export function getAllLLMConfigs(): LLMConfig[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM llm_config ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    modelName: row[1] as string,
    modelUrl: row[2] as string,
    apiKey: row[3] as string,
    enabled: row[4] === 1,
    createdAt: row[5] as string,
  }))
}

export function updateLLMConfig(id: string, updates: Partial<LLMConfig>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.modelName !== undefined) { fields.push('model_name = ?'); vals.push(updates.modelName) }
  if (updates.modelUrl !== undefined) { fields.push('model_url = ?'); vals.push(updates.modelUrl) }
  if (updates.apiKey !== undefined) { fields.push('api_key = ?'); vals.push(updates.apiKey) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE llm_config SET ${fields.join(', ')} WHERE id = ?`, vals)
}

export function deleteLLMConfig(id: string): void {
  getDatabase()?.run('DELETE FROM llm_config WHERE id = ?', [id])
}

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

// ── MR Review Records ──────────────────────────────────────────────

export function insertMRReviewRecord(record: MRReviewRecord): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO mr_review_records (id, project_id, project_name, mr_id, mr_title, mr_url, status, issues, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.id, record.projectId, record.projectName, record.mrId, record.mrTitle,
     record.mrUrl, record.status, JSON.stringify(record.issues), record.reviewedAt, record.createdAt]
  )
}

export function getMRReviewRecordsByProject(projectId: string): MRReviewRecord[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec(
    `SELECT * FROM mr_review_records WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  )
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    projectName: row[2] as string,
    mrId: row[3] as string,
    mrTitle: row[4] as string,
    mrUrl: row[5] as string,
    status: row[6] as 'pending' | 'reviewing' | 'completed' | 'failed',
    issues: JSON.parse(row[7] as string),
    reviewedAt: row[8] as string,
    createdAt: row[9] as string,
  }))
}

export function updateMRReviewRecord(id: string, updates: Partial<MRReviewRecord>): void {
  const db = getDatabase()
  if (!db) return
  const fields: string[] = []
  const vals: (string | number)[] = []
  if (updates.status !== undefined) { fields.push('status = ?'); vals.push(updates.status) }
  if (updates.issues !== undefined) { fields.push('issues = ?'); vals.push(JSON.stringify(updates.issues)) }
  if (updates.reviewedAt !== undefined) { fields.push('reviewed_at = ?'); vals.push(updates.reviewedAt) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE mr_review_records SET ${fields.join(', ')} WHERE id = ?`, vals)
}

export function deleteMRReviewRecord(id: string): void {
  getDatabase()?.run('DELETE FROM mr_review_records WHERE id = ?', [id])
}

export function deleteAllMRReviewRecords(): void {
  getDatabase()?.run('DELETE FROM mr_review_records')
}

export function getAllMRReviewRecords(): MRReviewRecord[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM mr_review_records ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    projectName: row[2] as string,
    mrId: row[3] as string,
    mrTitle: row[4] as string,
    mrUrl: row[5] as string,
    status: row[6] as 'pending' | 'reviewing' | 'completed' | 'failed',
    issues: JSON.parse(row[7] as string),
    reviewedAt: row[8] as string,
    createdAt: row[9] as string,
  }))
}

// ── Review Reports ──────────────────────────────────────────────

export function insertReviewReport(report: ReviewReport): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO review_reports (id, name, project_ids, total_mr_count, total_issue_count, issues_preview, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [report.id, report.name, report.projectIds, report.totalMrCount, report.totalIssueCount,
     report.issuesPreview, report.createdAt]
  )
}

export function getAllReviewReports(): ReviewReport[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM review_reports ORDER BY created_at DESC')
  if (!result[0]) return []
  return result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    projectIds: row[2] as string,
    totalMrCount: row[3] as number,
    totalIssueCount: row[4] as number,
    issuesPreview: row[5] as string,
    createdAt: row[6] as string,
  }))
}

export function deleteReviewReport(id: string): void {
  getDatabase()?.run('DELETE FROM review_reports WHERE id = ?', [id])
}