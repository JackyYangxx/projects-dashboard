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

export interface Repository {
  id: string
  code?: string
  projectId?: string
  url: string
  branch: string
  note?: string
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
  projectId: string
  name: string
  productLine: string
  status: 'ongoing' | 'completed' | 'paused'
  tags: string[]
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
  repositories: Repository[]
  ext1: string
  ext2: string
  ext3: string
  ext4: string
  ext5: string
  createdAt: string
  updatedAt: string
}
