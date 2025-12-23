// 认证相关工具函数
class AuthUtils {
  // 保存用户信息
  static saveUser(userData) {
    if (userData.token) {
      localStorage.setItem('auth_token', userData.token)
    }
    if (userData.refresh_token) {
      localStorage.setItem('refresh_token', userData.refresh_token)
    }
    if (userData.user) {
      localStorage.setItem('user_info', JSON.stringify(userData.user))
    }
  }
  
  // 获取当前用户
  static getCurrentUser() {
    const userStr = localStorage.getItem('user_info')
    return userStr ? JSON.parse(userStr) : null
  }
  
  // 获取token
  static getToken() {
    return localStorage.getItem('auth_token')
  }
  
  // 检查是否登录
  static isAuthenticated() {
    const token = this.getToken()
    if (!token) return false
    
    // 检查token是否过期（如果有exp字段）
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.clearAuth()
        return false
      }
      return true
    } catch {
      return false
    }
  }
  
  // 登出
  static logout() {
    this.clearAuth()
    window.location.href = '/login'
  }
  
  // 清除认证信息
  static clearAuth() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
  }
  
  // 检查权限
  static hasPermission(permission) {
    const user = this.getCurrentUser()
    if (!user || !user.permissions) return false
    return user.permissions.includes(permission)
  }
  
  // 检查角色
  static hasRole(role) {
    const user = this.getCurrentUser()
    if (!user || !user.roles) return false
    return user.roles.includes(role)
  }
}

export default AuthUtils