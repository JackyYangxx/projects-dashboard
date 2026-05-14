import React from 'react'

interface Props {
  currentProject: string
  currentMR: string
  progress: number // 0-100
  completedCount: number
  totalCount: number
}

export default function ReviewProgress({ currentProject, currentMR, progress, completedCount, totalCount }: Props) {
  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-on-surface-secondary">当前评审</span>
        <span className="text-xs text-on-surface-tertiary">{completedCount}/{totalCount} MR</span>
      </div>
      <div className="text-sm font-medium text-on-surface-primary mb-3">
        {currentProject} / {currentMR}
      </div>
      <div className="w-full bg-surface-secondary rounded-full h-2 mb-2">
        <div
          className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-on-surface-tertiary">{Math.round(progress)}%</div>
    </div>
  )
}