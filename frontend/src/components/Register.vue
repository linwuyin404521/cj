<template>
  <div class="register-container">
    <h2>用户注册</h2>
    
    <div class="form-group">
      <input 
        type="tel" 
        placeholder="请输入手机号" 
        v-model="registerForm.phone" 
        :class="{ error: errors.phone }"
        maxlength="11"
      >
      <span class="error-message" v-if="errors.phone">{{ errors.phone }}</span>
    </div>

    <div class="form-group">
      <div class="input-group">
        <input 
          type="password" 
          placeholder="请输入密码" 
          v-model="registerForm.password" 
          :class="{ error: errors.password }"
        >
      </div>
      <span class="error-message" v-if="errors.password">{{ errors.password }}</span>
    </div>

    <div class="form-group">
      <div class="input-group">
        <input 
          type="password" 
          placeholder="请确认密码" 
          v-model="registerForm.confirmPassword" 
          :class="{ error: errors.confirmPassword }"
        >
      </div>
      <span class="error-message" v-if="errors.confirmPassword">{{ errors.confirmPassword }}</span>
    </div>

    <div class="form-actions">
      <button class="register-btn" @click="handleRegister" :disabled="isLoading">
        {{ isLoading ? '注册中...' : '注册' }}
      </button>
    </div>

    <div class="link-to-login">
      <span>已有账号？</span>
      <a @click="$router.push('/login')">立即登录</a>
    </div>
  </div>
</template>

<script>
import { register } from '@/utils/api'

export default {
  data() {
    return {
      registerForm: {
        phone: '',
        password: '',
        confirmPassword: ''
      },
      errors: {},
      isLoading: false
    }
  },
  methods: {
    // 表单验证
    validateForm() {
      const errors = {}
      if (!this.registerForm.phone) {
        errors.phone = '请输入手机号'
      } else if (!/^1[3-9]\d{9}$/.test(this.registerForm.phone)) {
        errors.phone = '请输入正确的手机号格式'
      }
      if (!this.registerForm.password) {
        errors.password = '请输入密码'
      } else if (this.registerForm.password.length < 6) {
        errors.password = '密码长度不能少于6位'
      }
      if (!this.registerForm.confirmPassword) {
        errors.confirmPassword = '请确认密码'
      } else if (this.registerForm.password !== this.registerForm.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致'
      }
      this.errors = errors
      return Object.keys(errors).length === 0
    },
    
    // 用户注册
    async handleRegister() {
      if (!this.validateForm()) return
      this.isLoading = true
      try {
        const response = await register(this.registerForm)
        if (response.success) {
          alert('注册成功，请登录')
          this.$router.push('/login')
        } else {
          alert(response.message || '注册失败')
        }
      } catch (error) {
        console.error('注册请求失败:', error)
        alert('网络连接异常，请稍后重试')
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
.register-container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

input.error {
  border-color: #ff4444;
}

.error-message {
  color: #ff4444;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.form-actions {
  margin-bottom: 20px;
}

.register-btn {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.register-btn:hover {
  background: #0056b3;
}

.register-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.link-to-login {
  text-align: center;
  color: #666;
}

.link-to-login a {
  color: #007bff;
  text-decoration: none;
  cursor: pointer;
}

.link-to-login a:hover {
  text-decoration: underline;
}
</style>