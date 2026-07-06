import type { Project } from '../types'

export const seedProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    projectId: 'PRJ-2026-001',
    ext1: '', ext2: '', ext3: '', ext4: '', ext5: '',
    name: '战略品牌重塑',
    leader: '张明',
    productLine: '营销云',
    status: 'paused',
    tags: ['项目 A', '三月'],
    totalAmount: 0,
    usedAmount: 0,
    progress: 75,
    repositories: [
      { id: 'r1', code: 'REPO-001', url: 'https://github.com/example/brand-refresh', branch: 'main', note: '主仓库' },
    ],
    subProgress: {
      architecture: 80,
      uiux: 90,
      engineering: 70,
      qa: 60,
    },
    notes: '<p>战略品牌重塑项目正在进行中...</p>',
    noteHistory: [],
    team: [
      {
        id: '1',
        name: '张明',
        role: '项目经理',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang',
      },
      {
        id: '2',
        name: '李华',
        role: '设计师',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
      },
    ],
    scope: [
      {
        icon: 'auto_awesome',
        title: 'AI智能策展',
        description: '利用AI技术智能分析和策展内容',
        color: 'primary',
      },
      {
        icon: 'hub',
        title: '全渠道互联',
        description: '打通线上线下全渠道数据',
        color: 'secondary',
      },
    ],
    milestones: [],
    timeline: [
      {
        date: '2024年3月',
        version: 'v1.0',
        title: '项目启动',
        items: ['完成需求调研', '组建团队', '制定项目计划'],
        isActive: false,
        isCompleted: true,
      },
      {
        date: '2024年4月',
        version: 'v2.0',
        title: '中期交付',
        items: ['完成核心功能', '用户测试'],
        isActive: true,
        isCompleted: false,
      },
    ],
  },
]
