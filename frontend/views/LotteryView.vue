<template>
  <div class="lottery-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-left">
        <h1 class="logo">
          <i class="fas fa-gift"></i>
          <span>幸运大转盘</span>
        </h1>
        <div class="user-welcome">
          <i class="fas fa-user-circle"></i>
          <span>欢迎，{{ user.username || '用户' }}</span>
        </div>
      </div>
      
      <div class="nav-right">
        <div class="user-balance">
          <span class="balance-label">抽奖机会：</span>
          <span class="balance-value">{{ remainingSpins }} 次</span>
        </div>
        <button @click="showHistory" class="nav-button">
          <i class="fas fa-history"></i>
          <span>抽奖记录</span>
        </button>
        <button @click="logout" class="nav-button logout">
          <i class="fas fa-sign-out-alt"></i>
          <span>退出</span>
        </button>
      </div>
    </nav>
    
    <main class="lottery-main">
      <!-- 左侧转盘区域 -->
      <div class="lottery-section">
        <LotteryWheel 
          :prizes="prizes"
          :is-spinning="isSpinning"
          :remaining-spins="remainingSpins"
          @spin="handleSpin"
        />
      </div>
      
      <!-- 右侧信息区域 -->
      <div class="info-section">
        <!-- 用户信息卡片 -->
        <div class="info-card user-card">
          <div class="card-header">
            <h3><i class="fas fa-user-circle"></i> 我的信息</h3>
          </div>
          <div class="card-body">
            <div class="user-info">
              <div class="info-item">
                <span class="info-label">用户名：</span>
                <span class="info-value">{{ user.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">手机号：</span>
                <span class="info-value">{{ user.phone }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">邮箱：</span>
                <span class="info-value">{{ user.email }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">注册时间：</span>
                <span class="info-value">{{ formatDate(user.createdAt) }}</span>
              </div>
            </div>
            <div class="user-stats">
              <div class="stat-item">
                <div class="stat-value">{{ lotteryHistory.length }}</div>
                <div class="stat-label">抽奖次数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ winCount }}</div>
                <div class="stat-label">中奖次数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ maxSpins - remainingSpins }}</div>
                <div class="stat-label">已用次数</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 抽奖结果卡片 -->
        <div v-if="currentPrize" class="info-card result-card animate__animated animate__bounceIn">
          <div class="card-header">
            <h3><i class="fas fa-trophy"></i> 恭喜中奖！</h3>
          </div>
          <div class="card-body">
            <div class="prize-result">
              <div class="prize-icon-large" :style="{ backgroundColor: currentPrize.color }">
                <i :class="currentPrize.icon"></i>
              </div>
              <div class="prize-details">
                <div class="prize-level">{{ currentPrize.level }}</div>
                <div class="prize-name">{{ currentPrize.name }}</div>
                <div class="prize-value">{{ currentPrize.value }}</div>
              </div>
            </div>
            <div class="result-actions">
              <button @click="shareResult" class="action-button share">
                <i class="fas fa-share-alt"></i> 分享
              </button>
              <button @click="claimPrize" class="action-button claim">
                <i class="fas fa-gift"></i> 立即领取
              </button>
            </div>
          </div>
        </div>
        
        <!-- 奖品列表 -->
        <div class="info-card prizes-card">
          <div class="card-header">
            <h3><i class="fas fa-award"></i> 奖品列表</h3>
            <button @click="showAllPrizes" class="view-all">
              查看全部 <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          <div class="card-body">
            <PrizeList :prizes="prizes.slice(0, 4)" />
          </div>
        </div>
        
        <!-- 活动规则 -->
        <div class="info-card rules-card">
          <div class="card-header">
            <h3><i class="fas fa-info-circle"></i> 活动规则</h3>
          </div>
          <div class="card-body">
            <ul class="rules-list">
              <li>1. 新用户注册即享3次抽奖机会</li>
              <li>2. 每人每日最多抽奖5次</li>
              <li>3. 中奖结果以转盘停止为准</li>
              <li>4. 奖品领取有效期为30天</li>
              <li>5. 本活动最终解释权归主办方所有</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
    
    <!-- 抽奖记录模态框 -->
    <div v-if="showHistoryModal" class="modal-overlay" @click.self="closeHistory">
      <div class="modal-content animate__animated animate__slideInUp">
        <div class="modal-header">
          <h3><i class="fas fa-history"></i> 抽奖记录</h3>
          <button @click="closeHistory" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="lotteryHistory.length === 0" class="empty-history">
            <i class="fas fa-inbox"></i>
            <p>暂无抽奖记录</p>
            <button @click="closeHistory" class="start-lottery-btn">开始抽奖</button>
          </div>
          <div v-else class="history-list">
            <div 
              v-for="(record, index) in lotteryHistory" 
              :key="index"
              class="history-item"
              :style="{ borderLeftColor: getPrizeColor(record.prizeLevel) }"
            >
              <div class="history-prize">
                <div class="prize-level">{{ record.prizeLevel }}</div>
                <div class="prize-name">{{ record.prizeName }}</div>
              </div>
              <div class="history-info">
                <div class="history-time">{{ formatTime(record.timestamp) }}</div>
                <div class="history-status">
                  <span :class="record.status === 'claimed' ? 'claimed' : 'unclaimed'">
                    {{ record.status === 'claimed' ? '已领取' : '待领取' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部公告 -->
    <footer class="lottery-footer">
      <div class="footer-content">
        <div class="footer-notice">
          <i class="fas fa-bullhorn"></i>
          <span>活动火热进行中！邀请好友可获得额外抽奖机会</span>
        </div>
        <button @click="showInvite" class="invite-button">
          <i class="fas fa-user-plus"></i> 邀请好友
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useLotteryStore } from '../store'
import { lotteryAPI, authAPI } from '../services/api'
import LotteryWheel from '../components/LotteryWheel.vue'
import PrizeList from '../components/PrizeList.vue'

const router = useRouter()
const authStore = useAuthStore()
const lotteryStore = useLotteryStore()

// 响应式数据
const user = ref({})
const isSpinning = ref(false)
const showHistoryModal = ref(false)

// 计算属性
const prizes = computed(() => lotteryStore.prizes)
const lotteryHistory = computed(() => lotteryStore.lotteryHistory)
const remainingSpins = computed(() => lotteryStore.remainingSpins)
const maxSpins = computed(() => lotteryStore.maxSpins)
const currentPrize = computed(() => lotteryStore.currentPrize)
const winCount = computed(() => {
  return lotteryHistory.value.filter(record => 
    !record.prizeLevel.includes('参与') && !record.prizeLevel.includes('谢谢')
  ).length
})

// 生命周期钩子
onMounted(async () => {
  await loadUserData()
  await loadLotteryHistory()
})

// 方法
async function loadUserData() {
  try {
    const response = await authAPI.getProfile()
    user.value = response.user
    authStore.setUser(response.user)
  } catch (error) {
    console.error('加载用户数据失败:', error)
  }
}

async function loadLotteryHistory() {
  try {
    const response = await lotteryAPI.history()
    lotteryStore.lotteryHistory = response.history || []
  } catch (error) {
    console.error('加载抽奖记录失败:', error)
  }
}

async function handleSpin() {
  if (remainingSpins.value <= 0) {
    alert('抽奖机会已用完！')
    return
  }
  
  isSpinning.value = true
  
  try {
    const response = await lotteryAPI.draw()
    const prize = response.prize
    
    // 更新转盘状态
    setTimeout(() => {
      lotteryStore.currentPrize = prizes.value.find(p => p.level === prize.level)
      lotteryStore.addToHistory({
        prizeLevel: prize.level,
        prizeName: prize.name,
        timestamp: new Date().toISOString(),
        status: 'unclaimed'
      })
      isSpinning.value = false
    }, 4000) // 匹配转盘动画时间
    
  } catch (error) {
    console.error('抽奖失败:', error)
    isSpinning.value = false
    alert(error.response?.data?.message || '抽奖失败，请稍后重试')
  }
}

function showHistory() {
  showHistoryModal.value = true
}

function closeHistory() {
  showHistoryModal.value = false
}

function logout() {
  if (confirm('确定要退出登录吗？')) {
    authStore.logout()
    router.push('/login')
  }
}

function shareResult() {
  if (!currentPrize.value) return
  
  const shareText = `我在幸运大转盘抽中了${currentPrize.value.level}：${currentPrize.value.name}！你也快来试试运气吧！`
  
  if (navigator.share) {
    navigator.share({
      title: '我的抽奖结果',
      text: shareText,
      url: window.location.href
    })
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      alert('抽奖结果已复制到剪贴板，快去分享给朋友吧！')
    })
  }
}

function claimPrize() {
  if (!currentPrize.value) return
  
  alert(`奖品领取申请已提交！客服将在24小时内联系您发放${currentPrize.value.name}。`)
  lotteryStore.currentPrize = null
}

function showAllPrizes() {
  alert('查看所有奖品功能开发中...')
}

function showInvite() {
  alert('邀请好友功能开发中...')
}

function getPrizeColor(level) {
  const prize = prizes.value.find(p => p.level === level)
  return prize ? prize.color : '#ccc'
}

function formatDate(dateString) {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style lang="scss" scoped>
.lottery-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

// 导航栏样式
.navbar {
  background: white;
  border-radius: 20px;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  
  .nav-left {
    display: flex;
    align-items: center;
    gap: 40px;
    
    .logo {
      font-size: 1.8rem;
      font-weight: 700;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
      
      i {
        color: #e74c3c;
        font-size: 2.2rem;
      }
    }
    
    .user-welcome {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #5a6c7d;
      font-weight: 500;
      
      i {
        font-size: 1.4rem;
        color: #3498db;
      }
    }
  }
  
  .nav-right {
    display: flex;
    align-items: center;
    gap: 20px;
    
    .user-balance {
      background: linear-gradient(135deg, #3498db, #2ecc71);
      padding: 10px 20px;
      border-radius: 50px;
      color: white;
      font-weight: 600;
      
      .balance-label {
        opacity: 0.9;
        font-size: 0.9rem;
      }
      
      .balance-value {
        font-size: 1.2rem;
      }
    }
    
    .nav-button {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      padding: 10px 20px;
      border-radius: 12px;
      color: #5a6c7d;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover {
        background: #3498db;
        border-color: #3498db;
        color: white;
        transform: translateY(-2px);
      }
      
      &.logout {
        background: #fff5f5;
        border-color: #ffebee;
        color: #e74c3c;
        
        &:hover {
          background: #e74c3c;
          border-color: #e74c3c;
          color: white;
        }
      }
    }
  }
}

// 主要内容区域
.lottery-main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.lottery-section {
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

// 卡片通用样式
.info-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  
  .card-header {
    background: linear-gradient(135deg, #3498db, #2ecc71);
    padding: 20px 30px;
    color: white;
    
    h3 {
      margin: 0;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
    }
    
    .view-all {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
  
  .card-body {
    padding: 25px 30px;
  }
}

// 用户卡片
.user-card {
  .user-info {
    margin-bottom: 25px;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .info-label {
        color: #7f8c8d;
        font-weight: 500;
      }
      
      .info-value {
        color: #2c3e50;
        font-weight: 600;
      }
    }
  }
  
  .user-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    text-align: center;
    
    .stat-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 12px;
      
      .stat-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #3498db;
        margin-bottom: 5px;
      }
      
      .stat-label {
        font-size: 0.9rem;
        color: #7f8c8d;
      }
    }
  }
}

// 抽奖结果卡片
.result-card {
  border: 3px solid #ffeb3b;
  
  .prize-result {
    display: flex;
    align-items: center;
    gap: 25px;
    margin-bottom: 25px;
    
    .prize-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      color: white;
    }
    
    .prize-details {
      flex: 1;
      
      .prize-level {
        font-size: 1.8rem;
        font-weight: 700;
        color: #e74c3c;
        margin-bottom: 5px;
      }
      
      .prize-name {
        font-size: 1.3rem;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 5px;
      }
      
      .prize-value {
        font-size: 1.1rem;
        color: #f39c12;
        font-weight: 500;
      }
    }
  }
  
  .result-actions {
    display: flex;
    gap: 15px;
    
    .action-button {
      flex: 1;
      padding: 15px;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      
      &.share {
        background: #f8f9fa;
        color: #5a6c7d;
        
        &:hover {
          background: #e0e0e0;
        }
      }
      
      &.claim {
        background: linear-gradient(135deg, #2ecc71, #27ae60);
        color: white;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(46, 204, 113, 0.3);
        }
      }
    }
  }
}

// 规则卡片
.rules-card {
  .rules-list {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: 12px 0;
      color: #5a6c7d;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      &::before {
        content: '•';
        color: #3498db;
        font-weight: bold;
        display: inline-block;
        width: 1em;
        margin-left: -1em;
      }
    }
  }
}

// 模态框样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  
  .modal-header {
    padding: 25px 30px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 1.5rem;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #7f8c8d;
      cursor: pointer;
      padding: 5px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      
      &:hover {
        background: #f8f9fa;
      }
    }
  }
  
  .modal-body {
    padding: 30px;
    overflow-y: auto;
  }
}

.empty-history {
  text-align: center;
  padding: 60px 20px;
  
  i {
    font-size: 4rem;
    color: #bdc3c7;
    margin-bottom: 20px;
  }
  
  p {
    color: #7f8c8d;
    font-size: 1.1rem;
    margin-bottom: 30px;
  }
  
  .start-lottery-btn {
    background: linear-gradient(135deg, #3498db, #2ecc71);
    color: white;
    border: none;
    padding: 15px 40px;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
    }
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  
  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 16px;
    border-left: 6px solid #3498db;
    
    .history-prize {
      .prize-level {
        font-size: 1.2rem;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 5px;
      }
      
      .prize-name {
        color: #5a6c7d;
      }
    }
    
    .history-info {
      text-align: right;
      
      .history-time {
        color: #7f8c8d;
        font-size: 0.9rem;
        margin-bottom: 8px;
      }
      
      .history-status {
        span {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          
          &.claimed {
            background: #d4edda;
            color: #155724;
          }
          
          &.unclaimed {
            background: #fff3cd;
            color: #856404;
          }
        }
      }
    }
  }
}

// 页脚样式
.lottery-footer {
  background: white;
  border-radius: 20px;
  padding: 20px 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  
  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .footer-notice {
      display: flex;
      align-items: center;
      gap: 15px;
      color: #e74c3c;
      font-weight: 500;
      
      i {
        font-size: 1.5rem;
      }
    }
    
    .invite-button {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(231, 76, 60, 0.3);
      }
    }
  }
}

// 响应式设计
@media (max-width: 992px) {
  .navbar {
    flex-direction: column;
    gap: 20px;
    
    .nav-left, .nav-right {
      width: 100%;
      justify-content: center;
    }
  }
  
  .lottery-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .lottery-container {
    padding: 15px;
  }
  
  .navbar {
    padding: 15px 20px;
    
    .nav-left {
      flex-direction: column;
      gap: 15px;
    }
    
    .nav-right {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
  
  .result-card {
    .result-actions {
      flex-direction: column;
    }
  }
}
</style>