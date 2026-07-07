/// <reference lib="webworker" />
// src/agents/worker.ts — Web Worker entry point. Wires pipeline execution,
// control flags (pause/resume/skip/cancel), rule toggle cache, and DB proxy.
import type { AgentRule, TaskSummary } from '@/types/agent'
import type { ReviewIssue } from '@/types'
import type { WorkerInMessage, WorkerOutMessage } from './messageTypes'
import {
  createContext,
  runPipeline,
  buildTaskSummary,
  type PipelineContext,
} from './pipeline'
import { MockProvider } from './llmProvider'

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

// ─── State ────────────────────────────────────────────────────────────

// In-memory rule cache — populated on agent:start, mutated by agent:rule-toggle.
// Pipeline reads from PipelineContext.rules; we sync ctx.rules from cache on toggle.
let ruleCache: Map<string, AgentRule> = new Map()
let currentCtx: PipelineContext | null = null
let currentTaskId: string | null = null

// Control flags checked between pipeline stages.
const controlFlags = {
  paused: false,
  cancelled: false,
  skipRequested: false, // 'skip' pauses at next stage boundary, resume unsticks it
}

// ─── Posting ──────────────────────────────────────────────────────────

function post(msg: WorkerOutMessage): void {
  ctx.postMessage(msg)
}

// ─── Issue emission ───────────────────────────────────────────────────

// Forward resolved issues to the UI. Note: pipeline.ts's `resolved` field has
// overloaded semantics — LocateStage uses `resolved: true` for "found", while
// ReflectStage reuses the same flag to mark false-positives. We pass every
// issue through and let the UI decide how to display; don't risk dropping
// real issues by guessing intent.
function emitResolvedIssues(taskId: string, issues: ReviewIssue[]): void {
  for (const issue of issues) {
    post({ type: 'agent:issue-found', taskId, issue })
  }
}

// ─── Pipeline wiring ──────────────────────────────────────────────────

async function runRealPipeline(taskId: string, projectId: string, _mrIds: string[]): Promise<void> {
  // Reset flags at start of a new run.
  controlFlags.paused = false
  controlFlags.cancelled = false
  controlFlags.skipRequested = false

  // Build pipeline context. Real LLM provider from DB is wired in Task 21;
  // for now we use MockProvider so the pipeline is exercisable end-to-end.
  // Rules/memories are loaded from cache (populated on first start).
  const rules = Array.from(ruleCache.values())
  const pipelineCtx = createContext({
    taskId,
    projectId,
    modelMaxTokens: 200000,
    llmProvider: new MockProvider(),
    rules,
    memories: [],
  })
  currentCtx = pipelineCtx

  const callbacks = {
    onProgress: (phase: string, percent: number, currentFile: string, foundCount: number) => {
      post({ type: 'agent:progress', taskId, phase, percent, currentFile, foundCount })
    },
    onPhaseChange: (fromPhase: string, toPhase: string) => {
      post({ type: 'agent:phase-change', taskId, fromPhase, toPhase })
    },
  }

  try {
    await runPipeline(pipelineCtx, callbacks)

    // Check cancel one more time before persisting — a cancel issued during the
    // last stage shouldn't post a "completed" task.
    if (controlFlags.cancelled) {
      post({ type: 'agent:error', taskId: currentTaskId ?? taskId, error: 'cancelled' })
      return
    }

    // Emit every resolved issue; UI decides how to display.
    emitResolvedIssues(taskId, pipelineCtx.resolvedIssues)

    const summary: TaskSummary = buildTaskSummary(pipelineCtx)
    post({ type: 'agent:completed', taskId, summary })

    // Persist completed task via DB proxy — UI thread owns the DAO.
    post({
      type: 'agent:db-task-create',
      requestId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      task: {
        projectId,
        triggerType: 'manual',
        status: 'completed',
        phase: 'reflecting',
        progress: 1,
        totalMrCount: summary.totalMrs,
        completedMrCount: summary.completedMrs,
        totalIssueCount: summary.totalIssues,
        summary: JSON.stringify(summary),
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    post({ type: 'agent:error', taskId, error: msg })
    console.error('[Worker] Pipeline error:', err)
  } finally {
    currentCtx = null
  }
}

// ─── Main message handler ─────────────────────────────────────────────

ctx.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data

  switch (msg.type) {
    case 'agent:start': {
      currentTaskId = msg.taskId
      // Seed rule cache from the start payload if provided in the future;
      // for now it's empty — DB seeding happens at DB proxy layer (Task 21).
      runRealPipeline(msg.taskId, msg.projectId, msg.mrIds)
      break
    }

    case 'agent:control': {
      switch (msg.action) {
        case 'pause':
          controlFlags.paused = true
          break
        case 'resume':
          controlFlags.paused = false
          controlFlags.skipRequested = false
          break
        case 'skip':
          // Sticks at next stage gate; resume clears it.
          controlFlags.skipRequested = true
          break
        case 'cancel':
          controlFlags.cancelled = true
          controlFlags.paused = false
          controlFlags.skipRequested = false
          currentTaskId = null
          break
      }
      break
    }

    case 'agent:rule-toggle': {
      const existing = ruleCache.get(msg.ruleId)
      if (existing) {
        ruleCache.set(msg.ruleId, { ...existing, enabled: msg.enabled })
      } else {
        // First-time toggle: cache it so the in-flight pipeline picks it up
        // and subsequent starts see the same state.
        ruleCache.set(msg.ruleId, {
          id: msg.ruleId,
          name: msg.ruleId,
          description: '',
          content: '',
          examplesGood: [],
          examplesBad: [],
          severity: 'warning',
          scope: 'global',
          filePatterns: [],
          matchPatterns: [],
          enabled: msg.enabled,
          isBuiltin: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      // Propagate into in-flight context so subsequent stages (e.g. AnalyzeStage
      // which filters `rules.filter(r => r.enabled)`) see the change immediately.
      if (currentCtx) {
        const idx = currentCtx.rules.findIndex(r => r.id === msg.ruleId)
        if (idx >= 0) {
          currentCtx.rules[idx] = { ...currentCtx.rules[idx], enabled: msg.enabled }
        }
      }
      break
    }

    // DB proxy messages — echoed back via postMessage so the manager
    // can route to UI thread, which then calls DAO. Real wiring in Task 21.
    case 'agent:db-response':
    case 'agent:db-batch-done':
      // These come FROM the UI thread back TO the worker. Currently unused
      // inside the worker (DB work goes through UI thread directly), but
      // listed here so the message handler stays exhaustive.
      break

    default:
      break
  }
}

export {}
