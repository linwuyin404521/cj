<template>
  <div class="auth-container">
    <div class="auth-card animate__animated animate__fadeIn">
      <div class="auth-header">
        <h1 class="auth-title">
          <i class="fas fa-gift"></i> 欢迎回来
        </h1>
        <p class="auth-subtitle">登录开始您的抽奖之旅</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="email">
            <i class="fas fa-envelope"></i> 邮箱地址
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="请输入邮箱"
            required
            :class="{ 'error': errors.email }"
          >
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>
        
        <div class="form-group">
          <label for="password">
            <i class="fas fa-lock"></i> 密码
          </label>
          <div class="password-input">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              required
              :class="{ 'error': errors.password }"
            >
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>
        
        <div class="form-options">
          <label class="checkbox">
            <input type="checkbox" v-model="form.remember">
            <span>记住我</span>
          </label>
          <a href="#" class="forgot-password">忘记密码？</a>
        </div>
        
        <button
          type="submit"
          class="auth-button"
          :disabled="loading"
        >
          <span v-if="loading">
            <i class="fas fa-spinner fa-spin"></i> 登录中...
          </span>
          <span v-else>
            <i class="fas fa-sign-in-alt"></i> 登录
          </span>
        </button>
        
        <div class="auth-divider">
          <span>或</span>
        </div>
        
        <div class="social-login">
          <button type="button" class="social-button google">
            <i class="fab fa-google"></i> Google
          </button>
          <button type="button" class="social-button wechat">
            <i class="fab fa-weixin"></i> 微信
          </button>
        </div>
      </form>
      
      <div class="auth-footer">
        <p>还没有账号？ <router-link to="/register" class="auth-link">立即注册</router-link></p>
      </div>
      
      <div class="auth-notice">
        <p><i class="fas fa-info-circle"></i> 登录后即可获得3次抽奖机会</p>
      </div>
    </div>
    
    <!-- 背景装饰元素 -->
    <div class="decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store'
import { authAPI } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
  remember: false
})

const errors = reactive({})
const loading = ref(false)
const showPassword = ref(false)

async function handleLogin() {
  if (!validateForm()) return
  
  loading.value = true
  
  try {
    const response = await authAPI.login({
      email: form.email,
      password: form.password
    })
    
    authStore.setToken(response.token)
    authStore.setUser(response.user)
    
    // 显示成功消息
    showNotification('success', '登录成功！')
    
    // 跳转到抽奖页面
    setTimeout(() => {
      router.push('/lottery')
    }, 1000)
    
  } catch (error) {
    showNotification('error', error.response?.data?.message || '登录失败，请检查邮箱和密码')
  } finally {
    loading.value = false
  }
}

function validateForm() {
  let isValid = true
  
  // 清空错误信息
  Object.keys(errors).forEach(key => delete errors[key])
  
  // 邮箱验证
  if (!form.email) {
    errors.email = '请输入邮箱地址'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = '邮箱格式不正确'
    isValid = false
  }
  
  // 密码验证
  if (!form.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = '密码长度至少6位'
    isValid = false
  }
  
  return isValid
}

function showNotification(type, message) {
  // 这里可以集成一个通知组件
  alert(`${type === 'success' ? '🎉' : '❌'} ${message}`)
}
</script>

<style lang="scss" scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.auth-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  z-index: 1;
  position: relative;
}

.auth-header {
  text-align: center;
  margin-bottom: 40px;
}

.auth-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  i {
    color: #e74c3c;
  }
}

.auth-subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.auth-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 24px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #2c3e50;
    display: flex;
    align-items: center;
    gap: 8px;
    
    i {
      color: #3498db;
    }
  }
  
  input {
    width: 100%;
    padding: 16px 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: #f8f9fa;
    
    &:focus {
      outline: none;
      border-color: #3498db;
      background: white;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }
    
    &.error {
      border-color: #e74c3c;
    }
    
    &::placeholder {
      color: #bdc3c7;
    }
  }
}

.password-input {
  position: relative;
  
  .toggle-password {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #7f8c8d;
    cursor: pointer;
    padding: 4px;
    font-size: 1.1rem;
    
    &:hover {
      color: #3498db;
    }
  }
}

.error-message {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 6px;
  display: block;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #5a6c7d;
  font-size: 0.95rem;
  
  input {
    width: 18px;
    height: 18px;
    accent-color: #3498db;
  }
}

.forgot-password {
  color: #3498db;
  text-decoration: none;
  font-size: 0.95rem;
  
  &:hover {
    text-decoration: underline;
  }
}

.auth-button {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 30px 0;
  color: #bdc3c7;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e0e0e0;
  }
  
  span {
    padding: 0 20px;
  }
}

.social-login {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.social-button {
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &.google {
    color: #db4437;
    
    &:hover {
      border-color: #db4437;
      background: rgba(219, 68, 55, 0.05);
    }
  }
  
  &.wechat {
    color: #07c160;
    
    &:hover {
      border-color: #07c160;
      background: rgba(7, 193, 96, 0.05);
    }
  }
}

.auth-footer {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #e0e0e0;
  
  p {
    color: #7f8c8d;
    font-size: 1rem;
  }
}

.auth-link {
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
  
  &:hover {
    text-decoration: underline;
  }
}

.auth-notice {
  margin-top: 25px;
  padding: 15px;
  background: linear-gradient(135deg, #fff8e1, #ffe0b2);
  border-radius: 12px;
  border-left: 4px solid #ff9800;
  
  p {
    color: #e65100;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }
}

.decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(46, 204, 113, 0.1));
  
  &.circle-1 {
    width: 300px;
    height: 300px;
    top: -150px;
    right: -150px;
  }
  
  &.circle-2 {
    width: 200px;
    height: 200px;
    bottom: 50px;
    left: -100px;
  }
  
  &.circle-3 {
    width: 150px;
    height: 150px;
    bottom: -75px;
    right: 20%;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .auth-card {
    padding: 30px 20px;
  }
  
  .auth-title {
    font-size: 1.8rem;
  }
  
  .social-login {
    grid-template-columns: 1fr;
  }
}
</style>