// 通用响应类型
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
  timestamp: number
  success: boolean
}

// 分页响应类型
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// 用户相关类型
export interface User {
  id: number
  username: string
  email: string
  phone?: string
  avatar?: string
  points: number
  level: number
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  username: string
  password: string
  remember?: boolean
}

export interface RegisterData extends LoginCredentials {
  email: string
  phone?: string
  confirmPassword: string
}

// 抽奖相关类型
export interface Prize {
  id: number
  name: string
  description: string
  image?: string
  type: 'virtual' | 'physical'
  value: number
  probability: number
  stock: number
  dailyLimit?: number
  totalLimit?: number
  isActive: boolean
}

export interface LotteryRecord {
  id: number
  userId: number
  prizeId: number
  prizeName: string
  prizeType: string
  winTime: string
  status: 'pending' | 'claimed' | 'expired'
  claimCode?: string
}

export interface DrawResult {
  success: boolean
  prize?: Prize
  record?: LotteryRecord
  message: string
  remainingPoints: number
}

// 错误类型
export interface ApiError {
  code: number
  message: string
  details?: any
  timestamp: number
}

// 请求配置类型
export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  params?: any
  headers?: Record<string, string>
  timeout?: number
  retry?: boolean
  showLoading?: boolean
  showError?: boolean
}