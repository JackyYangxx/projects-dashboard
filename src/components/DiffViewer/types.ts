export type DiffLineType = 'add' | 'del' | 'context'

export interface ViewDiffLine {
  num: number
  type: DiffLineType
  content: string
}

export type LayoutMode = 'side-by-side' | 'inline' | 'file-explorer'
