// src/agents/messageTypes.ts
import type { ReviewIssue } from '@/types'
import type { AgentMemory, ReviewTask, TaskSummary } from '@/types/agent'

// ─── UI → Worker ─────────────────────────────────

export type WorkerInMessage =
  | { type: 'agent:start'; taskId: string; projectId: string; mrIds: string[] }
  | { type: 'agent:control'; action: 'pause' | 'resume' | 'skip' | 'cancel' }
  | { type: 'agent:rule-toggle'; ruleId: string; enabled: boolean }
  | { type: 'agent:db-response'; requestId: string; result: unknown }
  | { type: 'agent:db-batch-done'; requestId: string; error?: string }

// ─── Worker → UI ─────────────────────────────────

export type WorkerOutMessage =
  | { type: 'agent:progress'; taskId: string; phase: string; percent: number; currentFile: string; foundCount: number }
  | { type: 'agent:issue-found'; taskId: string; issue: ReviewIssue }
  | { type: 'agent:phase-change'; taskId: string; fromPhase: string; toPhase: string }
  | { type: 'agent:completed'; taskId: string; summary: TaskSummary }
  | { type: 'agent:error'; taskId: string; error: string }
  | { type: 'agent:db-response'; requestId: string; result: unknown }
  | { type: 'agent:db-batch-done'; requestId: string; error?: string }
  // DB semantic API (worker requests DB ops from UI)
  | { type: 'agent:db-search-memories'; requestId: string; projectId: string; filePatterns: string[]; limit: number }
  | { type: 'agent:db-write-memory'; requestId: string; memory: Omit<AgentMemory, 'id' | 'createdAt'> }
  | { type: 'agent:db-task-create'; requestId: string; task: Omit<ReviewTask, 'id'> }
  | { type: 'agent:db-task-update'; requestId: string; id: string; updates: Partial<ReviewTask> }
  | { type: 'agent:db-batch'; requestId: string; statements: Array<{ sql: string; params?: unknown[] }> }
  | { type: 'agent:db-query'; requestId: string; sql: string; params?: unknown[] }
