import type { MetaRecord } from 'nextra'

const businessLayout = {
  layout: 'full',
  toc: false,
  timestamp: false,
  copyPage: false,
} as const

export default {
  index: {
    type: 'page',
    display: 'hidden',
    theme: { ...businessLayout, footer: false },
  },
  workspace: {
    type: 'page',
    title: '知识学习室',
    theme: businessLayout,
  },
  lab: {
    type: 'page',
    title: '策略实验室',
    theme: businessLayout,
  },
  training: {
    type: 'page',
    title: 'K线训练场',
    theme: businessLayout,
  },
  experiments: {
    type: 'page',
    title: '实验记录',
    theme: businessLayout,
  },
  docs: {
    type: 'page',
    display: 'hidden',
    title: '帮助文档',
  },
} satisfies MetaRecord
