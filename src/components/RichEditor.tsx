import React, { useState, useEffect } from 'react'
import BraftEditor, { EditorState, ControlType } from 'braft-editor'
import 'braft-editor/dist/index.css'

interface RichEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}

const RichEditor: React.FC<RichEditorProps> = ({
  value = '',
  onChange,
  placeholder = '在此输入内容...',
  readOnly = false,
}) => {
  const [editorState, setEditorState] = useState<EditorState>(() => {
    if (value) {
      return BraftEditor.createEditorState(value)
    }
    return BraftEditor.createEditorState('')
  })

  useEffect(() => {
    if (value !== editorState.toHTML()) {
      const newState = BraftEditor.createEditorState(value)
      setEditorState(newState)
    }
  }, [value])

  const handleChange = (newState: EditorState) => {
    setEditorState(newState)
    onChange?.(newState.toHTML())
  }

  if (readOnly) {
    return (
      <div
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated rounded-lg"
        style={{ fontFamily: 'Fira Sans, sans-serif' }}
        dangerouslySetInnerHTML={{ __html: value || '<p style="color: #94A3B8;">无内容</p>' }}
      />
    )
  }

  const controls: ControlType[] = [
    'bold', 'italic', 'underline', 'strike-through', 'separator',
    'headings', 'list-ol', 'list-ul', 'blockquote', 'code', 'separator',
    'link', 'separator',
    'undo', 'redo'
  ]

  return (
    <div className="rounded-lg overflow-hidden transition-all ring-1 ring-outline focus-within:ring-2 focus-within:ring-primary-500">
      <BraftEditor
        value={editorState}
        onChange={handleChange}
        placeholder={placeholder}
        controls={controls}
      />
    </div>
  )
}

export default RichEditor
