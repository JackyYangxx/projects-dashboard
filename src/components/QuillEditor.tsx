import React, { useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

interface QuillEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
}

const QuillEditor: React.FC<QuillEditorProps> = ({
  value = '',
  onChange,
  placeholder = '在此输入内容...',
  readOnly = false,
}) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  }), [])

  const handleChange = (content: string) => {
    onChange?.(content)
  }

  if (readOnly) {
    return (
      <div
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-surface-elevated rounded-lg"
        style={{ fontFamily: 'Fira Sans, sans-serif' }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }

  return (
    <div className="rounded-lg overflow-hidden transition-all ring-1 ring-outline focus-within:ring-2 focus-within:ring-primary-500">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  )
}

export default QuillEditor
