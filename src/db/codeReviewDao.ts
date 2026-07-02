import { getDatabase, persistDatabase } from './index'
import type { MCPService, Skill, LLMConfig, MRReviewRecord } from '@/types'

// ── LLM Config ──────────────────────────────────────────────

export function insertLLMConfig(cfg: LLMConfig): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO llm_config (id, model_name, model_url, api_key, api_type, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cfg.id, cfg.modelName, cfg.modelUrl, cfg.apiKey, cfg.apiType, cfg.enabled ? 1 : 0, cfg.createdAt]
  )
  persistDatabase()
}

export function getAllLLMConfigs(): LLMConfig[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM llm_config ORDER BY created_at DESC')
  if (!result[0]) return []
  const cols = result[0].columns
  const idx = (name: string) => cols.indexOf(name)
  return result[0].values.map(row => ({
    id: row[idx('id')] as string,
    modelName: row[idx('model_name')] as string,
    modelUrl: row[idx('model_url')] as string,
    apiKey: row[idx('api_key')] as string,
    apiType: (row[idx('api_type')] as string || 'anthropic') as 'openai' | 'anthropic',
    enabled: row[idx('enabled')] === 1,
    createdAt: row[idx('created_at')] as string,
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
  if (updates.apiType !== undefined) { fields.push('api_type = ?'); vals.push(updates.apiType) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE llm_config SET ${fields.join(', ')} WHERE id = ?`, vals)
  persistDatabase()
}

export function deleteLLMConfig(id: string): void {
  getDatabase()?.run('DELETE FROM llm_config WHERE id = ?', [id])
  persistDatabase()
}

// ── MCP Services ──────────────────────────────────────────────

export function insertMCPService(svc: MCPService): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO mcp_services (id, name, url, auth_header, tools, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [svc.id, svc.name, svc.url, svc.authHeader || '', JSON.stringify(svc.tools || []), svc.enabled ? 1 : 0, svc.createdAt]
  )
  persistDatabase()
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
    tools: JSON.parse(row[4] as string || '[]'),
    enabled: row[5] === 1,
    createdAt: row[6] as string,
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
  if (updates.tools !== undefined) { fields.push('tools = ?'); vals.push(JSON.stringify(updates.tools)) }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); vals.push(updates.enabled ? 1 : 0) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE mcp_services SET ${fields.join(', ')} WHERE id = ?`, vals)
  persistDatabase()
}

export function deleteMCPService(id: string): void {
  getDatabase()?.run('DELETE FROM mcp_services WHERE id = ?', [id])
  persistDatabase()
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
  persistDatabase()
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
  persistDatabase()
}

export function deleteSkill(id: string): void {
  getDatabase()?.run('DELETE FROM skills WHERE id = ?', [id])
  persistDatabase()
}

// ── MR Review Records ──────────────────────────────────────────────

export function insertMRReviewRecord(record: MRReviewRecord): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')
  db.run(
    `INSERT INTO mr_review_records (id, project_id, project_name, mr_id, mr_title, mr_url, status, diff, issues, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id, record.projectId, record.projectName, record.mrId, record.mrTitle,
      record.mrUrl, record.status, record.diff, JSON.stringify(record.issues),
      record.reviewedAt, record.createdAt,
    ]
  )
  persistDatabase()
}

export function getMRReviewRecordsByProject(projectId: string): MRReviewRecord[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec(
    `SELECT * FROM mr_review_records WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  )
  if (!result[0]) return []
  const columns = result[0].columns
  const diffIdx = columns.indexOf('diff')
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    projectName: row[2] as string,
    mrId: row[3] as string,
    mrTitle: row[4] as string,
    mrUrl: row[5] as string,
    status: row[6] as 'pending' | 'reviewing' | 'completed' | 'failed',
    diff: diffIdx >= 0 ? (row[diffIdx] as string ?? '') : '',
    issues: JSON.parse(row[7] as string) as MRReviewRecord['issues'],
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
  if (updates.diff !== undefined) { fields.push('diff = ?'); vals.push(updates.diff) }
  if (updates.issues !== undefined) { fields.push('issues = ?'); vals.push(JSON.stringify(updates.issues)) }
  if (updates.reviewedAt !== undefined) { fields.push('reviewed_at = ?'); vals.push(updates.reviewedAt) }
  if (fields.length === 0) return
  vals.push(id)
  db.run(`UPDATE mr_review_records SET ${fields.join(', ')} WHERE id = ?`, vals)
  persistDatabase()
}

export function deleteMRReviewRecord(id: string): void {
  getDatabase()?.run('DELETE FROM mr_review_records WHERE id = ?', [id])
  persistDatabase()
}

export function deleteAllMRReviewRecords(): void {
  getDatabase()?.run('DELETE FROM mr_review_records')
  persistDatabase()
}

export function getAllMRReviewRecords(): MRReviewRecord[] {
  const db = getDatabase()
  if (!db) return []
  const result = db.exec('SELECT * FROM mr_review_records ORDER BY created_at DESC')
  if (!result[0]) return []
  const columns = result[0].columns
  const diffIdx = columns.indexOf('diff')
  return result[0].values.map(row => ({
    id: row[0] as string,
    projectId: row[1] as string,
    projectName: row[2] as string,
    mrId: row[3] as string,
    mrTitle: row[4] as string,
    mrUrl: row[5] as string,
    status: row[6] as 'pending' | 'reviewing' | 'completed' | 'failed',
    diff: diffIdx >= 0 ? (row[diffIdx] as string ?? '') : '',
    issues: JSON.parse(row[7] as string) as MRReviewRecord['issues'],
    reviewedAt: row[8] as string,
    createdAt: row[9] as string,
  }))
}

