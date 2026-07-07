import { useEffect, useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import { useProjectStore } from '@/store/projectStore'
import Icon from '@/components/Icon'
import ProjectSelector from '@/components/ProjectSelector'
import ReviewProgress from '@/components/ReviewProgress'
import MRReviewTabs from '@/components/MRReviewTabs'
import AgentProgress from '@/components/AgentProgress'
import RuleList from '@/components/RuleList'
import RuleEditor from '@/components/RuleEditor'
import { exportToExcel } from '@/utils/excel'
import type { MRReviewRecord } from '@/types'
import type { AgentRule } from '@/types/agent'

type TabKey = 'review' | 'rules' | 'history'

const TASK_STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  running: { label: '进行中', cls: 'bg-blue-500' },
  preparing: { label: '准备中', cls: 'bg-blue-500' },
  analyzing: { label: '分析中', cls: 'bg-blue-500' },
  locating: { label: '定位中', cls: 'bg-blue-500' },
  reflecting: { label: '反思中', cls: 'bg-blue-500' },
  completed: { label: '已完成', cls: 'bg-green-500' },
  failed: { label: '失败', cls: 'bg-red-500' },
  cancelled: { label: '已取消', cls: 'bg-outline' },
  paused: { label: '已暂停', cls: 'bg-yellow-500' },
  pending: { label: '待处理', cls: 'bg-outline' },
}

export default function CodeReview() {
  const {
    loadLLMConfigs, loadMCPs, loadSkills,
    isReviewing, reviewProgress, mrReviewRecords,
    selectedProjectIds, selectProjects,
    startBatchReview, clearAllReviewData, reviewError,
    reviewTasks, loadReviewTasks,
  } = useCodeReviewStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('review')
  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<AgentRule | null>(null)

  useEffect(() => {
    loadLLMConfigs()
    loadMCPs()
    loadSkills()
    loadReviewTasks()
    useProjectStore.getState().loadProjects()
  }, [])

  const handleStartReview = () => {
    if (selectedProjectIds.length === 0) return
    startBatchReview(selectedProjectIds)
  }

  const handleExport = () => {
    exportToExcel(mrReviewRecords)
  }

  const handleClearData = () => {
    if (mrReviewRecords.length === 0) return
    exportToExcel(mrReviewRecords)
    clearAllReviewData()
    setShowClearConfirm(false)
  }

  const handleOpenRuleEditor = (rule: AgentRule | null) => {
    setEditingRule(rule)
    setShowRuleEditor(true)
  }

  const handleCloseRuleEditor = () => {
    setShowRuleEditor(false)
    setEditingRule(null)
  }

  // Group records by project
  const recordsByProject = new Map<string, MRReviewRecord[]>()
  for (const record of mrReviewRecords) {
    const list = recordsByProject.get(record.projectName) || []
    list.push(record)
    recordsByProject.set(record.projectName, list)
  }

  const tabButtonCls = (key: TabKey) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === key
        ? 'bg-surface-elevated text-on-surface-primary border border-outline'
        : 'text-on-surface-secondary hover:text-on-surface-primary hover:bg-surface-container'
    }`

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="h-14 bg-surface-subtle border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">AI 代码评审</h1>
      </nav>

      <main className="max-w-[1920px] mx-auto p-6 xl:p-8 pb-20">
        {/* Agent Progress (self-hides when idle) */}
        <AgentProgress />

        {/* Tab bar */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setActiveTab('review')} className={tabButtonCls('review')}>
            评审
          </button>
          <button type="button" onClick={() => setActiveTab('rules')} className={tabButtonCls('rules')}>
            规则管理
          </button>
          <button type="button" onClick={() => setActiveTab('history')} className={tabButtonCls('history')}>
            历史任务
          </button>
        </div>

        {activeTab === 'review' && (
          <>
            <div className="mb-4">
              <h3 className="font-heading text-sm font-medium mb-3">评审项目选择</h3>
              <ProjectSelector selectedIds={selectedProjectIds} onChange={selectProjects} />
              <button
                onClick={handleStartReview}
                disabled={selectedProjectIds.length === 0 || isReviewing}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium text-sm hover:shadow-glow-sm transition-all disabled:opacity-50"
              >
                {isReviewing ? '评审中...' : '开始评审'}
              </button>
              {reviewError && (
                <div className="mt-2 text-sm text-red-500">{reviewError}</div>
              )}
            </div>

            {reviewProgress && (
              <div className="mb-4">
                <ReviewProgress
                  currentProject={reviewProgress.projectName}
                  currentMR={reviewProgress.mrTitle}
                  progress={reviewProgress.progress}
                  completedCount={reviewProgress.completed}
                  totalCount={reviewProgress.total}
                />
              </div>
            )}

            {mrReviewRecords.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-sm font-medium">评审结果</h3>
                  <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-primary-500 hover:bg-surface-container">
                      <Icon name="download" size={14} />
                      导出 Excel
                    </button>
                    <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-red-500 hover:bg-surface-container">
                      <Icon name="delete" size={14} />
                      清理数据
                    </button>
                  </div>
                </div>
                <MRReviewTabs recordsByProject={recordsByProject} onViewOnline={(url) => window.open(url, '_blank')} />
              </div>
            )}
          </>
        )}

        {activeTab === 'rules' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-medium">规则管理</h3>
              <button
                type="button"
                onClick={() => handleOpenRuleEditor(null)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs hover:bg-primary-600 transition-colors"
              >
                <Icon name="add" size={14} />
                新建规则
              </button>
            </div>
            <RuleList />
            {showRuleEditor && (
              <div className="mt-4">
                <RuleEditor
                  existingRule={editingRule}
                  onSave={handleCloseRuleEditor}
                  onCancel={handleCloseRuleEditor}
                />
              </div>
            )}
            {/* Placeholder slot — ReportGenerator (Task 20) will be wired here in a follow-up patch */}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="mb-4">
            <h3 className="font-heading text-sm font-medium mb-3">历史任务</h3>
            {reviewTasks.length === 0 ? (
              <div className="bg-surface-elevated border border-outline rounded-xl p-8 text-center text-sm text-on-surface-secondary">
                暂无历史任务
              </div>
            ) : (
              <div className="bg-surface-elevated border border-outline rounded-xl divide-y divide-outline">
                {reviewTasks.map(task => {
                  const badge = TASK_STATUS_BADGES[task.status] || { label: task.status, cls: 'bg-outline' }
                  const percent = Math.round((task.progress || 0) * 100)
                  return (
                    <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${badge.cls}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-xs text-on-surface-secondary">
                              {new Date(task.createdAt).toLocaleString('zh-CN')}
                            </span>
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 text-white rounded ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <span className="text-on-surface-tertiary text-xs">
                              {task.completedMrCount}/{task.totalMrCount} MR
                            </span>
                          </div>
                          {task.errorMessage && (
                            <div className="text-xs text-red-500 mt-1 truncate">{task.errorMessage}</div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-on-surface-secondary">{percent}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-heading font-semibold mb-2">确认清理</h3>
            <p className="text-sm text-on-surface-secondary mb-4">清理前会先导出 Excel，确定要清理吗？</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-surface-secondary rounded-lg text-sm">取消</button>
              <button onClick={handleClearData} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">确认清理</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}