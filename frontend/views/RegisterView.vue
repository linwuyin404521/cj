<template>
  <div class="auth-container">
    <div class="auth-card animate__animated animate__fadeIn">
      <div class="auth-header">
        <h1 class="auth-title">
          <i class="fas fa-user-plus"></i> 创建账号
        </h1>
        <p class="auth-subtitle">注册即享3次抽奖机会</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-row">
          <div class="form-group">
            <label for="username">
              <i class="fas fa-user"></i> 用户名
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              placeholder="请输入用户名"
              required
              :class="{ 'error': errors.username }"
            >
            <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
          </div>
          
          <div class="form-group">
            <label for="phone">
              <i class="fas fa-phone"></i> 手机号
            </label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              placeholder="请输入手机号"
              required
              :class="{ 'error': errors.phone }"
            >
            <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
          </div>
        </div>
        
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
        
        <div class="form-row">
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
          
          <div class="form-group">
            <label for="confirmPassword">
              <i class="fas fa-lock"></i> 确认密码
            </label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              required
              :class="{ 'error': errors.confirmPassword }"
            >
            <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="inviteCode">
            <i class="fas fa-ticket-alt"></i> 邀请码（选填）
          </label>
          <input
            id="inviteCode"
            v-model="form.inviteCode"
            type="text"
            placeholder="如有邀请码请输入"
          >
        </div>
        
        <div class="form-agreement">
          <label class="checkbox">
            <input type="checkbox" v-model="form.agreement" required>
            <span>我已阅读并同意</span>
          </label>
          <a href="#" class="agreement-link">《用户协议》</a>和
          <a href="#" class="agreement-link">《隐私政策》</a>
        </div>
        
        <button
          type="submit"
          class="auth-button"
          :disabled="loading"
        >
          <span v-if="loading">
            <i class="fas fa-spinner fa-spin"></i> 注册中...
          </span>
          <span v-else>
            <i class="fas fa-user-plus"></i> 立即注册
          </span>
        </button>
        
        <div class="register-benefits">
          <h4><i class="fas fa-crown"></i> 注册即享福利</h4>
          <ul>
            <li><i class="fas fa-check-circle"></i> 3次免费抽奖机会</li>
            <li><i class="fas fa-check-circle"></i> 新人专享优惠券</li>
            <li><i class="fas fa-check-circle"></i> 积分兑换好礼</li>
          </ul>
        </div>
      </form>
      
      <div class="auth-footer">
        <p>已有账号？ <router-link to="/login" class="auth-link">立即登录</router-link></p>
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
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
  agreement: false
})

const errors = reactive({})
const loading = ref(false)
const showPassword = ref(false)

async function handleRegister() {
  if (!validateForm()) return
  
  loading.value = true
  
  try {
    const response = await authAPI.register({
      username: form.username,
      phone: form.phone,
      email: form.email,
      password: form.password,
      inviteCode: form.inviteCode || undefined
    })
    
    authStore.setToken(response.token)
    authStore.setUser(response.user)
    
    showNotification('success', '注册成功！获得3次抽奖机会')
    
    setTimeout(() => {
      router.push('/lottery')
    }, 1500)
    
  } catch (error) {
    const errorMsg = error.response?.data?.message || '注册失败，请稍后重试'
    showNotification('error', errorMsg)
    
    // 设置具体的错误字段
    if (error.response?.data?.errors) {
      Object.assign(errors, error.response.data.errors)
    }
  } finally {
    loading.value = false
  }
}

function validateForm() {
  let isValid = true
  
  // 清空错误信息
  Object.keys(errors).forEach(key => delete errors[key])
  
  // 用户名验证
  if (!form.username) {
    errors.username = '请输入用户名'
    isValid = false
  } else if (form.username.length < 2) {
    errors.username = '用户名至少2个字符'
    isValid = false
  }
  
  // 手机号验证
  if (!form.phone) {
    errors.phone = '请输入手机号'
    isValid = false
  } else if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    errors.phone = '手机号格式不正确'
    isValid = false
  }
  
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
  
  // 确认密码验证
  if (!form.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  // 协议确认
  if (!form.agreement) {
    showNotification('error', '请同意用户协议和隐私政策')
    isValid = false
  }
  
  return isValid
}

function showNotification(type, message) {
  alert(`${type === 'success' ? '🎉' : '❌'} ${message}`)
}
</script>

<style lang="scss" scoped>
@import './LoginView.scss';

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.form-agreement {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 30px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 12px;
  
  .checkbox {
    margin: 0;
    
    span {
      color: #5a6c7d;
    }
  }
}

.agreement-link {
  color: #3498db;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}

.register-benefits {
  margin-top: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 16px;
  border-left: 4px solid #2ecc71;
  
  h4 {
    color: #2c3e50;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    
    i {
      color: #f39c12;
    }
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: 8px 0;
      color: #5a6c7d;
      display: flex;
      align-items: center;
      gap: 10px;
      
      i {
        color: #2ecc71;
      }
    }
  }
}
</style>