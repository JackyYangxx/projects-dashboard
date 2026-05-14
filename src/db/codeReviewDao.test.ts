import { beforeAll, describe, expect, it } from 'vitest'
import { initDatabase } from './index'
import {
  insertMCPService, getAllMCPServices, updateMCPService, deleteMCPService,
  insertSkill, getAllSkills, updateSkill, deleteSkill,
  insertCodeReview, getCodeReviewsByProject, deleteCodeReview,
} from './codeReviewDao'

beforeAll(async () => {
  await initDatabase()
})

describe('codeReviewDao', () => {
  describe('mcp_services', () => {
    it('should insert and retrieve mcp service', () => {
      const svc = {
        id: 'test-mcp-1',
        name: 'Test MCP',
        url: 'https://mcp.example.com',
        authHeader: 'Bearer token',
        enabled: true,
        createdAt: new Date().toISOString(),
      }
      insertMCPService(svc)
      const rows = getAllMCPServices()
      expect(rows.find(r => r.id === 'test-mcp-1')?.name).toBe('Test MCP')
    })

    it('should toggle enabled state', () => {
      updateMCPService('test-mcp-1', { enabled: false })
      const row = getAllMCPServices().find(r => r.id === 'test-mcp-1')
      expect(row?.enabled).toBe(false)
    })

    it('should delete mcp service', () => {
      deleteMCPService('test-mcp-1')
      const row = getAllMCPServices().find(r => r.id === 'test-mcp-1')
      expect(row).toBeUndefined()
    })
  })

  describe('skills', () => {
    it('should insert and retrieve skill', () => {
      const skill = {
        id: 'test-skill-1',
        name: 'Code Review Skill',
        description: 'A skill for code review',
        content: '# Code Review Skill\n\nYou are a code reviewer.',
        enabled: true,
        createdAt: new Date().toISOString(),
      }
      insertSkill(skill)
      const rows = getAllSkills()
      expect(rows.find(r => r.id === 'test-skill-1')?.name).toBe('Code Review Skill')
    })

    it('should delete skill', () => {
      deleteSkill('test-skill-1')
      const row = getAllSkills().find(r => r.id === 'test-skill-1')
      expect(row).toBeUndefined()
    })
  })

  describe('code_reviews', () => {
    it('should insert and query code review records', () => {
      const record = {
        id: 'test-cr-1',
        projectId: 'proj-1',
        repository: 'https://github.com/example/repo',
        branch: 'main',
        severity: 'critical' as const,
        title: 'Memory leak detected',
        description: 'Buffer not freed',
        filePath: 'src/utils/memory.ts',
        lineRange: '12-15',
        aiTrace: 'Tool call: get_diff → result: ...',
        createdAt: new Date().toISOString(),
      }
      insertCodeReview(record)
      const rows = getCodeReviewsByProject('proj-1')
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0].severity).toBe('critical')
    })

    it('should delete code review record', () => {
      deleteCodeReview('test-cr-1')
      const rows = getCodeReviewsByProject('proj-1')
      expect(rows.find(r => r.id === 'test-cr-1')).toBeUndefined()
    })
  })
})