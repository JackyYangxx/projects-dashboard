import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import ProgressSlider from '@/components/ProgressSlider'
import RichTextEditor from '@/components/RichTextEditor'
import Timeline from '@/components/Timeline'

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getProjectById, updateProject } = useProjectStore()
  const project = id ? getProjectById(id) : undefined

  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')

  if (!project) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-tertiary mb-4">
            search_off
          </span>
          <h2 className="text-xl font-heading font-semibold text-on-surface-primary mb-2">
            项目不存在
          </h2>
          <p className="text-sm font-body text-on-surface-secondary mb-6">
            未找到 ID 为 "{id}" 的项目
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors"
          >
            返回仪表盘
          </button>
        </div>
      </div>
    )
  }

  const handleProgressChange = (value: number) => {
    updateProject(project.id, { progress: value, updatedAt: new Date().toISOString() })
  }

  const handleNotesChange = (html: string) => {
    updateProject(project.id, { notes: html, updatedAt: new Date().toISOString() })
  }

  const budgetPercent = project.totalAmount > 0
    ? Math.round((project.usedAmount / project.totalAmount) * 100)
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const scopeColorClasses: Record<string, { border: string; text: string; bg: string }> = {
    primary: {
      border: 'border-primary-500',
      text: 'text-primary-500',
      bg: 'bg-primary-500/10',
    },
    secondary: {
      border: 'border-secondary-500',
      text: 'text-secondary-500',
      bg: 'bg-secondary-500/10',
    },
    tertiary: {
      border: 'border-tertiary-500',
      text: 'text-tertiary-500',
      bg: 'bg-tertiary-500/10',
    },
    outline: {
      border: 'border-outline',
      text: 'text-on-surface-secondary',
      bg: 'bg-surface-container',
    },
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
          title="返回仪表盘"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="h-5 w-px bg-outline" />
        <div className="flex items-center gap-3">
          <h1 className="text-base font-heading font-semibold text-on-surface-primary">
            {project.name}
          </h1>
          <span className="px-2 py-0.5 bg-surface-container rounded text-xs font-body text-on-surface-tertiary">
            {project.tag}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={`px-2 py-1 rounded text-xs font-body font-medium ${
              project.status === 'ongoing'
                ? 'bg-success/10 text-success'
                : project.status === 'completed'
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'bg-warning/10 text-warning'
            }`}
          >
            {project.status === 'ongoing' ? '进行中' : project.status === 'completed' ? '已完成' : '已暂停'}
          </span>
          <span className="text-xs font-body text-on-surface-tertiary font-mono">
            #{project.id.slice(0, 8)}
          </span>
        </div>
      </nav>

      {/* Main Content - Bento Grid */}
      <main className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Row 1: Progress Tracking (8 cols) + Budget Stats (4 cols) */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-elevated rounded-xl p-6 h-full">
              <ProgressSlider
                value={project.progress}
                subProgress={project.subProgress}
                onChange={handleProgressChange}
                lastUpdated={formatDate(project.updatedAt)}
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="bg-primary-500 rounded-xl p-6 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-body font-medium text-white/70 mb-4">预算统计</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-body text-white/60 mb-1">总金额</p>
                    <p className="text-2xl font-heading font-bold text-white">
                      {formatCurrency(project.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-body text-white/60 mb-1">已使用</p>
                    <p className="text-xl font-heading font-semibold text-white">
                      {formatCurrency(project.usedAmount)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-body text-white/60">执行率</span>
                  <span className="text-lg font-heading font-bold text-white">{budgetPercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Rich Text Editor (12 cols) */}
          <div className="col-span-12">
            <div className="bg-surface-elevated rounded-xl p-6">
              <h3 className="text-sm font-body font-medium text-on-surface-secondary mb-4">项目笔记</h3>
              <RichTextEditor
                value={project.notes}
                onChange={handleNotesChange}
                placeholder="在此记录项目进展、关键决策和重要事项..."
              />
            </div>
          </div>

          {/* Row 3: Strategic Team (5 cols) + Curation Scope (7 cols) */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-surface-elevated rounded-xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">战略团队</h3>
                <span className="text-xs font-body text-on-surface-tertiary">
                  {project.team.length} 名成员
                </span>
              </div>

              {project.team.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-tertiary mb-2">
                    group_off
                  </span>
                  <p className="text-sm font-body text-on-surface-tertiary">暂无团队成员</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-surface-base rounded-lg"
                    >
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full bg-surface-container"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-on-surface-primary truncate">
                          {member.name}
                        </p>
                        <p className="text-xs font-body text-on-surface-tertiary truncate">
                          {member.role}
                        </p>
                      </div>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-tertiary hover:bg-surface-container hover:text-on-surface-primary transition-colors opacity-0 group-hover:opacity-100">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button className="mt-4 w-full py-2 border border-dashed border-outline rounded-lg text-sm font-body text-on-surface-tertiary hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">add</span>
                添加成员
              </button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="bg-surface-elevated rounded-xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">策展范围</h3>
                <span className="text-xs font-body text-on-surface-tertiary">
                  {project.scope.length} 项范围
                </span>
              </div>

              {project.scope.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-tertiary mb-2">
                    exploration_off
                  </span>
                  <p className="text-sm font-body text-on-surface-tertiary">暂无策展范围</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.scope.map((item, index) => {
                    const colors = scopeColorClasses[item.color] || scopeColorClasses.outline
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}
                          >
                            <span
                              className={`material-symbols-outlined text-lg ${colors.text}`}
                            >
                              {item.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-body font-semibold text-on-surface-primary mb-1">
                              {item.title}
                            </h4>
                            <p className="text-xs font-body text-on-surface-secondary leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Evolution Timeline (12 cols) */}
          <div className="col-span-12">
            <div className="bg-surface-elevated rounded-xl p-6">
              <Timeline
                events={project.timeline}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProjectDetail
