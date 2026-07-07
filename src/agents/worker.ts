/// <reference lib="webworker" />
// src/agents/worker.ts — Web Worker entry point
import type { AgentRule, TaskSummary } from '@/types/agent'
import type { WorkerInMessage, WorkerOutMessage } from './messageTypes'

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

// In-memory rule cache — populated on agent:start (placeholder: empty for now)
// Real rule loading is wired in a later task.
let ruleCache: Map<string, AgentRule> = new Map()

// Pipeline state flags (stub — real pipeline wires in Task 12)
let controlFlags = {
  paused: false,
  cancelled: false,
}

function post(msg: WorkerOutMessage): void {
  ctx.postMessage(msg)
}

// Helper: artificial delay for stub progress
const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

// Stub pipeline — emits progress through phases, then completes with empty summary.
// Real pipeline is wired in Task 12.
async function runPipeline(taskId: string, _projectId: string, mrIds: string[]): Promise<void> {
  controlFlags = { paused: false, cancelled: false }

  const phases: Array<{ name: string; percent: number; durationMs: number }> = [
    { name: 'preparing', percent: 10, durationMs: 100 },
    { name: 'analyzing', percent: 40, durationMs: 150 },
    { name: 'locating', percent: 70, durationMs: 150 },
    { name: 'reflecting', percent: 95, durationMs: 100 },
  ]

  let prevPhase = ''
  for (const phase of phases) {
    if (controlFlags.cancelled) return
    if (prevPhase) {
      post({ type: 'agent:phase-change', taskId, fromPhase: prevPhase, toPhase: phase.name })
    }
    post({ type: 'agent:progress', taskId, phase: phase.name, percent: phase.percent, currentFile: '', foundCount: 0 })
    await delay(phase.durationMs)
    prevPhase = phase.name
  }

  if (controlFlags.cancelled) return

  const summary: TaskSummary = {
    totalMrs: mrIds.length,
    completedMrs: mrIds.length,
    failedMrs: 0,
    totalIssues: 0,
    bySeverity: { critical: 0, warning: 0, suggestion: 0 },
    byRule: {},
  }
  post({ type: 'agent:completed', taskId, summary })
}

// ─── Message handler ──────────────────────────────

ctx.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data
  switch (msg.type) {
    case 'agent:start':
      runPipeline(msg.taskId, msg.projectId, msg.mrIds)
      break
    case 'agent:control':
      if (msg.action === 'pause') controlFlags.paused = true
      else if (msg.action === 'resume') controlFlags.paused = false
      else if (msg.action === 'cancel') controlFlags.cancelled = true
      // 'skip' is a no-op in this stub
      console.log('[Worker] Control:', msg.action)
      break
    case 'agent:rule-toggle': {
      const existing = ruleCache.get(msg.ruleId)
      if (existing) {
        ruleCache.set(msg.ruleId, { ...existing, enabled: msg.enabled })
      }
      console.log('[Worker] Rule toggle:', msg.ruleId, msg.enabled)
      break
    }
    // DB proxy messages — echoed back via postMessage so the manager
    // can route to UI thread, which then calls DAO. Real wiring in Task 21.
    case 'agent:db-response':
    case 'agent:db-batch-done':
      // These come FROM the UI thread back TO the worker — handled
      // directly by dbRequest() callers, not the main handler. Nothing to do.
      break
    default:
      break
  }
}

export {}