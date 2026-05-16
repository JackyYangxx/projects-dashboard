export interface SubProgress {
  architecture: number
  uiux: number
  engineering: number
  qa: number
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
}

export interface ScopeItem {
  icon: string
  title: string
  description: string
  color: 'primary' | 'secondary' | 'tertiary' | 'outline'
}

export interface NoteHistory {
  id: string
  content: string
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  date: string
  status: 'pending' | 'completed' | 'delayed'
  description?: string
}

export interface TimelineEvent {
  date: string
  version: string
  title: string
  items: string[]
  isActive: boolean
  isCompleted: boolean
}

export interface BudgetSource {
  id: string
  projectId: string
  label: string
  amount: number
  usedAmount: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  productLine: string
  status: 'ongoing' | 'completed' | 'paused'
  tag: string
  totalAmount: number
  usedAmount: number
  progress: number
  subProgress: SubProgress
  notes: string
  noteHistory: NoteHistory[]
  team: TeamMember[]
  scope: ScopeItem[]
  milestones: Milestone[]
  timeline: TimelineEvent[]
  leader: string
  repository: string
  branch: string
  createdAt: string
  updatedAt: string
}

export interface CodeReview {
  id: string
  projectId: string
  repository: string
  branch: string
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath?: string
  lineRange?: string
  aiTrace: string
  createdAt: string
}

export interface MCPService {
  id: string
  name: string
  url: string
  authHeader?: string
  tools: string[]
  enabled: boolean
  createdAt: string
}

export interface Skill {
  id: string
  name: string
  description?: string
  content: string
  enabled: boolean
  createdAt: string
}

export interface LLMConfig {
  id: string
  modelName: string
  modelUrl: string
  apiKey: string
  enabled: boolean
  createdAt: string
}

export interface MRReviewRecord {
  id: string
  projectId: string
  projectName: string
  mrId: string
  mrTitle: string
  mrUrl: string
  status: 'pending' | 'reviewing' | 'completed' | 'failed'
  issues: Array<{
    severity: 'critical' | 'warning' | 'suggestion'
    title: string
    description: string
    filePath?: string
    lineRange?: string
  }>
  reviewedAt: string
  createdAt: string
}

export interface ReviewReport {
  id: string
  name: string
  projectIds: string
  totalMrCount: number
  totalIssueCount: number
  issuesPreview: string
  createdAt: string
}

export interface MCPConfig {
  name: string
  endpoint: string
  authHeader?: string
  tools: string[]
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      getAppVersion?: () => Promise<string>
      getPlatform?: () => Promise<string>
      getWasmBinary?: () => Promise<Uint8Array>
    }
    mcpAPI?: {
      listTools: (params: { url: string; authHeader?: string }) => Promise<unknown>
      invokeTool: (params: { url: string; authHeader?: string; toolName: string; toolArgs: Record<string, unknown> }) => Promise<unknown>
    }
    secureStore?: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
      delete: (key: string) => Promise<void>
    }
  }
}
