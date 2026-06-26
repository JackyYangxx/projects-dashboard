import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { useCodeReviewStore } from '@/store/codeReviewStore'

export default function SkillPanel() {
  const { skills, loadSkills, addSkill, toggleSkill, removeSkill } = useCodeReviewStore()
  const [showForm, setShowForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [checkedFiles, setCheckedFiles] = useState<number[]>([])

  useEffect(() => { loadSkills() }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.zip'))
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).filter(f => f.name.endsWith('.zip')) : []
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setCheckedFiles(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
  }

  const parseSkillFromZip = async (file: File): Promise<{ name: string; description?: string; content: string } | null> => {
    try {
      const zip = await JSZip.loadAsync(file)
      const txtFile = zip.file(/\.txt$/i)[0] || zip.file(/\.md$/i)[0]
      if (!txtFile) return null

      const content = await txtFile.async('string')
      const name = file.name.replace(/\.zip$/i, '')

      return {
        name,
        description: `从 ${file.name} 导入`,
        content: content.trim(),
      }
    } catch (err) {
      console.error('[Skill] Failed to parse zip:', file.name, err)
      return null
    }
  }

  const toggleChecked = (index: number) => {
    if (checkedFiles.includes(index)) {
      setCheckedFiles(checkedFiles.filter(i => i !== index))
    } else {
      setCheckedFiles([...checkedFiles, index])
    }
  }

  const handleBatchImport = async () => {
    if (checkedFiles.length === 0) return

    let successCount = 0
    for (const index of checkedFiles) {
      const file = selectedFiles[index]
      const skillData = await parseSkillFromZip(file)
      if (skillData) {
        addSkill({ ...skillData, enabled: true })
        successCount++
      }
    }

    setSelectedFiles([])
    setCheckedFiles([])
    if (successCount > 0) {
      alert(`成功导入 ${successCount} 个 Skill`)
    }
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">Skills</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary-500 hover:underline"
        >
          {showForm ? '取消' : '+ 上传'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          {/* Drag-drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-outline hover:border-primary-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".zip"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="skill-zip-upload"
            />
            <label htmlFor="skill-zip-upload" className="cursor-pointer">
              <div className="text-2xl mb-2">📦</div>
              <p className="text-sm text-on-surface-secondary">点击或拖拽 ZIP 文件到此处</p>
              <p className="text-xs text-on-surface-tertiary mt-1">支持多文件同时选择</p>
            </label>
          </div>

          {/* File list */}
          {selectedFiles.length > 0 && (
            <div className="bg-surface-secondary rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs text-on-surface-tertiary mb-2">
                <span>已选择 {selectedFiles.length} 个文件</span>
                <button onClick={() => { setSelectedFiles([]); setCheckedFiles([]) }} className="text-primary-500 hover:underline">清空</button>
              </div>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkedFiles.includes(index)}
                      onChange={() => toggleChecked(index)}
                    />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-on-surface-tertiary">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    移除
                  </button>
                </div>
              ))}
              <button
                onClick={handleBatchImport}
                disabled={checkedFiles.length === 0}
                className="w-full mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm disabled:opacity-50"
              >
                导入选中 ({checkedFiles.length})
              </button>
            </div>
          )}
        </div>
      )}
      <ul>
        {skills.map(skill => (
          <li key={skill.id} className="pt-4 pb-4 border-b border-outline/50 first:pt-0 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skill.enabled}
                onChange={e => toggleSkill(skill.id, e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{skill.name}</span>
                {skill.description && (
                  <span className="block text-xs text-on-surface-tertiary truncate">{skill.description}</span>
                )}
              </div>
              <button
                onClick={() => removeSkill(skill.id)}
                className="text-xs text-red-500 hover:underline shrink-0"
              >
                删除
              </button>
            </div>
          </li>
        ))}
        {skills.length === 0 && (
          <li className="text-sm text-on-surface-tertiary py-2">暂无 Skill</li>
        )}
      </ul>
    </div>
  )
}
