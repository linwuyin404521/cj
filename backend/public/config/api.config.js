// API配置文件
const apiConfig = {
  // 基础URL
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  
  // 超时时间
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  
  // 是否启用日志
  enableLog: import.meta.env.VITE_API_LOG === 'true',
  
  // 重试配置
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    retryCondition: (error) => {
      // 只在网络错误或5xx错误时重试
      return !error.response || error.response.status >= 500
    }
  },
  
  // 接口路径配置
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      profile: '/auth/profile',
      refresh: '/auth/refresh'
    },
    lottery: {
      draw: '/lottery/draw',
      history: '/lottery/history',
      prizes: '/lottery/prizes',
      statistics: '/lottery/statistics'
    },
    user: {
      info: '/user/info',
      points: '/user/points',
      update: '/user/update'
    }
  }
}

export default apiConfig