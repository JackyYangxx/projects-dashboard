import React from 'react'
import type { SubProgress } from '../types/index'

interface ProgressSliderProps {
  value: number
  subProgress: SubProgress
  onChange: (value: number) => void
  lastUpdated?: string
}

const subProgressItems = [
  { key: 'architecture' as const, label: '底层架构', icon: 'account_tree' },
  { key: 'uiux' as const, label: 'UI-UX设计', icon: 'palette' },
  { key: 'engineering' as const, label: '工程开发', icon: 'code' },
  { key: 'qa' as const, label: '质量审计', icon: 'fact_check' },
]

const ProgressSlider: React.FC<ProgressSliderProps> = ({
  value,
  subProgress,
  onChange,
  lastUpdated,
}) => {
  const sliderRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    updateValue(e.clientX)
  }

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        updateValue(e.clientX)
      }
    },
    [isDragging]
  )

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  const updateValue = (clientX: number) => {
    if (!sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    onChange(Math.round(percent))
  }

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-body font-medium text-on-surface-secondary">进度动态</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-heading font-bold text-on-surface-primary tabular-nums">
              {value}%
            </span>
            <span className="text-sm font-body text-on-surface-tertiary">完成度</span>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-xs font-mono text-on-surface-tertiary">
            更新: {lastUpdated}
          </span>
        )}
      </div>

      {/* Main Slider */}
      <div
        ref={sliderRef}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="项目进度"
        className="relative h-3 bg-surface-base rounded-full cursor-pointer select-none group"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-[width] duration-150 ease-out shadow-sm"
          style={{ width: `${value}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all duration-150 ${
            isDragging ? 'scale-110' : 'group-hover:scale-105'
          }`}
          style={{ left: `calc(${value}% - 10px)` }}
        />
      </div>

      {/* Percentage labels */}
      <div className="flex justify-between text-xs font-mono text-on-surface-tertiary px-1">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* Sub-progress cards */}
      <div className="grid grid-cols-2 gap-3">
        {subProgressItems.map((item) => (
          <div
            key={item.key}
            className="bg-white rounded-xl p-3 flex items-center gap-3 border border-outline transition-all duration-150 hover:shadow-elevated hover:border-primary-200"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary-100">
              <span className="material-symbols-outlined text-accent-500 text-base">
                {item.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body text-on-surface-secondary">{item.label}</p>
              <p className="text-base font-heading font-semibold text-on-surface-primary tabular-nums">
                {subProgress[item.key]}%
              </p>
              <div className="w-full h-1 bg-surface-base rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                  style={{ width: `${subProgress[item.key]}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProgressSlider
