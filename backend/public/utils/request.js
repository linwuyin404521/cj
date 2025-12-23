import axios from 'axios'
import apiConfig from '@/config/api.config'

// 创建axios实例
const request = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
})

// 请求队列，用于处理并发请求
const pendingRequests = new Map()

// 生成请求key
const generateRequestKey = (config) => {
  const { method, url, params, data } = config
  return `${method}-${url}-${JSON.stringify(params)}-${JSON.stringify(data)}`
}

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加时间戳防止缓存
    if (config.method?.toUpperCase() === 'GET') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    // 添加token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加语言设置
    const language = localStorage.getItem('language') || 'zh-CN'
    config.headers['Accept-Language'] = language
    
    // 取消重复请求
    const requestKey = generateRequestKey(config)
    if (pendingRequests.has(requestKey)) {
      pendingRequests.get(requestKey).abort()
    }
    
    const controller = new AbortController()
    config.signal = controller.signal
    pendingRequests.set(requestKey, controller)
    
    // 记录请求日志
    if (apiConfig.enableLog) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      })
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 移除完成的请求
    const requestKey = generateRequestKey(response.config)
    pendingRequests.delete(requestKey)
    
    // 记录响应日志
    if (apiConfig.enableLog) {
      console.log(`[API Response] ${response.config.url}`, response.data)
    }
    
    // 统一处理响应格式
    const { data } = response
    if (data && typeof data === 'object') {
      // 如果后端返回了标准的响应格式
      if (data.code !== undefined) {
        if (data.code === 200 || data.success) {
          return data.data || data
        } else {
          // 业务逻辑错误
          const error = new Error(data.message || '请求失败')
          error.code = data.code
          error.response = response
          return Promise.reject(error)
        }
      }
    }
    
    return data || response
  },
  async (error) => {
    // 移除失败的请求
    if (error.config) {
      const requestKey = generateRequestKey(error.config)
      pendingRequests.delete(requestKey)
    }
    
    // 记录错误日志
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })
    
    // 处理HTTP错误
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // token过期，尝试刷新
          try {
            const newToken = await refreshToken()
            if (newToken) {
              // 重新发起请求
              error.config.headers.Authorization = `Bearer ${newToken}`
              return request(error.config)
            }
          } catch (refreshError) {
            // 刷新失败，跳转到登录页
            localStorage.removeItem('auth_token')
            localStorage.removeItem('refresh_token')
            if (window.location.pathname !== '/login') {
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
            }
          }
          break
          
        case 403:
          // 权限不足
          alert('您没有权限执行此操作')
          break
          
        case 404:
          // 资源不存在
          console.error('请求的资源不存在')
          break
          
        case 500:
          // 服务器错误
          alert('服务器内部错误，请稍后重试')
          break
          
        default:
          // 其他错误
          if (data && data.message) {
            alert(data.message)
          }
      }
    } else if (error.request) {
      // 网络错误
      alert('网络连接失败，请检查网络设置')
    }
    
    return Promise.reject(error)
  }
)

// Token刷新函数
let isRefreshing = false
let refreshSubscribers = []

const refreshToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve)
    })
  }
  
  isRefreshing = true
  const refreshToken = localStorage.getItem('refresh_token')
  
  if (!refreshToken) {
    throw new Error('没有刷新令牌')
  }
  
  try {
    const response = await request.post(apiConfig.endpoints.auth.refresh, {
      refresh_token: refreshToken
    })
    
    const { token, refresh_token } = response
    localStorage.setItem('auth_token', token)
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token)
    }
    
    // 执行等待中的请求
    refreshSubscribers.forEach(callback => callback(token))
    refreshSubscribers = []
    
    return token
  } finally {
    isRefreshing = false
  }
}

// 添加重试机制
const requestWithRetry = async (config, retryCount = 0) => {
  try {
    return await request(config)
  } catch (error) {
    if (retryCount < apiConfig.retry.maxRetries && 
        apiConfig.retry.retryCondition(error)) {
      console.log(`请求重试 ${retryCount + 1}/${apiConfig.retry.maxRetries}`)
      await new Promise(resolve => setTimeout(resolve, apiConfig.retry.retryDelay))
      return requestWithRetry(config, retryCount + 1)
    }
    throw error
  }
}

// 导出常用方法
export const get = (url, params = {}, config = {}) => {
  return requestWithRetry({
    url,
    method: 'GET',
    params,
    ...config
  })
}

export const post = (url, data = {}, config = {}) => {
  return requestWithRetry({
    url,
    method: 'POST',
    data,
    ...config
  })
}

export const put = (url, data = {}, config = {}) => {
  return requestWithRetry({
    url,
    method: 'PUT',
    data,
    ...config
  })
}

export const del = (url, params = {}, config = {}) => {
  return requestWithRetry({
    url,
    method: 'DELETE',
    params,
    ...config
  })
}

export default request