// Platform configurations (AI 搜索平台)
export const PLATFORMS = {
  DOUBAO: { id: 'doubaobao', name: '豆包', color: '#00d4ff' },
  QIANWEN: { id: 'qianwen', name: '千问', color: '#6366f1' },
  DEEPSEEK: { id: 'deepseek', name: 'DeepSeek', color: '#10b981' },
  YUANBAO: { id: 'yuanbao', name: '元宝', color: '#f59e0b' },
}

// Platform list for dropdowns
export const PLATFORM_LIST = Object.values(PLATFORMS)

// 词包级别颜色
export const TIER_COLORS = {
  '一级': '#ef4444', // Red - 最难，关联度 ≤30%
  '二级': '#f59e0b', // Amber - 中等，关联度 30%-50%
  '三级': '#10b981', // Emerald - 较易，关联度 50%-60%
  '品牌技术': '#6366f1', // Indigo - 舆情词专用
}

// 词包级别标签
export const TIER_LABELS = {
  '一级': '一级词包',
  '二级': '二级词包',
  '三级': '三级词包',
  '品牌技术': '品牌技术词包',
}

// 级别列表用于下拉选择
export const TIER_LIST = ['一级', '二级', '三级', '品牌技术']

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