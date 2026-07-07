// src/agents/pipeline.ts — 4-stage pipeline orchestrator for code review agent

import type { AgentRule, AgentMemory, MRToReview, RuleMatch, RawIssue, TaskSummary } from '@/types/agent'
import type { LLMProvider } from './llmProvider'
import type { ParsedDiff, ParsedFile } from '@/utils/diffParser'
import type { ReviewIssue } from '@/types'
import { parseDiff } from '@/utils/diffParser'
import { resolveIssues, type AIResponseIssue } from '@/utils/issueResolver'
import { matchRules, buildRuleContextPrompt } from './ruleEngine'
import { planFileBudget, estimateTokens } from './tokenBudget'
import * as memoryManager from './memoryManager'

// ─── Callbacks ────────────────────────────────────────────────────────

export interface PipelineCallbacks {
  onProgress: (phase: string, percent: number, currentFile: string, foundCount: number) => void
  onPhaseChange: (fromPhase: string, toPhase: string) => void
}

// ─── Pipeline context (mutated in place across stages) ────────────────

export interface PipelineContext {
  taskId: string
  projectId: string
  modelMaxTokens: number
  llmProvider: LLMProvider
  rules: AgentRule[]
  memories: AgentMemory[]

  // Per-MR working state — populated by stages
  mr: MRToReview | null
  diffText: string
  parsedDiff: ParsedDiff | null
  diffFiles: Array<{ path: string; content: string }>
  ruleMatches: RuleMatch[]
  rawIssues: RawIssue[]
  resolvedIssues: ReviewIssue[]

  // Accumulated summary state across MRs
  totalIssues: number
  completedMrs: number
  failedMrs: number
  bySeverity: { critical: number; warning: number; suggestion: number }
  byRule: Record<string, number>
}

export function createContext(opts: {
  taskId: string
  projectId: string
  modelMaxTokens: number
  llmProvider: LLMProvider
  rules: AgentRule[]
  memories: AgentMemory[]
}): PipelineContext {
  return {
    taskId: opts.taskId,
    projectId: opts.projectId,
    modelMaxTokens: opts.modelMaxTokens,
    llmProvider: opts.llmProvider,
    rules: opts.rules,
    memories: opts.memories,
    mr: null,
    diffText: '',
    parsedDiff: null,
    diffFiles: [],
    ruleMatches: [],
    rawIssues: [],
    resolvedIssues: [],
    totalIssues: 0,
    completedMrs: 0,
    failedMrs: 0,
    bySeverity: { critical: 0, warning: 0, suggestion: 0 },
    byRule: {},
  }
}

// ─── Stage interface ───────────────────────────────────────────────────

export interface PipelineStage {
  readonly name: string
  execute(ctx: PipelineContext, callbacks: PipelineCallbacks): Promise<PipelineContext>
}

// ─── Stage 1: Prepare ─────────────────────────────────────────────────

export class PrepareStage implements PipelineStage {
  readonly name = 'preparing'

  async execute(ctx: PipelineContext, cb: PipelineCallbacks): Promise<PipelineContext> {
    cb.onPhaseChange('', this.name)
    cb.onProgress(this.name, 0.1, ctx.mr?.mrId ?? '', 0)

    // Parse diff into structured form
    ctx.parsedDiff = parseDiff(ctx.diffText)

    // Project files as {path, content} for token budgeting
    ctx.diffFiles = ctx.parsedDiff.files.map(f => ({
      path: f.path,
      content: f.hunks.map(h => h.lines.map(l => l.content).join('\n')).join('\n'),
    }))

    // Match regex-based rules against diff hunks
    ctx.ruleMatches = matchRules(ctx.parsedDiff, ctx.rules)

    // Record matched-rule occurrence counts for summary aggregation
    for (const m of ctx.ruleMatches) {
      ctx.byRule[m.ruleName] = (ctx.byRule[m.ruleName] || 0) + 1
    }

    cb.onProgress(this.name, 0.2, ctx.parsedDiff.files[0]?.path ?? '', ctx.ruleMatches.length)
    return ctx
  }
}

// ─── Stage 2: Analyze (LLM) ───────────────────────────────────────────

export class AnalyzeStage implements PipelineStage {
  readonly name = 'analyzing'

  async execute(ctx: PipelineContext, cb: PipelineCallbacks): Promise<PipelineContext> {
    cb.onPhaseChange('preparing', this.name)
    cb.onProgress(this.name, 0.25, ctx.parsedDiff?.files[0]?.path ?? '', 0)

    if (!ctx.parsedDiff) {
      console.warn('[AnalyzeStage] missing parsedDiff; skipping')
      return ctx
    }

    const activeRules = ctx.rules.filter(r => r.enabled)
    const rulePrompt = buildRuleContextPrompt(activeRules)
    const memoryPrompt = memoryManager.buildMemoryPrompt(ctx.memories)

    const systemPrompt = [
      '你是一名代码评审专家。分析以下 git diff，以 JSON 数组格式输出发现的问题。',
      '每个问题格式: {"severity":"critical|warning|suggestion","title":"","description":"","filePath":"","codeSnippet":"","suggestion":""}',
      rulePrompt,
      memoryPrompt,
    ].filter(Boolean).join('\n\n')

    // Token-aware budget plan; truncate diff text if necessary
    const plan = planFileBudget(ctx.diffFiles, ctx.modelMaxTokens)
    const truncated = truncateDiffText(ctx.diffText, plan.availableTokens)

    const llmResponse = await ctx.llmProvider.chat({
      systemPrompt,
      messages: [{ role: 'user', content: `Git Diff:\n\`\`\`diff\n${truncated}\n\`\`\`` }],
      maxTokens: 4096,
    })

    ctx.rawIssues = parseIssuesFromResponse(llmResponse.content)

    cb.onProgress(this.name, 0.5, ctx.parsedDiff.files[0]?.path ?? '', ctx.rawIssues.length)
    return ctx
  }
}

function truncateDiffText(diffText: string, availableTokens: number): string {
  const maxChars = availableTokens * 3 // ~3 chars per token safe margin
  if (estimateTokens(diffText) <= availableTokens) return diffText
  return diffText.slice(0, maxChars)
}

// ─── Stage 3: Locate (3-tier strategy) ────────────────────────────────

export class LocateStage implements PipelineStage {
  readonly name = 'locating'

  async execute(ctx: PipelineContext, cb: PipelineCallbacks): Promise<PipelineContext> {
    cb.onPhaseChange('analyzing', this.name)
    cb.onProgress(this.name, 0.6, '', ctx.rawIssues.length)

    if (!ctx.parsedDiff) {
      console.warn('[LocateStage] missing parsedDiff; skipping')
      return ctx
    }

    // First pass: existing issueResolver does hunk-exact + fuzzy within ParsedFile.
    // We wrap it to add a 2nd-tier file-scan when a codeSnippet can't be resolved.
    const resolved: ReviewIssue[] = []
    for (const issue of ctx.rawIssues) {
      const located = locateIssue(issue, ctx.parsedDiff)
      resolved.push(located)
    }
    ctx.resolvedIssues = resolved

    cb.onProgress(this.name, 0.75, '', ctx.resolvedIssues.filter(i => i.resolved).length)
    return ctx
  }
}

/**
 * 3-tier locate strategy:
 *   1. Hunk exact match (issueResolver.findExact)
 *   2. Full-file line-by-line scan (against all lines of the file, not just hunks)
 *   3. Fuzzy match (edit-distance / Levenshtein within hunks)
 */
function locateIssue(issue: RawIssue, parsed: ParsedDiff): ReviewIssue {
  const file = parsed.files.find(f => f.path === issue.filePath)
  const baseId = `iss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  if (!file) {
    return { ...issue, id: baseId, resolved: false }
  }

  // Tier 1: existing resolver handles exact + fuzzy in one call
  const [resolved] = resolveIssues([toAI(issue)], parsed)
  if (resolved.resolved) {
    return resolved
  }

  // Tier 2: scan every hunk line (not just 'add') for snippet match
  const lineNumber = findInAllLines(issue.codeSnippet, file)
  if (lineNumber !== null) {
    return { ...resolved, lineNumber, resolved: true }
  }

  // Tier 3 already covered by resolver's fuzzy; if still unresolved, leave it
  return resolved
}

function toAI(issue: RawIssue): AIResponseIssue {
  return {
    severity: issue.severity,
    title: issue.title,
    description: issue.description,
    filePath: issue.filePath,
    codeSnippet: issue.codeSnippet,
  }
}

function findInAllLines(snippet: string, file: ParsedFile): number | null {
  const target = snippet.replace(/^[+\- ]/, '').trim()
  if (!target) return null

  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      const candidate = line.content.replace(/^[+\- ]/, '').trim()
      if (candidate === target) return line.num
    }
  }
  return null
}

// ─── Stage 4: Reflect (LLM self-check + aggregation) ──────────────────

export class ReflectStage implements PipelineStage {
  readonly name = 'reflecting'

  async execute(ctx: PipelineContext, cb: PipelineCallbacks): Promise<PipelineContext> {
    cb.onPhaseChange('locating', this.name)

    // LLM self-check: ask the model to mark likely false positives
    if (ctx.resolvedIssues.length > 0) {
      try {
        const checkPrompt = '请检查以下代码审查发现问题是否为误报（false positive）。对于每个问题，判断是否为真正的代码问题，用 JSON 数组返回：[{"issueTitle": "...", "isFalsePositive": true/false, "reason": "..."}]'
        const checkResponse = await ctx.llmProvider.chat({
          systemPrompt: checkPrompt,
          messages: [{
            role: 'user',
            content: JSON.stringify(ctx.resolvedIssues.map(i => ({
              title: i.title,
              description: i.description,
              codeSnippet: i.codeSnippet,
            }))),
          }],
          maxTokens: 2048,
        })

        const json = extractFirstJsonArray(checkResponse.content)
        if (json) {
          const checks = JSON.parse(json) as Array<{ issueTitle: string; isFalsePositive?: boolean }>
          const fpTitles = new Set(
            checks.filter(c => c.isFalsePositive).map(c => c.issueTitle)
          )
          ctx.resolvedIssues.forEach(i => {
            if (fpTitles.has(i.title)) i.resolved = true
          })
        }
      } catch (err) {
        console.warn('[ReflectStage] self-check parse failed:', err)
      }
    }

    // Aggregate stats from non-resolved (kept) issues
    for (const issue of ctx.resolvedIssues) {
      if (issue.resolved) continue // marked false-positive
      ctx.totalIssues++
      ctx.bySeverity[issue.severity]++
    }

    ctx.completedMrs++

    cb.onProgress(this.name, 0.95, '', ctx.totalIssues)
    return ctx
  }
}

// ─── Response parsing helpers ─────────────────────────────────────────

function extractFirstJsonArray(text: string): string | null {
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      if (depth === 0) start = i
      depth++
    } else if (text[i] === ']') {
      depth--
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

function parseIssuesFromResponse(text: string): RawIssue[] {
  const json = extractFirstJsonArray(text)
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item: unknown): item is Record<string, unknown> => {
      if (typeof item !== 'object' || item === null) return false
      const i = item as Record<string, unknown>
      return typeof i.title === 'string' && typeof i.description === 'string'
    }).map(item => ({
      severity: (item.severity as RawIssue['severity']) || 'warning',
      title: item.title as string,
      description: item.description as string,
      filePath: (item.filePath as string) || '',
      codeSnippet: (item.codeSnippet as string) || '',
      suggestion: (item.suggestion as string) || undefined,
    }))
  } catch {
    return []
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────

const STAGES: PipelineStage[] = [
  new PrepareStage(),
  new AnalyzeStage(),
  new LocateStage(),
  new ReflectStage(),
]

export async function runPipeline(
  ctx: PipelineContext,
  callbacks: PipelineCallbacks
): Promise<PipelineContext> {
  for (const stage of STAGES) {
    await stage.execute(ctx, callbacks)
  }
  return ctx
}

export function buildTaskSummary(ctx: PipelineContext): TaskSummary {
  return {
    totalMrs: ctx.completedMrs + ctx.failedMrs,
    completedMrs: ctx.completedMrs,
    failedMrs: ctx.failedMrs,
    totalIssues: ctx.totalIssues,
    bySeverity: { ...ctx.bySeverity },
    byRule: { ...ctx.byRule },
  }
}