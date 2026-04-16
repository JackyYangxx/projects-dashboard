import React from 'react'
import type { Project } from '../types/index'

interface ProjectTableProps {
  projects: Project[]
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onView?: (project: Project) => void
}

const MONTHS = ['全部', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const STATUS_OPTIONS = ['全部', '进行中', '已完成', '暂停中']

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onEdit,
  onDelete,
  onView,
}) => {
  const [monthFilter, setMonthFilter] = React.useState('全部')
  const [statusFilter, setStatusFilter] = React.useState('全部')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [filteredProjects, setFilteredProjects] = React.useState(projects)
  const pageSize = 10

  React.useEffect(() => {
    let result = projects

    if (statusFilter !== '全部') {
      const statusMap: Record<string, Project['status']> = {
        '进行中': 'ongoing',
        '已完成': 'completed',
        '暂停中': 'paused',
      }
      const targetStatus = statusMap[statusFilter]
      if (targetStatus) {
        result = result.filter((p) => p.status === targetStatus)
      }
    }

    if (monthFilter !== '全部') {
      const monthIdx = MONTHS.indexOf(monthFilter)
      result = result.filter((p) => {
        const date = new Date(p.createdAt)
        return date.getMonth() + 1 === monthIdx
      })
    }

    setFilteredProjects(result)
    setCurrentPage(1)
  }, [projects, monthFilter, statusFilter])

  const totalPages = Math.ceil(filteredProjects.length / pageSize)
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `¥${(amount / 100000000).toFixed(2)}亿`
    }
    if (amount >= 10000) {
      return `¥${(amount / 10000).toFixed(0)}万`
    }
    return `¥${amount.toLocaleString()}`
  }

  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      ongoing: 'bg-primary-500/10 text-primary-500',
      completed: 'bg-success/10 text-success',
      paused: 'bg-warning/10 text-warning',
    }
    const labels = { ongoing: '进行中', completed: '已完成', paused: '暂停中' }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-body font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const getBudgetRate = (used: number, total: number) => {
    if (total === 0) return '0%'
    const rate = Math.round((used / total) * 100)
    return `${rate}%`
  }

  return (
    <div className="bg-surface-elevated rounded-lg shadow-surface">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-outline">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setMonthFilter('全部')
            setStatusFilter('全部')
          }}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors"
        >
          筛选
        </button>

        <div className="ml-auto text-sm font-body text-on-surface-secondary">
          共 {filteredProjects.length} 个项目
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline">
              <th className="text-left px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                项目名称
              </th>
              <th className="text-left px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                产品线
              </th>
              <th className="text-left px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                负责人
              </th>
              <th className="text-right px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                总金额
              </th>
              <th className="text-right px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                已使用
              </th>
              <th className="text-center px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                预算执行率
              </th>
              <th className="text-center px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                状态
              </th>
              <th className="text-center px-4 py-3 text-xs font-body font-medium text-on-surface-secondary uppercase tracking-wide">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center px-4 py-12 text-sm font-body text-on-surface-tertiary">
                  暂无项目数据
                </td>
              </tr>
            ) : (
              paginatedProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-outline-variant hover:bg-surface-container/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-body font-medium text-on-surface-primary">
                        {project.name}
                      </p>
                      {project.tag && (
                        <p className="text-xs font-body text-on-surface-tertiary">
                          {project.tag}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-secondary">
                    {project.productLine}
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-secondary">
                    {project.team[0]?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-primary text-right font-medium">
                    {formatAmount(project.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-secondary text-right">
                    {formatAmount(project.usedAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{
                            width: `${getBudgetRate(project.usedAmount, project.totalAmount)}`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-body text-on-surface-secondary">
                        {getBudgetRate(project.usedAmount, project.totalAmount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(project.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onView?.(project)}
                        className="w-8 h-8 flex items-center justify-center rounded text-on-surface-tertiary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
                        title="查看"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                      <button
                        onClick={() => onEdit?.(project)}
                        className="w-8 h-8 flex items-center justify-center rounded text-on-surface-tertiary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
                        title="编辑"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => onDelete?.(project)}
                        className="w-8 h-8 flex items-center justify-center rounded text-on-surface-tertiary hover:bg-surface-container hover:text-error transition-colors"
                        title="删除"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-outline">
          <p className="text-sm font-body text-on-surface-secondary">
            第 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredProjects.length)} 条，共 {filteredProjects.length} 条
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-body text-on-surface-secondary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm font-body text-on-surface-tertiary">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-body transition-colors ${
                      currentPage === p
                        ? 'bg-primary-500 text-white'
                        : 'text-on-surface-secondary hover:bg-surface-container'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-body text-on-surface-secondary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectTable
