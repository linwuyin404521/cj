<template>
  <div class="lottery-wheel">
    <!-- 转盘主体 -->
    <div class="wheel-container">
      <div 
        class="wheel"
        :style="wheelStyle"
        ref="wheel"
      >
        <!-- 转盘分割线 -->
        <div class="wheel-center"></div>
        
        <!-- 转盘奖品区域 -->
        <div 
          v-for="(prize, index) in prizes"
          :key="index"
          class="wheel-sector"
          :style="getSectorStyle(index)"
        >
          <div class="sector-content" :style="getContentStyle(index)">
            <div class="prize-icon">
              <i :class="prize.icon"></i>
            </div>
            <div class="prize-name">{{ prize.name }}</div>
            <div class="prize-probability">{{ prize.probability }}%</div>
          </div>
        </div>
        
        <!-- 转盘装饰 -->
        <div class="wheel-decoration">
          <div class="decoration-ring ring-1"></div>
          <div class="decoration-ring ring-2"></div>
          <div class="decoration-ring ring-3"></div>
        </div>
      </div>
      
      <!-- 指针 -->
      <div class="wheel-pointer">
        <div class="pointer-body">
          <i class="fas fa-caret-down"></i>
        </div>
        <div class="pointer-shadow"></div>
      </div>
      
      <!-- 开始按钮 -->
      <button 
        class="spin-button"
        :disabled="isSpinning || remainingSpins <= 0"
        @click="$emit('spin')"
      >
        <div class="button-inner">
          <i class="fas fa-redo-alt"></i>
          <span v-if="isSpinning">抽奖中...</span>
          <span v-else>
            {{ remainingSpins > 0 ? '开始抽奖' : '机会已用完' }}
          </span>
        </div>
        <div class="button-glow"></div>
      </button>
    </div>
    
    <!-- 剩余次数显示 -->
    <div class="spin-counter">
      <div class="counter-label">剩余抽奖次数</div>
      <div class="counter-value">{{ remainingSpins }}</div>
      <div class="counter-progress">
        <div class="progress-bar" :style="{ width: `${(remainingSpins / 3) * 100}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  prizes: {
    type: Array,
    required: true
  },
  isSpinning: {
    type: Boolean,
    default: false
  },
  remainingSpins: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['spin'])

const wheel = ref(null)
const rotation = ref(0)

// 计算转盘样式
const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transition: props.isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.83, 0.67)' : 'none'
}))

// 获取扇区样式
const getSectorStyle = (index) => {
  const angle = 360 / props.prizes.length
  return {
    transform: `rotate(${angle * index}deg)`,
    backgroundColor: props.prizes[index].color,
    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan(Math.PI / props.prizes.length)}% 0%)`
  }
}

// 获取内容样式
const getContentStyle = (index) => {
  const angle = 360 / props.prizes.length
  return {
    transform: `rotate(${angle / 2}deg) translate(0, -150px)`
  }
}

// 开始旋转
const startRotation = () => {
  if (props.isSpinning || props.remainingSpins <= 0) return
  
  const extraRotation = 360 * 5 // 至少旋转5圈
  const targetIndex = Math.floor(Math.random() * props.prizes.length)
  const anglePerPrize = 360 / props.prizes.length
  const targetRotation = extraRotation - (targetIndex * anglePerPrize)
  
  rotation.value = rotation.value % 360
  rotation.value += targetRotation
  
  emit('spin')
}
</script>

<style lang="scss" scoped>
.lottery-wheel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.wheel-container {
  position: relative;
  width: 500px;
  height: 500px;
  
  @media (max-width: 768px) {
    width: 350px;
    height: 350px;
  }
  
  @media (max-width: 480px) {
    width: 300px;
    height: 300px;
  }
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.2),
    inset 0 0 100px rgba(255, 255, 255, 0.3);
  transition: transform 4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
  
  &::before {
    content: '';
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: 10px;
    border-radius: 50%;
    background: white;
    z-index: 1;
  }
}

.wheel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff6b6b, #ffa726);
  border-radius: 50%;
  z-index: 10;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  
  &::before {
    content: '';
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: 10px;
    border-radius: 50%;
    background: white;
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.2);
  }
}

.wheel-sector {
  position: absolute;
  width: 50%;
  height: 50%;
  transform-origin: bottom right;
  left: 0;
  top: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  }
}

.sector-content {
  position: absolute;
  left: -120px;
  width: 240px;
  text-align: center;
  color: white;
  font-weight: 600;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.prize-icon {
  font-size: 2rem;
  margin-bottom: 8px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
  }
}

.prize-name {
  font-size: 1.1rem;
  margin-bottom: 4px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
}

.prize-probability {
  font-size: 0.9rem;
  opacity: 0.9;
  font-weight: 500;
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
}

.wheel-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  
  &.ring-1 {
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
  }
  
  &.ring-2 {
    top: 40px;
    left: 40px;
    right: 40px;
    bottom: 40px;
  }
  
  &.ring-3 {
    top: 60px;
    left: 60px;
    right: 60px;
    bottom: 60px;
  }
}

.wheel-pointer {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  animation: pointerGlow 2s infinite;
}

.pointer-body {
  position: relative;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ff6b6b, #ffa726);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  
  i {
    font-size: 2rem;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.pointer-shadow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 20px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, transparent 70%);
}

@keyframes pointerGlow {
  0%, 100% {
    filter: drop-shadow(0 0 5px rgba(255, 107, 107, 0.7));
  }
  50% {
    filter: drop-shadow(0 0 15px rgba(255, 107, 107, 0.9));
  }
}

.spin-button {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #3498db, #2ecc71);
  border: none;
  padding: 0;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  
  &:hover:not(:disabled) {
    transform: translateX(-50%) scale(1.05);
    box-shadow: 0 20px 40px rgba(52, 152, 219, 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateX(-50%) scale(0.95);
  }
  
  &:disabled {
    background: linear-gradient(135deg, #95a5a6, #7f8c8d);
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.button-inner {
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  bottom: 15px;
  background: white;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 2;
  
  i {
    font-size: 2.5rem;
background: linear-gradient(135deg, #3498db, #2ecc71);
background-clip: text;            /* 添加标准属性 */
-webkit-background-clip: text;    /* 保留前缀属性 */
color: transparent;               /* 添加标准属性 */
-webkit-text-fill-color: transparent;
  }
  
  span {
    font-size: 1.1rem;
    font-weight: 700;
    color: #2c3e50;
  }
}

.button-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    rgba(52, 152, 219, 0.3),
    rgba(46, 204, 113, 0.3),
    rgba(52, 152, 219, 0.3));
  animation: glowRotate 3s linear infinite;
  filter: blur(10px);
  opacity: 0.8;
}

@keyframes glowRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spin-counter {
  background: white;
  padding: 25px 40px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 300px;
  
  .counter-label {
    font-size: 1rem;
    color: #7f8c8d;
    margin-bottom: 10px;
    font-weight: 500;
  }
  
  .counter-value {
    font-size: 3.5rem;
    font-weight: 800;
    color: #3498db;
    margin-bottom: 15px;
    line-height: 1;
  }
  
  .counter-progress {
    height: 10px;
    background: #f0f0f0;
    border-radius: 5px;
    overflow: hidden;
    
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #2ecc71, #3498db);
      transition: width 0.5s ease;
    }
  }
}
</style>