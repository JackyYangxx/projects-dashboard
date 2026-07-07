// src/agents/tokenBudget.ts — Token budget manager for the code-review agent

export type TokenStrategy = 'full' | 'file-split' | 'truncate-large' | 'compress' | 'downgrade'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface BudgetPlan {
  strategy: TokenStrategy
  availableTokens: number
  estimatedTotal: number
  shards?: Array<Array<{ path: string; content: string }>>
  skippedFiles?: string[]
  compressedMessages?: ChatMessage[]
}

const RESERVED_TOKENS = 8500 // system prompt + rules + memories + output
const LARGE_FILE_RATIO = 0.8 // files > 80% of available are skipped
const DEGRADE_RATIO = 2 // total > 2x available => downgrade
const COMPRESS_RATIO = 0.6 // messages > 60% of max => compress middle
const ACTIVE_ZONE_TURNS = 3 // last N turns kept raw
const COMPRESS_ZONE_KEEP = 2000 // chars to keep per compressed turn

/**
 * Estimate token count for mixed-language text.
 * English/code: ~4 chars/token; Chinese: ~1.5 chars/token.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let enChars = 0
  let zhChars = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      zhChars++
    } else {
      enChars++
    }
  }
  return Math.ceil(enChars / 4 + zhChars / 1.5)
}

/**
 * Decide how to fit totalTokens into maxTokens.
 * Returns the strategy and the token budget available for content.
 */
export function planBudget(totalTokens: number, maxTokens: number): { strategy: TokenStrategy; availableTokens: number } {
  const available = Math.max(0, maxTokens - RESERVED_TOKENS)
  if (totalTokens <= available) return { strategy: 'full', availableTokens: available }
  if (totalTokens <= available * DEGRADE_RATIO) return { strategy: 'file-split', availableTokens: available }
  return { strategy: 'downgrade', availableTokens: available }
}

/**
 * Plan a budget for a set of diff files against a model's token window.
 */
export function planFileBudget(
  diffFiles: Array<{ path: string; content: string }>,
  modelMaxTokens: number
): BudgetPlan {
  const available = Math.max(0, modelMaxTokens - RESERVED_TOKENS)
  const totalEstimated = diffFiles.reduce((sum, f) => sum + estimateTokens(f.content), 0)

  if (totalEstimated <= available) {
    return { strategy: 'full', availableTokens: available, estimatedTotal: totalEstimated }
  }

  const largeFiles = diffFiles.filter(f => estimateTokens(f.content) > available * LARGE_FILE_RATIO)
  const skippedFiles = largeFiles.map(f => f.path)
  const remainingFiles = diffFiles.filter(f => !largeFiles.includes(f))

  if (totalEstimated > available * DEGRADE_RATIO) {
    return {
      strategy: 'downgrade',
      availableTokens: available,
      estimatedTotal: totalEstimated,
      skippedFiles: diffFiles.map(f => f.path),
    }
  }

  // Shard: split remaining files into groups that each fit within available tokens.
  const shards: Array<Array<{ path: string; content: string }>> = []
  let currentShard: Array<{ path: string; content: string }> = []
  let currentTokens = 0

  for (const file of remainingFiles) {
    const fileTokens = estimateTokens(file.content)
    if (currentTokens + fileTokens > available && currentShard.length > 0) {
      shards.push(currentShard)
      currentShard = []
      currentTokens = 0
    }
    currentShard.push(file)
    currentTokens += fileTokens
  }
  if (currentShard.length > 0) shards.push(currentShard)

  return {
    strategy: 'file-split',
    availableTokens: available,
    estimatedTotal: totalEstimated,
    shards,
    skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
  }
}

/**
 * Compress conversation history using the three-zone model.
 * Frozen: system + rules (never compressed).
 * Compress: middle conversation (structured XML when > 60% maxTokens).
 * Active: last 3 turns (kept raw).
 */
export function compressMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
  if (messages.length === 0) return messages

  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  if (totalTokens <= maxTokens * COMPRESS_RATIO) return messages

  // Frozen zone: leading system messages.
  const frozenEnd = messages.findIndex(m => m.role !== 'system')
  const frozen: ChatMessage[] = frozenEnd === -1 ? [...messages] : messages.slice(0, frozenEnd)

  // Active zone: last N turns (user/assistant).
  const activeStart = Math.max(frozen.length, messages.length - ACTIVE_ZONE_TURNS)
  const active: ChatMessage[] = messages.slice(activeStart)

  // Compress zone: middle.
  const middle: ChatMessage[] = messages.slice(frozen.length, activeStart)
  const compressed: ChatMessage[] = middle.map(m => ({
    role: m.role,
    content: compressToXml(m.content),
  }))

  return [...frozen, ...compressed, ...active]
}

function compressToXml(content: string): string {
  const head = content.slice(0, COMPRESS_ZONE_KEEP)
  return `<summary role="compressed">${head}${content.length > COMPRESS_ZONE_KEEP ? '...' : ''}</summary>`
}