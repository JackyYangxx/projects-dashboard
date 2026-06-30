import { describe, it, expect } from 'vitest'
import {
  STATUS_MAP,
  STATUS_LABELS,
  VALID_STATUSES,
  IMPORT_REQUIRED_HEADERS,
  IMPORT_OPTIONAL_HEADERS,
} from './project'

describe('project constants', () => {
  describe('STATUS_MAP', () => {
    it('maps all Chinese labels to status keys', () => {
      expect(STATUS_MAP['进行中']).toBe('ongoing')
      expect(STATUS_MAP['已完成']).toBe('completed')
      expect(STATUS_MAP['暂停中']).toBe('paused')
    })

    it('has exactly 3 entries', () => {
      expect(Object.keys(STATUS_MAP)).toHaveLength(3)
    })
  })

  describe('STATUS_LABELS', () => {
    it('maps all status keys to Chinese labels', () => {
      expect(STATUS_LABELS.ongoing).toBe('进行中')
      expect(STATUS_LABELS.completed).toBe('已完成')
      expect(STATUS_LABELS.paused).toBe('暂停中')
    })

    it('is the inverse of STATUS_MAP', () => {
      for (const [label, key] of Object.entries(STATUS_MAP)) {
        expect(STATUS_LABELS[key]).toBe(label)
      }
    })
  })

  describe('VALID_STATUSES', () => {
    it('contains the three valid status keys', () => {
      expect(VALID_STATUSES).toContain('ongoing')
      expect(VALID_STATUSES).toContain('completed')
      expect(VALID_STATUSES).toContain('paused')
      expect(VALID_STATUSES).toHaveLength(3)
    })
  })

  describe('IMPORT_REQUIRED_HEADERS', () => {
    it('contains the five required fields', () => {
      expect(IMPORT_REQUIRED_HEADERS).toContain('项目名称')
      expect(IMPORT_REQUIRED_HEADERS).toContain('产品线')
      expect(IMPORT_REQUIRED_HEADERS).toContain('负责人')
      expect(IMPORT_REQUIRED_HEADERS).toContain('总预算')
      expect(IMPORT_REQUIRED_HEADERS).toContain('已用预算')
      expect(IMPORT_REQUIRED_HEADERS).toHaveLength(5)
    })
  })

  describe('IMPORT_OPTIONAL_HEADERS', () => {
    it('contains code repository and branch', () => {
      expect(IMPORT_OPTIONAL_HEADERS.some(h => h.startsWith('代码仓'))).toBe(true)
      expect(IMPORT_OPTIONAL_HEADERS.some(h => h.startsWith('分支'))).toBe(true)
    })
  })
})
