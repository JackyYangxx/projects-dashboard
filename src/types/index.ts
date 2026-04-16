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

export interface TimelineEvent {
  date: string
  version: string
  title: string
  items: string[]
  isActive: boolean
  isCompleted: boolean
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
  team: TeamMember[]
  scope: ScopeItem[]
  timeline: TimelineEvent[]
  createdAt: string
  updatedAt: string
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
    }
  }
}
