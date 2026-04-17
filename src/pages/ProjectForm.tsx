import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import type { Project } from '@/types'

const ProjectForm: React.FC = () => {
  const navigate = useNavigate()
  const { addProject } = useProjectStore()

  const [formData, setFormData] = useState({
    name: '',
    productLine: '',
    status: 'ongoing' as Project['status'],
    tag: '',
    totalAmount: 0,
    usedAmount: 0,
    progress: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      await addProject({
        name: formData.name,
        productLine: formData.productLine,
        status: formData.status,
        tag: formData.tag,
        totalAmount: Number(formData.totalAmount),
        usedAmount: Number(formData.usedAmount),
        progress: Number(formData.progress),
        notes: '',
        team: [],
        scope: [],
        timeline: [],
        subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
      })
      navigate('/')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">新增项目</h1>
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">
              项目名称 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
              placeholder="输入项目名称"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">产品线</label>
            <input
              type="text"
              value={formData.productLine}
              onChange={(e) => setFormData({ ...formData, productLine: e.target.value })}
              className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
              placeholder="输入产品线"
            />
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
              className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
            >
              <option value="ongoing">进行中</option>
              <option value="completed">已完成</option>
              <option value="paused">暂停中</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">标签</label>
            <input
              type="text"
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
              placeholder="输入标签"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">总金额</label>
              <input
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">已使用</label>
              <input
                type="number"
                value={formData.usedAmount}
                onChange={(e) => setFormData({ ...formData, usedAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-base border border-outline rounded-lg text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">进度 {formData.progress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              className="w-full h-2 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-outline rounded-lg text-sm font-body text-on-surface-primary hover:bg-surface-container transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default ProjectForm
