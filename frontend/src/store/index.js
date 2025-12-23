import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token'))
  
  const isAuthenticated = computed(() => !!token.value)
  
  function setUser(userData) {
    user.value = userData
  }
  
  function setToken(authToken) {
    token.value = authToken
    localStorage.setItem('auth_token', authToken)
  }
  
  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
  }
  
  return {
    user,
    token,
    isAuthenticated,
    setUser,
    setToken,
    logout
  }
})

export const useLotteryStore = defineStore('lottery', () => {
  const prizes = ref([
    { id: 1, level: '特等奖', name: 'iPhone 15 Pro', probability: 1, icon: 'fas fa-mobile-alt', color: '#FF6B6B', value: '¥8999' },
    { id: 2, level: '一等奖', name: 'MacBook Air', probability: 2, icon: 'fas fa-laptop', color: '#FFA726', value: '¥7999' },
    { id: 3, level: '二等奖', name: 'iPad Pro', probability: 5, icon: 'fas fa-tablet-alt', color: '#29B6F6', value: '¥5999' },
    { id: 4, level: '三等奖', name: 'AirPods Pro', probability: 8, icon: 'fas fa-headphones', color: '#66BB6A', value: '¥1999' },
    { id: 5, level: '四等奖', name: '戴森吹风机', probability: 10, icon: 'fas fa-wind', color: '#AB47BC', value: '¥1299' },
    { id: 6, level: '五等奖', name: '京东卡 ¥500', probability: 15, icon: 'fas fa-credit-card', color: '#FFCA28', value: '¥500' },
    { id: 7, level: '六等奖', name: '星巴克星礼包', probability: 20, icon: 'fas fa-coffee', color: '#8D6E63', value: '¥200' },
    { id: 8, level: '幸运奖', name: '优惠券大礼包', probability: 15, icon: 'fas fa-gift', color: '#26C6DA', value: '¥100' },
    { id: 9, level: '参与奖', name: '平台积分100', probability: 24, icon: 'fas fa-gem', color: '#78909C', value: '¥50' }
  ])
  
  const lotteryHistory = ref([])
  const spinCount = ref(0)
  const maxSpins = 3
  const currentPrize = ref(null)
  const isSpinning = ref(false)
  
  const remainingSpins = computed(() => maxSpins - spinCount.value)
  
  function addToHistory(result) {
    lotteryHistory.value.unshift(result)
    spinCount.value++
  }
  
  function resetLottery() {
    currentPrize.value = null
  }
  
  return {
    prizes,
    lotteryHistory,
    spinCount,
    maxSpins,
    remainingSpins,
    currentPrize,
    isSpinning,
    addToHistory,
    resetLottery
  }
})