import React from 'react'
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  Inbox,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  FolderSync,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Plus,
  FolderOpen,
  ArrowLeft,
  LucideIcon
} from 'lucide-react'

const iconMap = {
  dashboard: LayoutDashboard,
  search: Search,
  trending_up: TrendingUp,
  inbox: Inbox,
  visibility: Eye,
  edit: Pencil,
  delete: Trash2,
  progress_activity: Loader2,
  folder_copy: FolderSync,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  upload_file: Upload,
  download: Download,
  add: Plus,
  folder_open: FolderOpen,
  arrow_back: ArrowLeft,
} as const

export type IconName = keyof typeof iconMap

interface IconProps {
  name: IconName
  size?: number
  className?: string
  spin?: boolean
}

const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', spin = false }) => {
  const IconComponent: LucideIcon = iconMap[name]
  return (
    <IconComponent
      size={size}
      className={`${className} ${spin ? 'animate-spin' : ''}`}
    />
  )
}

export default Icon
