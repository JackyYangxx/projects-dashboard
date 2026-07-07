import { useState, useEffect } from 'react'

interface ScheduleConfig {
  cronExpression: string
  enabled: boolean
}

export default function ScheduleConfig() {
  const [config, setConfig] = useState<ScheduleConfig>({ cronExpression: '0 9 * * 1-5', enabled: true })
  const [nextRun, setNextRun] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (window.electronAPI?.getSchedule) {
      window.electronAPI.getSchedule().then(c => {
        if (c) setConfig(c)
        setLoading(false)
      })
      window.electronAPI.getNextScheduledRun?.().then(setNextRun)
    } else {
      setLoading(false)
    }
  }, [])

  const handleSave = async () => {
    await window.electronAPI?.setSchedule?.(config)
    const next = await window.electronAPI?.getNextScheduledRun?.()
    setNextRun(next || null)
  }

  const presets = [
    { label: '每小时', value: '0 * * * *' },
    { label: '每天 9:00', value: '0 9 * * *' },
    { label: '工作日 9:00', value: '0 9 * * 1-5' },
    { label: '每周一 9:00', value: '0 9 * * 1' },
  ]

  if (!window.electronAPI?.getSchedule) {
    return (
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px',
        border: '1px solid var(--border)', marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Fira Code, monospace', marginBottom: '8px' }}>定时扫描</h3>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          定时扫描功能仅在 Electron 桌面应用中可用。
        </div>
      </div>
    )
  }

  if (loading) return <div>加载中...</div>

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px',
      border: '1px solid var(--border)', marginBottom: '16px',
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'Fira Code, monospace', marginBottom: '12px' }}>定时扫描</h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => setConfig(c => ({ ...c, cronExpression: p.value }))}
            className={config.cronExpression === p.value ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Cron 表达式</label>
        <input
          value={config.cronExpression}
          onChange={e => setConfig(c => ({ ...c, cronExpression: e.target.value }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Fira Code, monospace' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={config.enabled} onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))} />
          <span style={{ fontSize: '14px' }}>启用定时扫描</span>
        </label>
        <button onClick={handleSave} className="btn btn-primary btn-sm">保存</button>
      </div>

      {nextRun && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Fira Code, monospace' }}>
          下次扫描: {new Date(nextRun).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  )
}
