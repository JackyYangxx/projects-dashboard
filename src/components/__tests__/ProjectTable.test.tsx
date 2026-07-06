import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectTable from '../ProjectTable'
import type { Project } from '../../types'

const mockProjects: Project[] = [
  {
    id: '1',
    projectId: 'PRJ-001',
    name: '战略品牌重塑',
    productLine: '营销云',
    status: 'ongoing',
    tags: ['项目 A', '三月'],
    totalAmount: 100000,
    usedAmount: 75000,
    progress: 75,
    subProgress: { architecture: 80, uiux: 70, engineering: 60, qa: 50 },
    notes: '',
    noteHistory: [],
    team: [{ id: 't1', name: '张明', role: '负责人', avatar: '' }],
    scope: [],
    milestones: [],
    timeline: [],
    leader: '张明',
    repositories: [],
    ext1: '', ext2: '', ext3: '', ext4: '', ext5: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    projectId: '',
    name: '次世代界面设计',
    productLine: 'UI 系统',
    status: 'completed',
    tags: [],
    totalAmount: 200000,
    usedAmount: 84000,
    progress: 42,
    subProgress: { architecture: 50, uiux: 60, engineering: 30, qa: 20 },
    notes: '',
    noteHistory: [],
    team: [{ id: 't2', name: '王芳', role: '负责人', avatar: '' }],
    scope: [],
    milestones: [],
    timeline: [],
    leader: '王芳',
    repositories: [],
    ext1: '', ext2: '', ext3: '', ext4: '', ext5: '',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: '3',
    projectId: 'PRJ-003',
    name: '全球扩张路线图',
    productLine: '运营策略',
    status: 'paused',
    tags: ['项目 C', '七月'],
    totalAmount: 500000,
    usedAmount: 50000,
    progress: 10,
    subProgress: { architecture: 10, uiux: 20, engineering: 5, qa: 0 },
    notes: '',
    noteHistory: [],
    team: [],
    scope: [],
    milestones: [],
    timeline: [],
    leader: '',
    repositories: [],
    ext1: '', ext2: '', ext3: '', ext4: '', ext5: '',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
]

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()
const origIntersectionObserver = globalThis.IntersectionObserver

beforeEach(() => {
  class MockIntersectionObserver {
    readonly root: Element | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []

    constructor(public callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
      this.callback = callback
    }

    observe = mockObserve
    disconnect = mockDisconnect
    unobserve = vi.fn()
    takeRecords = (): IntersectionObserverEntry[] => []
  }
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

afterEach(() => {
  globalThis.IntersectionObserver = origIntersectionObserver
})

describe('<ProjectTable>', () => {
  it('renders all 7 column headers', () => {
    render(<ProjectTable projects={[]} />)
    expect(screen.getByText('项目')).toBeTruthy()
    expect(screen.getByText('产品线')).toBeTruthy()
    expect(screen.getByText('开发责任人')).toBeTruthy()
    expect(screen.getByText('状态')).toBeTruthy()
    expect(screen.getByText('进展')).toBeTruthy()
    expect(screen.getByText('预算执行')).toBeTruthy()
    expect(screen.getByText('操作')).toBeTruthy()
  })

  it('renders status column with dropdown', () => {
    render(<ProjectTable projects={mockProjects} />)
    expect(screen.getByText('状态')).toBeTruthy()
  })

  it('renders empty state when no projects', () => {
    render(<ProjectTable projects={[]} />)
    expect(screen.getByText('暂无项目数据')).toBeTruthy()
  })

  it('renders project names, product lines, leaders', () => {
    render(<ProjectTable projects={mockProjects} />)
    expect(screen.getByText('战略品牌重塑')).toBeTruthy()
    expect(screen.getByText('次世代界面设计')).toBeTruthy()
    expect(screen.getByText('全球扩张路线图')).toBeTruthy()
    expect(screen.getByText('营销云')).toBeTruthy()
    expect(screen.getByText('UI 系统')).toBeTruthy()
    expect(screen.getByText('运营策略')).toBeTruthy()
    expect(screen.getByText('张明')).toBeTruthy()
    expect(screen.getByText('王芳')).toBeTruthy()
    expect(screen.getByText('未指定')).toBeTruthy()
  })

  it('renders project tags when available', () => {
    render(<ProjectTable projects={mockProjects} />)
    expect(screen.getByText('项目 A')).toBeTruthy()
    expect(screen.getByText('三月')).toBeTruthy()
    expect(screen.getByText('项目 C')).toBeTruthy()
    expect(screen.getByText('七月')).toBeTruthy()
  })

  it('has correct status dot classes: ongoing blue, completed green, paused yellow', () => {
    const { container } = render(<ProjectTable projects={mockProjects} />)
    const rows = container.querySelectorAll('tr[data-row]')
    expect(rows.length).toBe(3)

    // Row 1: ongoing → first project name cell has bg-primary-500 on status dot
    const row1Dots = rows[0].querySelectorAll('span')
    const row1Bg = Array.from(row1Dots).filter(s => s.className.includes('bg-primary-500'))
    expect(row1Bg.length).toBeGreaterThanOrEqual(1)

    // Row 2: completed → bg-success
    const row2Dots = rows[1].querySelectorAll('span')
    const row2Bg = Array.from(row2Dots).filter(s => s.className.includes('bg-success'))
    expect(row2Bg.length).toBeGreaterThanOrEqual(1)

    // Row 3: paused → bg-warning
    const row3Dots = rows[2].querySelectorAll('span')
    const row3Bg = Array.from(row3Dots).filter(s => s.className.includes('bg-warning'))
    expect(row3Bg.length).toBeGreaterThanOrEqual(1)
  })

  it('has title tooltip on truncated project name', () => {
    const { container } = render(<ProjectTable projects={mockProjects} />)
    const nameSpan = container.querySelector('span[title="战略品牌重塑"]')
    expect(nameSpan).toBeTruthy()
  })

  it('has title tooltip on product line', () => {
    const { container } = render(<ProjectTable projects={mockProjects} />)
    expect(container.querySelector('span[title="营销云"]')).toBeTruthy()
    expect(container.querySelector('span[title="UI 系统"]')).toBeTruthy()
  })

  it('calls onView when row is clicked', () => {
    const onView = vi.fn()
    render(<ProjectTable projects={mockProjects} onView={onView} />)
    const rows = screen.getAllByText('战略品牌重塑')
    rows[0].closest('tr')?.click()
    expect(onView).toHaveBeenCalledWith(mockProjects[0])
  })

  it('calls onDelete after confirmation', () => {
    const onDelete = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProjectTable projects={mockProjects} onDelete={onDelete} />)
    const deleteBtn = screen.getByLabelText('删除 战略品牌重塑')
    deleteBtn.click()
    expect(confirmSpy).toHaveBeenCalled()
    expect(onDelete).toHaveBeenCalledWith(mockProjects[0])
    confirmSpy.mockRestore()
  })

  it('does not call onDelete when confirmation is cancelled', () => {
    const onDelete = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ProjectTable projects={mockProjects} onDelete={onDelete} />)
    const deleteBtn = screen.getByLabelText('删除 战略品牌重塑')
    deleteBtn.click()
    expect(onDelete).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<ProjectTable projects={mockProjects} onEdit={onEdit} />)
    const editBtn = screen.getByLabelText('编辑 战略品牌重塑')
    editBtn.click()
    expect(onEdit).toHaveBeenCalledWith(mockProjects[0])
  })

  it('renders action buttons with correct labels', () => {
    render(<ProjectTable projects={mockProjects} />)
    expect(screen.getByLabelText('查看 战略品牌重塑')).toBeTruthy()
    expect(screen.getByLabelText('编辑 战略品牌重塑')).toBeTruthy()
    expect(screen.getByLabelText('删除 战略品牌重塑')).toBeTruthy()
  })

  it('renders progress percentages', () => {
    render(<ProjectTable projects={mockProjects} />)
    const allPct75 = screen.getAllByText('75%')
    expect(allPct75.length).toBe(2) // progress + budget
    expect(screen.getAllByText('42%').length).toBe(2)
    expect(screen.getAllByText('10%').length).toBe(2)
  })

  it('renders budget progress bars', () => {
    const { container } = render(<ProjectTable projects={mockProjects} />)
    const progressBars = container.querySelectorAll('.h-1\\.5')
    expect(progressBars.length).toBe(6) // 3 projects x 2 bars each (progress + budget)
  })

  it('uses table-fixed layout', () => {
    const { container } = render(<ProjectTable projects={mockProjects} />)
    const table = container.querySelector('table')
    expect(table?.className).toContain('table-fixed')
  })

  it('has colgroup with 7 columns', () => {
    const { container } = render(<ProjectTable projects={mockProjects} />)
    const cols = container.querySelectorAll('colgroup col')
    expect(cols.length).toBe(7)
  })

  it('shows total count when all projects loaded', () => {
    render(<ProjectTable projects={mockProjects} />)
    expect(screen.getByText('3')).toBeTruthy()
  })
})
