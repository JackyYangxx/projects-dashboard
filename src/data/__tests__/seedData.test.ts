import { describe, it, expect } from 'vitest'
import { seedProjects } from '@/data/seedData'

describe('seedData', () => {
  it('has 3 seed projects', () => {
    expect(seedProjects).toHaveLength(3)
  })

  it('each seed project has a projectId', () => {
    for (const project of seedProjects) {
      expect(project.projectId).toBeTruthy()
      expect(project.projectId).toMatch(/^PRJ-2026-\d{3}$/)
    }
  })

  it('seed projects have unique projectIds', () => {
    const ids = seedProjects.map(p => p.projectId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each seed project has ext1-ext5 fields (empty strings)', () => {
    for (const project of seedProjects) {
      expect(project.ext1).toBe('')
      expect(project.ext2).toBe('')
      expect(project.ext3).toBe('')
      expect(project.ext4).toBe('')
      expect(project.ext5).toBe('')
    }
  })

  it('PRJ-2026-001 is 战略品牌重塑', () => {
    const project = seedProjects.find(p => p.projectId === 'PRJ-2026-001')
    expect(project).toBeDefined()
    expect(project!.name).toBe('战略品牌重塑')
  })

  it('PRJ-2026-002 is 次世代界面设计', () => {
    const project = seedProjects.find(p => p.projectId === 'PRJ-2026-002')
    expect(project).toBeDefined()
    expect(project!.name).toBe('次世代界面设计')
  })

  it('PRJ-2026-003 is 全球扩张路线图', () => {
    const project = seedProjects.find(p => p.projectId === 'PRJ-2026-003')
    expect(project).toBeDefined()
    expect(project!.name).toBe('全球扩张路线图')
  })
})
