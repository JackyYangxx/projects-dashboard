import React, { useEffect } from 'react'
import type { Project } from '../types/index'
import Icon, { type IconName } from './Icon'
import TruncatedText from './TruncatedText'
import { animateProgress, animateStaggerIn } from '@/utils/animations'

interface ProjectTableProps {
  projects: Project[]
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onView?: (project: Project) => void
}

const INITIAL_PAGE_SIZE = 20

const STATUS_DOT: Record<Project['status'], string> = {
  ongoing: 'bg-primary-500',
  completed: 'bg-success',
  paused: 'bg-warning',
}

const STATUS_ICON: Record<Project['status'], IconName> = {
  ongoing: 'play_circle',
  completed: 'check_circle',
  paused: 'pause_circle',
}

const STATUS_PILL: Record<Project['status'], string> = {
  ongoing: 'bg-primary-50 text-primary-700 border-primary-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
}

const STATUS_TEXT: Record<Project['status'], string> = {
  ongoing: '进行中',
  completed: '已完成',
  paused: '已暂停',
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onEdit,
  onDelete,
  onView,
}) => {
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const isLoadingMoreRef = React.useRef(false)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null)

  // Reset paging when projects change (filter applied)
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE)
  }, [projects])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true
          setIsLoadingMore(true)
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 20, projects.length))
            isLoadingMoreRef.current = false
            setIsLoadingMore(false)
          }, 300)
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [projects.length])

  const visibleProjects = projects.slice(0, visibleCount)
  const hasMore = visibleCount < projects.length

  // Animate progress bars
  useEffect(() => {
    if (!tbodyRef.current) return
    const rows = tbodyRef.current.querySelectorAll<HTMLElement>('tr[data-row]')
    rows.forEach((row) => {
      const fills = row.querySelectorAll<HTMLElement>('[data-progress-fill]')
      fills.forEach((fill) => {
        const target = Number(fill.dataset.target || '0')
        animateProgress(fill, target, { duration: 1000, delay: 200 })
      })
    })
  }, [visibleProjects])

  // Stagger entrance
  useEffect(() => {
    if (!tbodyRef.current) return
    const rows = tbodyRef.current.querySelectorAll<HTMLElement>('tr[data-row]')
    animateStaggerIn(tbodyRef.current, 'tr[data-row]', { staggerMs: 40, distance: 8 })
    void rows
  }, [visibleProjects.length])

  const getBudgetRate = (used: number, total: number) => {
    if (total === 0) return 0
    return Math.round((used / total) * 100)
  }

  const handleDelete = (project: Project) => {
    if (window.confirm(`确定要删除项目 "${project.name}" 吗？此操作不可撤销。`)) {
      onDelete?.(project)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-card border border-outline overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-outline bg-surface-hover">
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary">
                项目
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                项目编号
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                产品线
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                负责人
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                进展
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                预算执行
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                状态
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none w-24">
                操作
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {visibleProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center px-4 py-12 text-sm font-body text-on-surface-tertiary">
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="inbox" className="text-4xl text-on-surface-tertiary" />
                    <span>暂无项目数据</span>
                  </div>
                </td>
              </tr>
            ) : (
              visibleProjects.map((project) => (
                <tr
                  key={project.id}
                  data-row
                  onClick={() => onView?.(project)}
                  className="group border-b border-outline-variant/60 last:border-b-0 transition-colors duration-150 hover:bg-primary-50/40 cursor-pointer"
                >
                  <td className="relative px-4 py-2.5">
                    {/* Hover left bar */}
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-2.5">
                      {project.status === 'ongoing' ? (
                        <span className="relative flex w-2 h-2 flex-shrink-0" aria-hidden>
                          <span className="absolute inline-flex w-full h-full rounded-full bg-primary-500 opacity-60 animate-ping-slow" />
                          <span className={`relative inline-flex w-2 h-2 rounded-full ${STATUS_DOT[project.status]}`} />
                        </span>
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[project.status]}`}
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <TruncatedText
                          text={project.name}
                          maxChars={22}
                          className="text-sm font-body font-medium text-on-surface-primary"
                        />
                        {project.tag && (
                          <p className="text-[11px] font-body text-on-surface-tertiary mt-0.5 truncate max-w-[180px]">
                            {project.tag}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <span className="text-xs font-mono text-on-surface-secondary">
                      {project.projectId || '—'}
                    </span>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <TruncatedText
                      text={project.productLine || '—'}
                      maxChars={12}
                      className="text-xs font-body text-on-surface-secondary"
                    />
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <TruncatedText
                      text={project.leader || '未指定'}
                      maxChars={10}
                      className="text-xs font-body text-on-surface-secondary"
                    />
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          data-progress-fill
                          data-target={project.progress}
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-body text-on-surface-secondary tabular-nums font-mono w-9 text-right">
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          data-progress-fill
                          data-target={getBudgetRate(project.usedAmount, project.totalAmount)}
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${getBudgetRate(project.usedAmount, project.totalAmount)}%` }}
                        />
                      </div>
                      <span className="text-xs font-body text-on-surface-secondary tabular-nums font-mono w-9 text-right">
                        {getBudgetRate(project.usedAmount, project.totalAmount)}%
                      </span>
                    </div>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-body font-medium border ${STATUS_PILL[project.status]}`}
                    >
                      <Icon name={STATUS_ICON[project.status]} size={12} />
                      {STATUS_TEXT[project.status]}
                    </span>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onView?.(project)}
                        aria-label={`查看 ${project.name}`}
                        title="查看"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer"
                      >
                        <Icon name="visibility" size={15} />
                      </button>
                      <button
                        onClick={() => onEdit?.(project)}
                        aria-label={`编辑 ${project.name}`}
                        title="编辑"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        aria-label={`删除 ${project.name}`}
                        title="删除"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll sentinel & loading indicator */}
      <div ref={sentinelRef} className="px-4 py-2.5 border-t border-outline bg-surface-subtle/40">
        {isLoadingMore ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <Icon name="progress_activity" className="text-base text-primary-500" spin />
            <span className="text-xs font-body text-on-surface-secondary">加载更多…</span>
          </div>
        ) : hasMore ? (
          <div className="flex items-center justify-center py-1">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary-300 to-transparent" />
          </div>
        ) : projects.length > 0 ? (
          <p className="text-center text-xs font-body leading-tight text-on-surface-tertiary">
            已展示全部 <span className="font-mono text-primary-500 font-medium">{projects.length}</span> 个项目
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default ProjectTable
