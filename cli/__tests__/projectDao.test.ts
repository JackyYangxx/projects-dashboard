import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDb } from './test-setup'

let testDb: Database.Database

vi.mock('../db', () => ({
  getDatabase: () => testDb,
  initDatabase: () => testDb,
  getDbPath: () => ':memory:',
  closeDatabase: () => {},
}))

import { findAll, findById, findByName, create, update, remove } from '../dao/projectDao'

beforeAll(() => {
  testDb = createTestDb()
})

afterAll(() => {
  testDb.close()
})

describe('findAll', () => {
  it('returns empty array when no projects exist', () => {
    const projects = findAll()
    expect(projects).toEqual([])
  })

  it('returns all projects sorted by created_at DESC', () => {
    vi.useFakeTimers()
    create({ name: 'Project A', productLine: 'Line 1', leader: 'Alice', status: 'ongoing' })
    vi.advanceTimersByTime(1000)
    create({ name: 'Project B', productLine: 'Line 2', leader: 'Bob', status: 'paused' })
    vi.useRealTimers()

    const projects = findAll()
    expect(projects).toHaveLength(2)
    expect(projects[0].name).toBe('Project B')
  })

  it('filters by status', () => {
    const projects = findAll({ status: 'ongoing' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Project A')
  })

  it('filters by productLine', () => {
    const projects = findAll({ productLine: 'Line 2' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Project B')
  })

  it('searches by name', () => {
    const projects = findAll({ search: 'A' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Project A')
  })
})

describe('findById', () => {
  it('returns project by id', () => {
    const created = create({ name: 'Test', productLine: 'Line', leader: 'Alice' })
    const found = findById(created.id)
    expect(found).not.toBeUndefined()
    expect(found!.name).toBe('Test')
  })

  it('returns undefined for non-existent id', () => {
    expect(findById('nonexistent')).toBeUndefined()
  })
})

describe('findByName', () => {
  it('returns project by exact name', () => {
    const created = create({ name: 'UniqueName', productLine: 'Line', leader: 'Alice' })
    const found = findByName('UniqueName')
    expect(found).not.toBeUndefined()
    expect(found!.id).toBe(created.id)
  })

  it('returns undefined for non-existent name', () => {
    expect(findByName('NoSuchProject')).toBeUndefined()
  })
})

describe('create', () => {
  it('creates project with required fields and defaults', () => {
    const project = create({ name: 'New', productLine: 'P1', leader: 'Jack' })
    expect(project.id).toBeTruthy()
    expect(project.status).toBe('paused')
    expect(project.progress).toBe(0)
    expect(project.totalAmount).toBe(0)
    expect(project.usedAmount).toBe(0)
    expect(project.tags).toEqual([])
    expect(project.team).toHaveLength(1)
    expect(project.team[0].name).toBe('Jack')
    expect(project.team[0].role).toBe('负责人')
  })

  it('creates project with all optional fields', () => {
    const project = create({
      name: 'Full',
      productLine: 'P2',
      leader: 'Jane',
      status: 'ongoing',
      progress: 50,
      totalAmount: 100000,
      usedAmount: 30000,
      tags: ['urgent'],
      projectId: 'PROJ-001',
      repositories: [{ url: 'https://git.example.com/repo', branch: 'main' }],
      notes: 'test notes',
    })
    expect(project.status).toBe('ongoing')
    expect(project.progress).toBe(50)
    expect(project.totalAmount).toBe(100000)
    expect(project.usedAmount).toBe(30000)
    expect(project.tags).toEqual(['urgent'])
    expect(project.projectId).toBe('PROJ-001')
    expect(project.repositories).toHaveLength(1)
    expect(project.notes).toBe('test notes')
  })
})

describe('update', () => {
  it('updates specified fields only', () => {
    const project = create({ name: 'Before', productLine: 'P', leader: 'Jack' })
    const updated = update(project.id, { name: 'After', progress: 75 })
    expect(updated.name).toBe('After')
    expect(updated.progress).toBe(75)
    expect(updated.productLine).toBe('P')
  })

  it('throws on non-existent id', () => {
    expect(() => update('nonexistent', { name: 'X' })).toThrow('项目不存在')
  })
})

describe('remove', () => {
  it('deletes project by id', () => {
    const project = create({ name: 'ToDelete', productLine: 'P', leader: 'Jack' })
    remove(project.id)
    expect(findById(project.id)).toBeUndefined()
  })

  it('throws on non-existent id', () => {
    expect(() => remove('nonexistent')).toThrow('项目不存在')
  })
})
