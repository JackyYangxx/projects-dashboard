import { useEffect, useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import { useProjectStore } from '@/store/projectStore'
import Icon from '@/components/Icon'
import ProjectSelector from '@/components/ProjectSelector'
import ReviewProgress from '@/components/ReviewProgress'
import MRReviewTabs from '@/components/MRReviewTabs'
import { exportToExcel } from '@/utils/excel'
import type { MRReviewRecord } from '@/types'

export default function CodeReview() {
  const { loadLLMConfigs, loadMCPs, loadSkills, isReviewing, reviewProgress, mrReviewRecords, selectedProjectIds, selectProjects, startBatchReview, clearAllReviewData, reviewError } = useCodeReviewStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    loadLLMConfigs()
    loadMCPs()
    loadSkills()
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

  // Group records by project
  const recordsByProject = new Map<string, MRReviewRecord[]>()
  for (const record of mrReviewRecords) {
    const list = recordsByProject.get(record.projectName) || []
    list.push(record)
    recordsByProject.set(record.projectName, list)
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">AI 代码评审</h1>
      </nav>

      <main className="max-w-[1920px] mx-auto p-6 xl:p-8 pb-20">
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
