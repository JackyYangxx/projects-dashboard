import { create } from 'zustand'
import type { MCPService, Skill, CodeReview, LLMConfig, MRReviewRecord } from '@/types'
import {
  getAllMCPServices, insertMCPService, updateMCPService, deleteMCPService,
  getAllSkills, insertSkill, updateSkill, deleteSkill,
  getCodeReviewsByProject, insertCodeReview, deleteCodeReview,
  getAllLLMConfigs, insertLLMConfig, updateLLMConfig, deleteLLMConfig,
  insertMRReviewRecord, getAllMRReviewRecords, getMRReviewRecordsByProject,
  deleteMRReviewRecord, deleteAllMRReviewRecords,
} from '@/db/codeReviewDao'
import { useProjectStore } from './projectStore'

export type ReviewStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'tool_call'; toolName: string; toolArgs: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; toolResult: unknown }
  | { type: 'done' }
  | { type: 'error'; error: string }

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
  testLLMConfig: (url: string, apiKey: string, modelName?: string) => Promise<{ success: boolean; message: string }>

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
  currentProjectId: string | null
  streamEvents: ReviewStreamEvent[]

  startBatchReview: (projectIds: string[]) => Promise<void>
  startReview: (projectId: string, repository: string, branch: string) => Promise<void>
  appendStreamEvent: (event: ReviewStreamEvent) => void
  clearStream: () => void
  updateReviewProgress: (progress: ReviewProgress) => void

  // Results
  loadMRReviewRecords: (projectId?: string) => void
  deleteMRReviewRecord: (id: string) => void
  clearAllReviewData: () => void

  // Legacy Code Review Records
  reviewRecords: CodeReview[]
  loadReviewRecords: (projectId: string) => void
  deleteReviewRecord: (id: string) => void
}

export const useCodeReviewStore = create<CodeReviewStore>((set, get) => ({
  llmConfigs: [],
  mcps: [],
  skills: [],
  selectedProjectIds: [],
  isReviewing: false,
  reviewProgress: null,
  mrReviewRecords: [],
  reviewError: null,
  currentProjectId: null,
  streamEvents: [],
  reviewRecords: [],

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

  testLLMConfig: async (url: string, apiKey: string, modelName?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName || 'claude',
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

  appendStreamEvent: (event) => {
    set(state => ({ streamEvents: [...state.streamEvents, event] }))
  },

  clearStream: () => {
    set({ streamEvents: [], reviewError: null })
  },

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
      if (!project || !project.repository) continue

      // 1. Get MR list via MCP
      set({
        reviewProgress: {
          projectId,
          projectName: project.name,
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
          toolArgs: { repository: project.repository, branch: project.branch }
        })
        mrs = (mrListResult as { mrs?: Array<{ id: string; title: string; url: string; state: string }> })?.mrs || []
      } catch (err) {
        console.error('[Review] Failed to get MR list for', project.name, err)
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
            toolArgs: { mrId: mr.id, repository: project.repository }
          })
          diff = (detailResult as { diff?: string })?.diff || ''
        } catch (err) {
          console.error('[Review] Failed to get MR details', mr.id, err)
        }

        // 3. Send to LLM for analysis
        let issues: MRReviewRecord['issues'] = []
        try {
          const response = await fetch(llmConfig.modelUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${llmConfig.apiKey}`
            },
            body: JSON.stringify({
              model: llmConfig.modelName || 'claude',
              max_tokens: 4096,
              stream: false,
              system: systemPrompt,
              messages: [{
                role: 'user',
                content: `请分析以下 MR 的代码变更，识别问题：\n\nMR: ${mr.title}\nURL: ${mr.url}\n\nDiff:\n${diff}`
              }]
            })
          })

          const data = await response.json()
          issues = parseIssuesFromResponse(data)
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

    set({ isReviewing: false })
  },

  startReview: async (projectId, repository, branch) => {
    set({ isReviewing: true, reviewError: null, currentProjectId: projectId, streamEvents: [] })

    const { llmConfigs, mcps, skills } = get()
    const enabledLLMConfigs = llmConfigs.filter(c => c.enabled)
    const enabledMCPServices = mcps.filter(s => s.enabled)
    const enabledSkills = skills.filter(s => s.enabled)

    if (enabledLLMConfigs.length === 0) {
      set({ reviewError: '请配置并启用 LLM', isReviewing: false })
      return
    }

    const llmConfig = enabledLLMConfigs[0]
    const skillContent = enabledSkills.map(s => s.content).join('\n\n')
    const systemPrompt = `You are an expert code reviewer.${skillContent ? '\n\n' + skillContent : ''}`

    const allToolDefs: Record<string, unknown>[] = []
    const mcpConnections: { url: string; authHeader?: string }[] = []

    for (const svc of enabledMCPServices) {
      try {
        if (!window.mcpAPI) {
          console.error('[MCP] mcpAPI not available')
          continue
        }
        const result = await window.mcpAPI.listTools({ url: svc.url, authHeader: svc.authHeader })
        const tools = (result as { result?: { tools?: unknown[] } })?.result?.tools || []
        allToolDefs.push(...(tools as Record<string, unknown>[]))
        mcpConnections.push({ url: svc.url, authHeader: svc.authHeader })
      } catch (err) {
        console.error('[MCP] listTools failed for', svc.name, err)
      }
    }

    try {
      const response = await fetch(llmConfig.modelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.modelName || 'claude',
          max_tokens: 4096,
          stream: true,
          system: systemPrompt,
          tools: allToolDefs.length > 0 ? allToolDefs : undefined,
          messages: [{
            role: 'user',
            content: `请对仓库 ${repository}（分支 ${branch}）进行代码评审。\n重点关注：可维护性、性能、安全隐患、逻辑错误。\n评审完成后，请输出如下格式的 JSON：\n\`\`\`json\n[{ "severity": "critical|warning|suggestion", "title": "...", "description": "...", "filePath": "...", "lineRange": "..." }]\n\`\`\``,
          }],
        }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (delta?.content) {
              fullContent += delta.content
              get().appendStreamEvent({ type: 'chunk', content: delta.content })
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                get().appendStreamEvent({ type: 'tool_call', toolName: tc.name, toolArgs: tc.arguments })
                const conn = mcpConnections[0]
                if (conn && window.mcpAPI) {
                  try {
                    const result = await window.mcpAPI.invokeTool({
                      url: conn.url,
                      authHeader: conn.authHeader,
                      toolName: tc.name,
                      toolArgs: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments,
                    })
                    get().appendStreamEvent({ type: 'tool_result', toolName: tc.name, toolResult: result })
                  } catch (err) {
                    get().appendStreamEvent({ type: 'tool_result', toolName: tc.name, toolResult: { error: String(err) } })
                  }
                }
              }
            }
          } catch (err) {
            console.error('[SSE] parse error', err)
          }
        }
      }

      get().appendStreamEvent({ type: 'done' })

      const jsonMatch = fullContent.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        try {
          const records = JSON.parse(jsonMatch[1])
          for (const r of records) {
            const record: CodeReview = {
              id: crypto.randomUUID(),
              projectId,
              repository,
              branch,
              severity: r.severity || 'suggestion',
              title: r.title || '',
              description: r.description || '',
              filePath: r.filePath || '',
              lineRange: r.lineRange || '',
              aiTrace: fullContent,
              createdAt: new Date().toISOString(),
            }
            insertCodeReview(record)
          }
          get().loadReviewRecords(projectId)
        } catch (err) {
          console.error('[CodeReview] JSON parse failed', err)
        }
      }
    } catch (err) {
      set({ reviewError: err instanceof Error ? err.message : '评审请求失败' })
    } finally {
      set({ isReviewing: false })
    }
  },

  loadReviewRecords: (projectId) => {
    const records = getCodeReviewsByProject(projectId)
    set({ reviewRecords: records })
  },

  deleteReviewRecord: (id) => {
    deleteCodeReview(id)
    const { currentProjectId } = get()
    if (currentProjectId) {
      set(state => ({
        reviewRecords: state.reviewRecords.filter(r => r.id !== id),
      }))
    }
  },
}))

// Helper function to parse issues from LLM response
function parseIssuesFromResponse(data: unknown): MRReviewRecord['issues'] {
  try {
    const content = (data as { content?: Array<{ text?: string }> })?.content
    if (!content || !Array.isArray(content)) return []

    const text = content[0]?.text || ''
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      if (Array.isArray(parsed)) {
        return parsed.map((r: {
          severity?: string
          title?: string
          description?: string
          filePath?: string
          lineRange?: string
        }) => ({
          severity: (r.severity as 'critical' | 'warning' | 'suggestion') || 'suggestion',
          title: r.title || '',
          description: r.description || '',
          filePath: r.filePath,
          lineRange: r.lineRange,
        }))
      }
    }
  } catch (err) {
    console.error('[parseIssuesFromResponse]', err)
  }
  return []
}
