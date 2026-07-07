// src/agents/memoryManager.ts
import * as agentDao from '@/db/agentDao'
import type { AgentMemory, RawIssue } from '@/types/agent'

/**
 * Retrieve relevant memories for a project, sorted by relevance.
 * Delegates to agentDao.searchMemories.
 */
export async function retrieve(
  projectId: string,
  filePatterns: string[],
  limit?: number
): Promise<AgentMemory[]> {
  return agentDao.searchMemories(projectId, filePatterns, limit)
}

/**
 * Record a new issue. If a similar memory exists, increments occurrence_count
 * and updates last_accessed_at. Otherwise inserts a new memory.
 */
export async function record(
  issue: RawIssue,
  projectId: string,
  sourceReviewId: string
): Promise<void> {
  const category = issue.severity
  const existing = agentDao.findSimilarMemory(category, issue.title, projectId)
  const now = new Date().toISOString()

  if (existing) {
    agentDao.updateMemory(existing.id, {
      occurrenceCount: existing.occurrenceCount + 1,
      lastAccessedAt: now,
    })
    return
  }

  const memory: AgentMemory = {
    id: crypto.randomUUID(),
    type: 'pattern',
    category,
    title: issue.title,
    content: issue.description,
    projectId,
    filePattern: issue.filePath,
    sourceReviewId,
    occurrenceCount: 1,
    confidence: 0.5,
    lastAccessedAt: now,
    createdAt: now,
    updatedAt: now,
  }
  agentDao.insertMemory(memory)
}

/**
 * Evict old/stale memories. Delegates to agentDao.evictOldMemories.
 */
export function evict(): void {
  agentDao.evictOldMemories()
}

export function buildMemoryPrompt(memories: AgentMemory[]): string {
  if (memories.length === 0) return ''
  const lines = ['## 历史相关记忆', '', '以下是该项目历史上发现的问题模式，请关注类似问题：', '']
  for (const mem of memories) {
    lines.push(`- [${mem.type}] ${mem.title}: ${mem.content.slice(0, 200)}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function shouldCreateMemory(
  category: string,
  existingMemory: AgentMemory | null,
  projectId: string,
  issues: RawIssue[]
): AgentMemory | null {
  if (!existingMemory || existingMemory.occurrenceCount < 2) return null

  // Auto-create pattern memory when same issue appears >= 3 times
  const now = new Date().toISOString()
  const sampleIssue = issues[0]

  return {
    id: '', // assigned by caller
    type: 'pattern',
    category,
    title: sampleIssue?.title || category,
    content: sampleIssue?.description || '',
    projectId,
    occurrenceCount: existingMemory.occurrenceCount + 1,
    confidence: Math.min(existingMemory.confidence + 0.1, 1.0),
    lastAccessedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

export function needsEviction(): boolean {
  // Called periodically, returns true if cleanup needed
  // evictOldMemories() handles the actual logic (in DAO)
  return true
}