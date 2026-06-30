import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Must mock before importing component that uses useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import Header from '../Header'

describe('<Header>', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  function renderHeader(title?: string) {
    return render(
      <MemoryRouter>
        <Header title={title} />
      </MemoryRouter>
    )
  }

  it('renders breadcrumb with default title', () => {
    renderHeader()
    expect(screen.getByText('项目管理看板')).toBeTruthy()
    expect(screen.getByText('项目看板')).toBeTruthy()
  })

  it('renders custom title in breadcrumb', () => {
    renderHeader('自定义页面')
    expect(screen.getByText('自定义页面')).toBeTruthy()
  })

  it('renders search input', () => {
    renderHeader()
    expect(screen.getByPlaceholderText('搜索项目…')).toBeTruthy()
  })

  it('renders "新增项目" button', () => {
    renderHeader()
    expect(screen.getByText('新增项目')).toBeTruthy()
  })

  it('navigates to /project/new when button clicked', async () => {
    renderHeader()
    const user = userEvent.setup()
    await user.click(screen.getByText('新增项目'))
    expect(mockNavigate).toHaveBeenCalledWith('/project/new')
  })

  it('renders ⌘K keyboard shortcut hint', () => {
    renderHeader()
    expect(screen.getByText('⌘K')).toBeTruthy()
  })
})
