import React from 'react'
import type { SubProgress } from '../types/index'
import Icon, { IconName } from './Icon'

interface ProgressSliderProps {
  value: number
  subProgress: SubProgress
  onChange: (value: number) => void
  onSubProgressChange?: (key: keyof SubProgress, value: number) => void
  onReset?: () => void
  lastUpdated?: string
  readOnly?: boolean
}

const subProgressItems: { key: keyof SubProgress; label: string; icon: IconName }[] = [
  { key: 'architecture' as const, label: '底层架构', icon: 'account_tree' },
  { key: 'uiux' as const, label: 'UI-UX设计', icon: 'palette' },
  { key: 'engineering' as const, label: '工程开发', icon: 'code' },
  { key: 'qa' as const, label: '质量审计', icon: 'fact_check' },
]

const ProgressSlider: React.FC<ProgressSliderProps> = ({
  value,
  subProgress,
  onChange,
  onSubProgressChange,
  onReset,
  lastUpdated,
  readOnly = false,
}) => {
  const sliderRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [draggingKey, setDraggingKey] = React.useState<keyof SubProgress | null>(null)
  const subTrackRefs = React.useRef<Record<keyof SubProgress, HTMLDivElement | null>>({
    architecture: null,
    uiux: null,
    engineering: null,
    qa: null,
  })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return
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

  const handleSubMouseDown = (e: React.MouseEvent, key: keyof SubProgress) => {
    if (readOnly || !onSubProgressChange) return
    e.preventDefault()
    setDraggingKey(key)
    updateSubValue(e.clientX, key)
  }

  const handleSubMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (draggingKey) {
        updateSubValue(e.clientX, draggingKey)
      }
    },
    [draggingKey]
  )

  const handleSubMouseUp = React.useCallback(() => {
    setDraggingKey(null)
  }, [])

  React.useEffect(() => {
    if (draggingKey) {
      window.addEventListener('mousemove', handleSubMouseMove)
      window.addEventListener('mouseup', handleSubMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleSubMouseMove)
        window.removeEventListener('mouseup', handleSubMouseUp)
      }
    }
  }, [draggingKey, handleSubMouseMove, handleSubMouseUp])

  const updateSubValue = (clientX: number, key: keyof SubProgress) => {
    const track = subTrackRefs.current[key]
    if (!track || !onSubProgressChange) return
    const rect = track.getBoundingClientRect()
    const percent = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)))
    onSubProgressChange(key, percent)
  }

  return (
    <div className="space-y-5">
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
        {!readOnly && onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center h-8 px-2.5 text-xs font-body font-medium text-on-surface-secondary border border-outline rounded-md hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            重置
          </button>
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
        className={`relative h-2 bg-surface-hover rounded-full select-none group ${
          readOnly ? 'cursor-default' : 'cursor-pointer'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute top-0 left-0 h-full bg-primary-500 rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
        {!readOnly && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-sm transition-all duration-150 ${
              isDragging ? 'scale-110 cursor-grabbing' : 'group-hover:scale-110 cursor-grab'
            }`}
            style={{ left: `calc(${value}% - 8px)` }}
          />
        )}
      </div>

      {/* Percentage labels */}
      <div className="flex justify-between text-[10px] font-mono text-on-surface-tertiary px-0.5">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* Sub-progress cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {subProgressItems.map((item) => (
          <div
            key={item.key}
            className="bg-surface-hover/50 rounded-md p-2.5 flex items-center gap-2.5 border border-transparent hover:border-outline transition-colors"
          >
            <div className="w-8 h-8 bg-primary-50 rounded-md flex items-center justify-center flex-shrink-0 border border-primary-200">
              <Icon name={item.icon} className="text-primary-600" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body text-on-surface-secondary">{item.label}</p>
              <p className="text-base font-heading font-semibold text-on-surface-primary tabular-nums leading-tight">
                {subProgress[item.key]}%
              </p>
              <div
                ref={(el) => { subTrackRefs.current[item.key] = el }}
                className={`w-full h-1 bg-surface-base rounded-full mt-1 overflow-hidden ${!readOnly && onSubProgressChange ? 'cursor-pointer' : ''}`}
                onMouseDown={(e) => handleSubMouseDown(e, item.key)}
              >
                <div
                  className="h-full bg-primary-500 rounded-full transition-[width] duration-100"
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
