import { getDatabase } from './index'
import type { BudgetSource } from '../types'

function generateId(): string {
  return crypto.randomUUID()
}

export function getAllBudgetSources(projectId: string): BudgetSource[] {
  const db = getDatabase()
  if (!db) {
    console.log('[BudgetSourceDao] getAllBudgetSources: db is null!')
    return []
  }

  const stmt = db.prepare('SELECT * FROM budget_sources WHERE project_id = ? ORDER BY created_at DESC')
  stmt.bind([projectId])

  const results: BudgetSource[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      id: row.id as string,
      projectId: row.project_id as string,
      label: row.label as string,
      amount: row.amount as number,
      usedAmount: row.used_amount as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    })
  }
  stmt.free()

  return results
}

export function insertBudgetSource(source: Omit<BudgetSource, 'createdAt' | 'updatedAt'>): BudgetSource {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  const id = generateId()
  const now = new Date().toISOString()

  db.run(
    `INSERT INTO budget_sources (id, project_id, label, amount, used_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, source.projectId, source.label, source.amount, source.usedAmount, now, now]
  )

  return { ...source, id, createdAt: now, updatedAt: now }
}

export function updateBudgetSource(id: string, updates: Partial<BudgetSource>): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  const setClauses: string[] = []
  const values: (string | number)[] = []

  if (updates.label !== undefined) {
    setClauses.push('label = ?')
    values.push(updates.label)
  }
  if (updates.amount !== undefined) {
    setClauses.push('amount = ?')
    values.push(updates.amount)
  }
  if (updates.usedAmount !== undefined) {
    setClauses.push('used_amount = ?')
    values.push(updates.usedAmount)
  }

  if (setClauses.length === 0) return

  setClauses.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.run(`UPDATE budget_sources SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export function deleteBudgetSource(id: string): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM budget_sources WHERE id = ?', [id])
}

export function deleteBudgetSourcesByProject(projectId: string): void {
  const db = getDatabase()
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM budget_sources WHERE project_id = ?', [projectId])
}