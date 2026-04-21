export type StatusKey = 'ongoing' | 'completed' | 'paused'
export type StatusLabel = '进行中' | '已完成' | '暂停中'

export const STATUS_MAP: Record<StatusLabel, StatusKey> = {
  '进行中': 'ongoing',
  '已完成': 'completed',
  '暂停中': 'paused',
}

export const STATUS_LABELS: Record<StatusKey, StatusLabel> = {
  ongoing: '进行中',
  completed: '已完成',
  paused: '暂停中',
}

export const VALID_STATUSES: StatusKey[] = ['ongoing', 'completed', 'paused']

export const IMPORT_REQUIRED_HEADERS = [
  '项目名称',
  '产品线',
  '负责人',
  '总预算',
  '已用预算',
] as const
