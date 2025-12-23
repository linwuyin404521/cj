import { get, post } from '@/utils/request'
import apiConfig from '@/config/api.config'
import AuthUtils from '@/utils/auth'

class AuthService {
  // 登录
  static async login(credentials) {
    const response = await post(apiConfig.endpoints.auth.login, credentials)
    AuthUtils.saveUser(response)
    return response
  }
  
  // 注册
  static async register(userData) {
    return post(apiConfig.endpoints.auth.register, userData)
  }
  
  // 登出
  static async logout() {
    try {
      await post(apiConfig.endpoints.auth.logout)
    } finally {
      AuthUtils.logout()
    }
  }
  
  // 获取用户信息
  static async getProfile() {
    const response = await get(apiConfig.endpoints.auth.profile)
    if (response.user) {
      localStorage.setItem('user_info', JSON.stringify(response.user))
    }
    return response
  }
  
  // 更新用户信息
  static async updateProfile(userData) {
    const response = await post('/user/update', userData)
    if (response.user) {
      localStorage.setItem('user_info', JSON.stringify(response.user))
    }
    return response
  }
  
  // 检查登录状态
  static checkAuth() {
    return AuthUtils.isAuthenticated()
  }
  
  // 获取当前用户
  static getCurrentUser() {
    return AuthUtils.getCurrentUser()
  }
}

export default AuthService