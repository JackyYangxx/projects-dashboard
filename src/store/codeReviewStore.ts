import { create } from 'zustand'
import type { MCPService, Skill, LLMConfig, MRReviewRecord, ReviewIssue, IssueSeverity } from '@/types'
import type { ReviewTask } from '@/types/agent'
import {
  getAllMCPServices, insertMCPService, updateMCPService, deleteMCPService,
  getAllSkills, insertSkill, updateSkill, deleteSkill,
  getAllLLMConfigs, insertLLMConfig, updateLLMConfig, deleteLLMConfig,
  insertMRReviewRecord, getAllMRReviewRecords, getMRReviewRecordsByProject,
  deleteMRReviewRecord, deleteAllMRReviewRecords,
} from '@/db/codeReviewDao'
import { getAllReviewTasks } from '@/db/agentDao'
import { getAgentWorker, sendToWorker, subscribeToWorker } from '@/agents/agentWorkerManager'
import { useProjectStore } from './projectStore'
import { parseDiff } from '@/utils/diffParser'
import { resolveIssues, type AIResponseIssue } from '@/utils/issueResolver'

const VALID_SEVERITIES: readonly IssueSeverity[] = ['critical', 'warning', 'suggestion']

interface ReviewProgress {
  projectId: string
  projectName: string
  mrTitle: string
  progress: number
  completed: number
  total: number
}

interface CodeReviewStore {
  // LLM Config
  llmConfigs: LLMConfig[]
  loadLLMConfigs: () => void
  addLLMConfig: (cfg: Omit<LLMConfig, 'id' | 'createdAt'>) => void
  updateLLMConfig: (id: string, updates: Partial<LLMConfig>) => void
  toggleLLMConfig: (id: string, enabled: boolean) => void
  removeLLMConfig: (id: string) => void
  testLLMConfig: (url: string, apiKey: string, modelName?: string, apiType?: 'openai' | 'anthropic') => Promise<{ success: boolean; message: string }>

  // MCP
  mcps: MCPService[]
  loadMCPs: () => void
  addMCP: (mcp: Omit<MCPService, 'id' | 'createdAt'>) => void
  toggleMCP: (id: string, enabled: boolean) => void
  removeMCP: (id: string) => void

  // Skills
  skills: Skill[]
  loadSkills: () => void
  addSkill: (skill: Omit<Skill, 'id' | 'createdAt'>) => void
  toggleSkill: (id: string, enabled: boolean) => void
  removeSkill: (id: string) => void

  // Project Selection
  selectedProjectIds: string[]
  selectProjects: (ids: string[]) => void

  // Review State
  isReviewing: boolean
  reviewProgress: ReviewProgress | null
  mrReviewRecords: MRReviewRecord[]
  reviewError: string | null

  startBatchReview: (projectIds: string[]) => Promise<void>
  updateReviewProgress: (progress: ReviewProgress) => void

  // Results
  loadMRReviewRecords: (projectId?: string) => void
  deleteMRReviewRecord: (id: string) => void
  clearAllReviewData: () => void

  // ─── NEW: Agent state ───
  agentStatus: 'idle' | 'running' | 'paused'
  agentTaskId: string | null
  agentLiveIssues: ReviewIssue[]
  agentCurrentPhase: string
  agentProgress: number
  agentCurrentFile: string
  agentFoundCount: number
  reviewTasks: ReviewTask[]

  // ─── NEW: Agent actions ───
  startAgentReview: (projectId: string, mrIds: string[]) => Promise<void>
  controlAgent: (action: 'pause' | 'resume' | 'skip' | 'cancel') => void
  toggleAgentRule: (ruleId: string, enabled: boolean) => void
  loadReviewTasks: () => void
  resetAgentState: () => void
}

export const useCodeReviewStore = create<CodeReviewStore>((set, get) => ({
  llmConfigs: [],
  mcps: [],
  skills: [],
  selectedProjectIds: [],
  isReviewing: false,
  reviewProgress: null,
  mrReviewRecords: [{
    id: 'mock-1',
    projectId: 'mock-project',
    projectName: '示例项目',
    mrId: 'mock-mr-1',
    mrTitle: '示例 MR: 修复登录页面样式',
    mrUrl: 'https://example.com/mr/1',
    status: 'completed' as const,
    diff: 'diff --git a/src/login.ts b/src/login.ts\n--- a/src/login.ts\n+++ b/src/login.ts\n@@ -1,3 +1,3 @@\n-old line\n+new line',
    issues: [],
    reviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }],
  reviewError: null,

  // LLM Config
  loadLLMConfigs: () => {
    const rows = getAllLLMConfigs()
    set({ llmConfigs: rows })
  },

  addLLMConfig: (cfg) => {
    const newCfg: LLMConfig = {
      ...cfg,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    insertLLMConfig(newCfg)
    set(state => ({ llmConfigs: [newCfg, ...state.llmConfigs] }))
  },

  updateLLMConfig: (id, updates) => {
    updateLLMConfig(id, updates)
    set(state => ({
      llmConfigs: state.llmConfigs.map(c => c.id === id ? { ...c, ...updates } : c),
    }))
  },

  toggleLLMConfig: (id, enabled) => {
    updateLLMConfig(id, { enabled })
    set(state => ({
      llmConfigs: state.llmConfigs.map(c => c.id === id ? { ...c, enabled } : c),
    }))
  },

  removeLLMConfig: (id) => {
    deleteLLMConfig(id)
    set(state => ({ llmConfigs: state.llmConfigs.filter(c => c.id !== id) }))
  },

  testLLMConfig: async (url: string, apiKey: string, modelName?: string, apiType?: 'openai' | 'anthropic'): Promise<{ success: boolean; message: string }> => {
    try {
      const isOpenAI = apiType === 'openai'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isOpenAI
            ? { 'Authorization': `Bearer ${apiKey}` }
            : { 'x-api-key': apiKey }
          ),
        },
        body: JSON.stringify({
          model: modelName || (isOpenAI ? 'gpt-4' : 'claude-3-5-sonnet'),
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })
      if (response.ok) {
        return { success: true, message: '连接成功' }
      } else {
        const err = await response.json().catch(() => ({}))
        return { success: false, message: err.error?.message || `HTTP ${response.status}` }
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : '连接失败' }
    }
  },

  // MCP
  loadMCPs: () => {
    const rows = getAllMCPServices()
    set({ mcps: rows })
  },

  addMCP: (mcp) => {
    const newSvc: MCPService = {
      ...mcp,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    insertMCPService(newSvc)
    set(state => ({ mcps: [newSvc, ...state.mcps] }))
  },

  toggleMCP: (id, enabled) => {
    updateMCPService(id, { enabled })
    set(state => ({
      mcps: state.mcps.map(s => s.id === id ? { ...s, enabled } : s),
    }))
  },

  removeMCP: (id) => {
    deleteMCPService(id)
    set(state => ({ mcps: state.mcps.filter(s => s.id !== id) }))
  },

  // Skills
  loadSkills: () => {
    const rows = getAllSkills()
    set({ skills: rows })
  },

  addSkill: (skill) => {
    const newSkill: Skill = {
      ...skill,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    insertSkill(newSkill)
    set(state => ({ skills: [newSkill, ...state.skills] }))
  },

  toggleSkill: (id, enabled) => {
    updateSkill(id, { enabled })
    set(state => ({
      skills: state.skills.map(s => s.id === id ? { ...s, enabled } : s),
    }))
  },

  removeSkill: (id) => {
    deleteSkill(id)
    set(state => ({ skills: state.skills.filter(s => s.id !== id) }))
  },

  // Project Selection
  selectProjects: (ids) => set({ selectedProjectIds: ids }),

  // Review Progress
  updateReviewProgress: (progress) => set({ reviewProgress: progress }),

  // MR Review Records
  loadMRReviewRecords: (projectId) => {
    const records = projectId ? getMRReviewRecordsByProject(projectId) : getAllMRReviewRecords()
    set({ mrReviewRecords: records })
  },

  deleteMRReviewRecord: (id) => {
    deleteMRReviewRecord(id)
    set(state => ({
      mrReviewRecords: state.mrReviewRecords.filter(r => r.id !== id),
    }))
  },

  clearAllReviewData: () => {
    deleteAllMRReviewRecords()
    set({ mrReviewRecords: [], reviewProgress: null })
  },

  startBatchReview: async (projectIds) => {
    const { mcps, skills, llmConfigs } = get()
    const enabledMCPs = mcps.filter(m => m.enabled)
    const enabledSkills = skills.filter(s => s.enabled)

    if (enabledMCPs.length === 0) {
      set({ isReviewing: false, reviewError: '请配置并启用 MCP 服务' })
      return
    }

    if (!window.mcpAPI) {
      set({ isReviewing: false, reviewError: 'MCP API 不可用，请在 Electron 环境中运行' })
      return
    }

    const enabledLLMs = llmConfigs.filter(c => c.enabled)
    if (enabledLLMs.length === 0) {
      set({ isReviewing: false, reviewError: '请配置并启用 LLM' })
      return
    }

    set({ isReviewing: true, mrReviewRecords: [], reviewProgress: null, reviewError: null })

    const llmConfig = enabledLLMs[0]
    const mcpConfig = enabledMCPs[0]
    const skillContent = enabledSkills.map(s => s.content).join('\n\n')
    const systemPrompt = `You are an expert code reviewer specializing in MR code review.${skillContent ? '\n\n' + skillContent : ''}`

    const projects = useProjectStore.getState().projects

    for (const projectId of projectIds) {
      const project = projects.find(p => p.id === projectId)
      if (!project || project.repositories.length === 0) continue

      for (const repo of project.repositories) {
        if (!repo.url) continue

        // 1. Get MR list via MCP for each repo
        set({
          reviewProgress: {
            projectId,
            projectName: repo.note ? `${project.name} (${repo.note})` : project.name,
            mrTitle: '获取 MR 列表...',
            progress: 0,
            completed: 0,
            total: 0
          }
        })

        let mrs: Array<{ id: string; title: string; url: string; state: string }> = []
        try {
          const mrListResult = await window.mcpAPI?.invokeTool({
            url: mcpConfig.url,
            authHeader: mcpConfig.authHeader,
            toolName: 'listMRs',
            toolArgs: { repository: repo.url, branch: repo.branch }
          })
          mrs = (mrListResult as { mrs?: Array<{ id: string; title: string; url: string; state: string }> })?.mrs || []
        } catch (err) {
          console.error('[Review] Failed to get MR list for', project.name, repo.url, err)
          continue
        }

      set(state => ({
        reviewProgress: { ...state.reviewProgress!, total: mrs.length }
      }))

      // 2. Review each MR
      for (let i = 0; i < mrs.length; i++) {
        const mr = mrs[i]
        set(state => ({
          reviewProgress: {
            ...state.reviewProgress!,
            mrTitle: mr.title,
            progress: (i / mrs.length) * 100,
            completed: i
          }
        }))

        // Get MR details
        let diff = ''
        try {
          const detailResult = await window.mcpAPI?.invokeTool({
            url: mcpConfig.url,
            authHeader: mcpConfig.authHeader,
            toolName: 'getMRDetails',
            toolArgs: { mrId: mr.id, repository: repo.url }
          })
          diff = (detailResult as { diff?: string })?.diff || ''
        } catch (err) {
          console.error('[Review] Failed to get MR details', mr.id, err)
        }

        // 3. Send to LLM for analysis
        let issues: MRReviewRecord['issues'] = []
        try {
          const isOpenAI = llmConfig.apiType === 'openai'
          const response = await fetch(llmConfig.modelUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(isOpenAI
                ? { 'Authorization': `Bearer ${llmConfig.apiKey}` }
                : { 'x-api-key': llmConfig.apiKey }
              ),
            },
            body: JSON.stringify(isOpenAI
              ? {
                  model: llmConfig.modelName || 'gpt-4',
                  max_tokens: 4096,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    {
                      role: 'user',
                      content: [
                        '请分析以下 MR 的代码变更，识别问题。',
                        '',
                        `MR: ${mr.title}`,
                        `URL: ${mr.url}`,
                        '',
                        'Diff:',
                        diff,
                        '',
                        '请严格按以下 JSON 数组格式返回（不要 Markdown 代码块包裹）：',
                        '[{',
                        '  "severity": "critical" | "warning" | "suggestion",',
                        '  "title": "一句话标题",',
                        '  "description": "详细说明",',
                        '  "filePath": "相对路径，例如 utils/cache.ts",',
                        '  "codeSnippet": "diff 中引发问题的那一两行代码原文（不要带 +/- 前缀）"',
                        '}]',
                        '',
                        '如果某个问题是整体性的、不针对具体代码行，codeSnippet 返回空字符串。',
                      ].join('\n')
                    }
                  ]
                }
              : {
                  model: llmConfig.modelName || 'claude-3-5-sonnet',
                  max_tokens: 4096,
                  stream: false,
                  system: systemPrompt,
                  messages: [{
                    role: 'user',
                    content: [
                      '请分析以下 MR 的代码变更，识别问题。',
                      '',
                      `MR: ${mr.title}`,
                      `URL: ${mr.url}`,
                      '',
                      'Diff:',
                      diff,
                      '',
                      '请严格按以下 JSON 数组格式返回（不要 Markdown 代码块包裹）：',
                      '[{',
                      '  "severity": "critical" | "warning" | "suggestion",',
                      '  "title": "一句话标题",',
                      '  "description": "详细说明",',
                      '  "filePath": "相对路径，例如 utils/cache.ts",',
                      '  "codeSnippet": "diff 中引发问题的那一两行代码原文（不要带 +/- 前缀）"',
                      '}]',
                      '',
                      '如果某个问题是整体性的、不针对具体代码行，codeSnippet 返回空字符串。',
                    ].join('\n')
                  }]
                }
            )
          })

          const data = await response.json()
          const text = isOpenAI
            ? (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ?? ''
            : (data as { content?: Array<{ text?: string }> })?.content?.[0]?.text ?? ''
          issues = buildResolvedIssues(text, diff)
        } catch (err) {
          console.error('[Review] LLM analysis failed for', mr.title, err)
        }

        // 4. Save record
        const record: MRReviewRecord = {
          id: crypto.randomUUID(),
          projectId,
          projectName: project.name,
          mrId: mr.id,
          mrTitle: mr.title,
          mrUrl: mr.url,
          status: issues.length > 0 ? 'completed' : 'failed',
          diff,
          issues,
          reviewedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
        insertMRReviewRecord(record)

        set(state => ({
          mrReviewRecords: [...state.mrReviewRecords, record],
          reviewProgress: {
            ...state.reviewProgress!,
            completed: i + 1,
            progress: ((i + 1) / mrs.length) * 100
          }
        }))
      }
      }
    }

    set({ isReviewing: false })
  },

  // ─── NEW: Agent initial state ───
  agentStatus: 'idle',
  agentTaskId: null,
  agentLiveIssues: [],
  agentCurrentPhase: '',
  agentProgress: 0,
  agentCurrentFile: '',
  agentFoundCount: 0,
  reviewTasks: [],

  // ─── NEW: Agent actions ───
  startAgentReview: async (projectId, mrIds) => {
    const worker = getAgentWorker()
    if (!worker) { set({ reviewError: 'Agent Worker 未初始化' }); return }

    const taskId = crypto.randomUUID()
    set({ agentStatus: 'running', agentTaskId: taskId, agentLiveIssues: [], agentCurrentPhase: 'preparing', agentProgress: 0, agentFoundCount: 0, reviewError: null })

    const unsub = subscribeToWorker((msg) => {
      const state = get()
      if (msg.type === 'agent:progress') {
        if (msg.taskId === taskId) {
          set({ agentCurrentPhase: msg.phase, agentProgress: msg.percent, agentCurrentFile: msg.currentFile, agentFoundCount: msg.foundCount })
        }
      } else if (msg.type === 'agent:issue-found') {
        if (msg.taskId === taskId) {
          set(s => ({ agentLiveIssues: [...s.agentLiveIssues, msg.issue] }))
        }
      } else if (msg.type === 'agent:phase-change') {
        if (msg.taskId === taskId) set({ agentCurrentPhase: msg.toPhase })
      } else if (msg.type === 'agent:completed') {
        if (msg.taskId === taskId) {
          set({ agentStatus: 'idle', agentTaskId: null, agentProgress: 1 })
          state.loadMRReviewRecords()
          state.loadReviewTasks()
        }
      } else if (msg.type === 'agent:error') {
        if (msg.taskId === taskId) {
          set({ agentStatus: 'idle', agentTaskId: null, reviewError: msg.error })
        }
      }
    })

    sendToWorker({ type: 'agent:start', taskId, projectId, mrIds })
    void unsub
  },

  controlAgent: (action) => {
    const { agentTaskId } = get()
    if (!agentTaskId) return
    sendToWorker({ type: 'agent:control', action })
    if (action === 'pause') set({ agentStatus: 'paused' })
    else if (action === 'resume') set({ agentStatus: 'running' })
    else if (action === 'cancel') set({ agentStatus: 'idle', agentTaskId: null })
  },

  toggleAgentRule: (ruleId, enabled) => {
    sendToWorker({ type: 'agent:rule-toggle', ruleId, enabled })
  },

  loadReviewTasks: () => {
    const tasks = getAllReviewTasks()
    set({ reviewTasks: tasks })
  },

  resetAgentState: () => {
    set({
      agentStatus: 'idle', agentTaskId: null, agentLiveIssues: [],
      agentCurrentPhase: '', agentProgress: 0, agentCurrentFile: '', agentFoundCount: 0,
    })
  },

}))

interface RawAIResponse {
  severity?: string
  title?: string
  description?: string
  filePath?: string
  codeSnippet?: string
}

/**
 * Find the first balanced `[ ... ]` substring in `text`, starting at the first `[`.
 * Correctly handles nested arrays/objects in JSON values and trailing prose
 * containing stray `[` / `]` characters. Returns null if no balanced pair exists.
 */
function extractFirstJsonArray(text: string): string | null {
  const start = text.indexOf('[')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '[') {
      depth++
    } else if (ch === ']') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function parseIssuesFromResponse(text: string): AIResponseIssue[] {
  // Walk forward through every balanced [...] in the text and try to JSON.parse
  // each one. The first one that parses successfully wins; this handles the
  // common case of leading prose like "see [README] for context" before the
  // real JSON payload.
  let cursor = 0
  while (cursor < text.length) {
    const jsonText = extractFirstJsonArray(text.slice(cursor))
    if (!jsonText) return []
    const offset = text.indexOf('[', cursor)
    try {
      const raw = JSON.parse(jsonText)
      if (Array.isArray(raw)) {
        return raw
          .filter((item): item is RawAIResponse => typeof item === 'object' && item !== null)
          .map(item => ({
            // Most AI issues that omit severity are still actionable concerns worth surfacing,
            // so default to "warning" rather than the lowest-priority "suggestion".
            severity: (VALID_SEVERITIES as readonly string[]).includes(item.severity ?? '')
              ? (item.severity as IssueSeverity)
              : 'warning',
            title: String(item.title ?? ''),
            description: String(item.description ?? ''),
            filePath: String(item.filePath ?? ''),
            codeSnippet: String(item.codeSnippet ?? ''),
          }))
          .filter(i => i.title.length > 0)
      }
      // Parsed but not an array — keep scanning.
    } catch (err) {
      console.error('[Review] JSON parse failed at offset', offset, err)
    }
    cursor = offset + jsonText.length
  }
  return []
}

function buildResolvedIssues(text: string, diff: string): ReviewIssue[] {
  const rawIssues = parseIssuesFromResponse(text)
  const parsed = parseDiff(diff)
  return resolveIssues(rawIssues, parsed)
}
