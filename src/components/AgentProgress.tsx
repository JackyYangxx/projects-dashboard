import { useCodeReviewStore } from '@/store/codeReviewStore'
import Icon from './Icon'

const PHASE_LABELS: Record<string, string> = {
  preparing: '准备',
  analyzing: '分析',
  locating: '定位',
  reflecting: '反思',
  completed: '完成',
}

const PHASES = ['preparing', 'analyzing', 'locating', 'reflecting'] as const

export default function AgentProgress() {
  const {
    agentStatus, agentCurrentPhase, agentProgress,
    agentCurrentFile, agentFoundCount, agentLiveIssues,
    controlAgent,
  } = useCodeReviewStore()

  if (agentStatus === 'idle') return null

  const currentIdx = PHASES.indexOf(agentCurrentPhase as typeof PHASES[number])

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon
            name="progress_activity"
            size={18}
            spin={agentStatus === 'running'}
            className="text-primary-500"
          />
          <span className="font-semibold text-sm">
            {agentStatus === 'paused' ? '已暂停' : '正在评审'}
          </span>
        </div>
        <span className="font-mono text-xs text-on-surface-secondary">
          {PHASE_LABELS[agentCurrentPhase] || agentCurrentPhase} — {Math.round(agentProgress * 100)}%
        </span>
      </div>

      {/* Phase indicators */}
      <div className="flex gap-1 mb-3">
        {PHASES.map((phase, idx) => (
          <div
            key={phase}
            className={`flex-1 h-1 rounded-full ${
              idx <= currentIdx ? 'bg-primary-500' : 'bg-outline'
            }`}
            style={{ opacity: idx <= currentIdx ? 1 : 0.3 }}
          />
        ))}
      </div>

      {/* Status details */}
      <div className="font-mono text-xs text-on-surface-secondary mb-3 space-y-0.5">
        {agentCurrentFile && <div>当前文件: {agentCurrentFile}</div>}
        <div>已发现: {agentFoundCount} 个问题</div>
      </div>

      {/* Live issues list */}
      {agentLiveIssues.length > 0 && (
        <div className="mb-3 max-h-[200px] overflow-y-auto space-y-1">
          {agentLiveIssues.map(issue => (
            <div
              key={issue.id}
              className="flex items-center gap-2 px-2 py-1.5 text-xs bg-surface-secondary rounded-md"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  issue.severity === 'critical' ? 'bg-red-500'
                    : issue.severity === 'warning' ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
              />
              <span className="flex-1 truncate">{issue.title}</span>
              <span className="text-on-surface-tertiary text-[11px] truncate max-w-[40%]">
                {issue.filePath}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {agentStatus === 'running' ? (
          <button
            onClick={() => controlAgent('pause')}
            className="flex items-center gap-1 px-3 py-1.5 border border-outline rounded-lg text-xs hover:bg-surface-container transition-colors"
          >
            <Icon name="pause_circle" size={14} />
            暂停
          </button>
        ) : (
          <button
            onClick={() => controlAgent('resume')}
            className="flex items-center gap-1 px-3 py-1.5 border border-outline rounded-lg text-xs hover:bg-surface-container transition-colors"
          >
            <Icon name="play_circle" size={14} />
            继续
          </button>
        )}
        <button
          onClick={() => controlAgent('skip')}
          className="flex items-center gap-1 px-3 py-1.5 border border-outline rounded-lg text-xs hover:bg-surface-container transition-colors"
        >
          跳过当前MR
        </button>
        <button
          onClick={() => controlAgent('cancel')}
          className="flex items-center gap-1 px-3 py-1.5 border border-outline rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          <Icon name="close" size={14} />
          取消
        </button>
      </div>
    </div>
  )
}
