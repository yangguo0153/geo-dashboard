// Platform configurations
export const PLATFORMS = {
  DOUYIN: { id: 'douyin', name: '抖音', color: '#000000' },
  KUAISHOU: { id: 'kuaishou', name: '快手', color: '#FF4906' },
  BILIBILI: { id: 'bilibili', name: 'B站', color: '#00A1D6' },
  XIAOHONGSHU: { id: 'xiaohongshu', name: '小红书', color: '#FF2442' },
  WEIBO: { id: 'weibo', name: '微博', color: '#E6162D' },
}

// Platform list for dropdowns
export const PLATFORM_LIST = Object.values(PLATFORMS)

// Account tier colors
export const TIER_COLORS = {
  S: '#ef4444', // Red
  A: '#f59e0b', // Amber
  B: '#10b981', // Emerald
  C: '#6366f1', // Indigo
  D: '#94a3b8', // Slate
}

// Account tier labels
export const TIER_LABELS = {
  S: 'S级',
  A: 'A级',
  B: 'B级',
  C: 'C级',
  D: 'D级',
}

// Tier values list for dropdowns
export const TIER_LIST = ['S', 'A', 'B', 'C', 'D']

// Platform names list for dropdowns
export const PLATFORM_NAMES = Object.values(PLATFORMS).map(p => p.name)

// Navigation items
export const NAV_ITEMS = [
  { key: '/', label: '总览', icon: 'DashboardOutlined' },
  { key: '/recommend', label: '推荐词', icon: 'StarOutlined' },
  { key: '/compare', label: '对比词', icon: 'SwapOutlined' },
  { key: '/sentiment', label: '舆情词', icon: 'AlertOutlined' },
  { key: '/settlement', label: '结算汇总', icon: 'AccountBookOutlined' },
]

// API endpoints
export const API_ENDPOINTS = {
  OVERVIEW: '/api/overview',
  RECOMMEND: '/api/recommend',
  COMPARE: '/api/compare',
  SENTIMENT: '/api/sentiment',
  SETTLEMENT: '/api/settlement',
  UPLOAD: '/api/upload',
  AUTH: '/api/auth',
}

// Chart colors
export const CHART_COLORS = [
  '#00d4ff',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

// Date format patterns
export const DATE_FORMATS = {
  DISPLAY: 'YYYY-MM-DD',
  API: 'YYYY-MM-DD',
  MONTH: 'YYYY-MM',
}

// Pagination defaults
export const PAGINATION = {
  PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],
}

// Empty state messages
export const EMPTY_MESSAGES = {
  NO_DATA: '暂无数据',
  NO_RESULTS: '未找到匹配结果',
  LOADING: '加载中...',
  ERROR: '加载失败，请重试',
}