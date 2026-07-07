// src/types/agent.ts — Agent-specific types

export interface AgentRule {
  id: string
  name: string
  description: string
  content: string
  examplesGood: string[]    // JSON'd in DB
  examplesBad: string[]     // JSON'd in DB
  severity: 'critical' | 'warning' | 'suggestion'
  scope: 'global' | 'project'
  projectId?: string
  filePatterns: string[]    // glob patterns, JSON'd in DB
  matchPatterns: string[]   // regex patterns, JSON'd in DB
  enabled: boolean
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

export type MemoryType = 'pattern' | 'project' | 'rule_link' | 'fix'

export interface AgentMemory {
  id: string
  type: MemoryType
  category: string
  title: string
  content: string
  projectId?: string
  filePattern?: string
  sourceReviewId?: string
  occurrenceCount: number
  confidence: number        // 0-1
  lastAccessedAt?: string
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 'pending' | 'preparing' | 'analyzing' | 'locating' | 'reflecting' | 'completed' | 'paused' | 'failed' | 'cancelled'
export type TriggerType = 'manual' | 'scheduled'

export interface ReviewTask {
  id: string
  projectId: string
  triggerType: TriggerType
  status: TaskStatus
  phase?: string
  progress: number          // 0-1
  totalMrCount: number
  completedMrCount: number
  totalIssueCount: number
  summary?: string           // JSON
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface AgentReport {
  id: string
  timeRangeStart: string
  timeRangeEnd: string
  projectIds: string[]       // JSON'd in DB
  summary: string
  statsJson: string
  topIssuesJson: string
  createdAt: string
}

// Pipeline types
export interface MRToReview {
  mrId: string
  mrTitle: string
  mrUrl: string
  repository: string
  branch: string
}

export interface RuleMatch {
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'suggestion'
  filePath: string
  matchedLine: number
  matchedContent: string
}

export interface RawIssue {
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath: string
  codeSnippet: string
  suggestion?: string
}

export interface TaskSummary {
  totalMrs: number
  completedMrs: number
  failedMrs: number
  totalIssues: number
  bySeverity: { critical: number; warning: number; suggestion: number }
  byRule: Record<string, number>
}
