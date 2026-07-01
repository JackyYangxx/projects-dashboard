import { describe, it, expect } from 'vitest'
import type { Project } from '@/types'

describe('Project type with new fields', () => {
  it('creates a project with projectId and ext fields', () => {
    const project: Project = {
      id: 'test-id-1',
      projectId: 'CUSTOM-001',
      name: '测试项目',
      productLine: '测试线',
      status: 'ongoing',
      tag: 'test',
      totalAmount: 1000,
      usedAmount: 500,
      progress: 50,
      subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
      notes: '',
      noteHistory: [],
      team: [],
      scope: [],
      milestones: [],
      timeline: [],
      leader: '测试人',
      repositories: [],
      ext1: '预留1',
      ext2: '',
      ext3: '',
      ext4: '',
      ext5: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    expect(project.projectId).toBe('CUSTOM-001')
    expect(project.ext1).toBe('预留1')
    expect(project.ext2).toBe('')
  })

  it('creates a project with default empty ext fields', () => {
    const project: Project = {
      id: 'test-id-2',
      projectId: '',
      name: '空扩展字段',
      productLine: '',
      status: 'paused',
      tag: '',
      totalAmount: 0,
      usedAmount: 0,
      progress: 0,
      subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
      notes: '',
      noteHistory: [],
      team: [],
      scope: [],
      milestones: [],
      timeline: [],
      leader: '',
      repositories: [],
      ext1: '', ext2: '', ext3: '', ext4: '', ext5: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    expect(project.projectId).toBe('')
    expect(project.ext1).toBe('')
    expect(project.ext5).toBe('')
  })

  it('matches form addProject pattern (Omit<Project, id|createdAt|updatedAt>)', () => {
    const formData = {
      projectId: 'PRJ-FORM-001',
      name: '表单创建项目',
      productLine: '产品线',
      status: 'ongoing' as const,
      leader: '负责人',
      tag: '',
      totalAmount: 50000,
      usedAmount: 0,
      progress: 0,
      notes: '',
      noteHistory: [],
      team: [],
      scope: [],
      milestones: [],
      timeline: [],
      subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
      repositories: [],
      ext1: '', ext2: '', ext3: '', ext4: '', ext5: '',
    }
    // Should compile without error
    const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = formData
    expect(projectData.projectId).toBe('PRJ-FORM-001')
  })
})
