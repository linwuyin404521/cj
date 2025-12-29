<template>
  <div class="login-container">
    <h2>用户登录</h2>
    
    <div class="form-group">
      <input 
        type="tel" 
        placeholder="请输入手机号" 
        v-model="loginForm.phone" 
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
          v-model="loginForm.password" 
          :class="{ error: errors.password }"
        >
      </div>
      <span class="error-message" v-if="errors.password">{{ errors.password }}</span>
    </div>

    <div class="form-actions">
      <button class="login-btn" @click="handleLogin" :disabled="isLoading">
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
    </div>

    <!-- 第三方登录区域 -->
    <div class="third-party-login">
      <p>或使用以下方式登录</p>
      <div class="login-buttons">
        <button class="wechat-btn" @click="handleWechatLogin">
          <svg class="wechat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
          </svg>
          <span>微信登录</span>
        </button>
        
        <button class="alipay-btn" @click="handleAlipayLogin">
          <svg class="alipay-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span>支付宝登录</span>
        </button>
      </div>
    </div>

    <div class="link-to-register">
      <span>没有账号？</span>
      <a @click="$router.push('/register')">立即注册</a>
    </div>
  </div>
</template>

<script>
import { login } from '@/utils/api'
import { mapMutations } from 'vuex'

export default {
  data() {
    return {
      loginForm: {
        phone: '',
        password: ''
      },
      errors: {},
      isLoading: false
    }
  },
  methods: {
    ...mapMutations(['setUserInfo', 'setToken']),
    // 表单验证
    validateForm() {
      const errors = {}
      if (!this.loginForm.phone) {
        errors.phone = '请输入手机号'
      } else if (!/^1[3-9]\d{9}$/.test(this.loginForm.phone)) {
        errors.phone = '请输入正确的手机号格式'
      }
      if (!this.loginForm.password) {
        errors.password = '请输入密码'
      } else if (this.loginForm.password.length < 6) {
        errors.password = '密码长度不能少于6位'
      }
      this.errors = errors
      return Object.keys(errors).length === 0
    },
    
    // 手机号登录
    async handleLogin() {
      if (!this.validateForm()) return
      this.isLoading = true
      try {
        const response = await login(this.loginForm)
        if (response.success) {
          this.setUserInfo(response.data.userInfo)
          this.setToken(response.data.token)
          this.$router.push('/lottery')
        } else {
          alert(response.message || '登录失败')
        }
      } catch (error) {
        console.error('登录请求失败:', error)
        alert('网络连接异常，请稍后重试')
      } finally {
        this.isLoading = false
      }
    },
    
    // 微信登录
    handleWechatLogin() {
      // 跳转后端微信OAuth2授权接口
      window.location.href = '/api/wechat/login'
    },
    
    // 支付宝登录
    handleAlipayLogin() {
      // 跳转后端支付宝授权接口
      window.location.href = '/api/alipay/login'
    }
  }
}
</script>

<style scoped>
.login-container {
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

.login-btn {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.login-btn:hover {
  background: #0056b3;
}

.login-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.third-party-login {
  border-top: 1px solid #eee;
  padding-top: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.third-party-login p {
  margin-bottom: 15px;
  color: #666;
}

.login-buttons {
  display: flex;
  justify-content: space-around;
}

.wechat-btn, .alipay-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.wechat-btn {
  background: #07c160;
  color: white;
}

.alipay-btn {
  background: #1677ff;
  color: white;
}

.wechat-btn:hover, .alipay-btn:hover {
  opacity: 0.9;
}

.wechat-icon, .alipay-icon {
  width: 20px;
  height: 20px;
}

.link-to-register {
  text-align: center;
  color: #666;
}

.link-to-register a {
  color: #007bff;
  text-decoration: none;
  cursor: pointer;
}

.link-to-register a:hover {
  text-decoration: underline;
}
</style>