import { create } from 'zustand'
import type { MCPService, Skill, CodeReview } from '@/types'
import {
  getAllMCPServices, insertMCPService, updateMCPService, deleteMCPService,
  getAllSkills, insertSkill, updateSkill, deleteSkill,
  getCodeReviewsByProject, insertCodeReview, deleteCodeReview,
} from '@/db/codeReviewDao'

export type ReviewStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'tool_call'; toolName: string; toolArgs: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; toolResult: unknown }
  | { type: 'done' }
  | { type: 'error'; error: string }

interface CodeReviewStore {
  // MCP
  mcpServices: MCPService[]
  loadMCPServices: () => void
  addMCPService: (svc: Omit<MCPService, 'id' | 'createdAt'>) => void
  toggleMCPService: (id: string, enabled: boolean) => void
  removeMCPService: (id: string) => void

  // Skills
  skills: Skill[]
  loadSkills: () => void
  addSkill: (skill: Omit<Skill, 'id' | 'createdAt'>) => void
  toggleSkill: (id: string, enabled: boolean) => void
  removeSkill: (id: string) => void

  // Review state
  isReviewing: boolean
  streamEvents: ReviewStreamEvent[]
  reviewError: string | null
  currentProjectId: string | null

  startReview: (projectId: string, repository: string, branch: string, model: string, apiKey: string) => Promise<void>
  appendStreamEvent: (event: ReviewStreamEvent) => void
  clearStream: () => void

  // Results
  reviewRecords: CodeReview[]
  loadReviewRecords: (projectId: string) => void
  deleteReviewRecord: (id: string) => void
}

export const useCodeReviewStore = create<CodeReviewStore>((set, get) => ({
  mcpServices: [],
  skills: [],
  isReviewing: false,
  streamEvents: [],
  reviewError: null,
  currentProjectId: null,
  reviewRecords: [],

  loadMCPServices: () => {
    const rows = getAllMCPServices()
    set({ mcpServices: rows })
  },

  addMCPService: (svc) => {
    const newSvc: MCPService = {
      ...svc,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    insertMCPService(newSvc)
    set(state => ({ mcpServices: [newSvc, ...state.mcpServices] }))
  },

  toggleMCPService: (id, enabled) => {
    updateMCPService(id, { enabled })
    set(state => ({
      mcpServices: state.mcpServices.map(s => s.id === id ? { ...s, enabled } : s),
    }))
  },

  removeMCPService: (id) => {
    deleteMCPService(id)
    set(state => ({ mcpServices: state.mcpServices.filter(s => s.id !== id) }))
  },

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

  appendStreamEvent: (event) => {
    set(state => ({ streamEvents: [...state.streamEvents, event] }))
  },

  clearStream: () => {
    set({ streamEvents: [], reviewError: null })
  },

  startReview: async (projectId, repository, branch, model, apiKey) => {
    set({ isReviewing: true, reviewError: null, currentProjectId: projectId, streamEvents: [] })

    const { mcpServices, skills } = get()
    const enabledMCPServices = mcpServices.filter(s => s.enabled)
    const enabledSkills = skills.filter(s => s.enabled)

    if (enabledMCPServices.length === 0) {
      set({ reviewError: '请至少配置并启用一个 MCP 服务', isReviewing: false })
      return
    }

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
      const response = await fetch(model, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'claude',
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