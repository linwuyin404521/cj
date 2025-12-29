<template>
  <div class="wheel-container">
    <div class="wheel" :style="{ transform: `rotate(${rotateDeg}deg)` }">
      <div class="wheel-sector" v-for="(prize, index) in prizes" :key="index">
        <span class="sector-text">{{ prize.name }}</span>
      </div>
    </div>
    <div class="wheel-pointer"></div>
    <button class="draw-btn" @click="drawPrize" :disabled="isDrawing">
      {{ isDrawing ? '抽奖中...' : '开始抽奖' }}
    </button>
  </div>
</template>

<script>
import { drawPrize } from '@/utils/api'
import { mapMutations } from 'vuex'

export default {
  data() {
    return {
      prizes: [
        { name: '一等奖', probability: 0.01 },
        { name: '二等奖', probability: 0.05 },
        { name: '三等奖', probability: 0.1 },
        { name: '四等奖', probability: 0.2 },
        { name: '五等奖', probability: 0.3 },
        { name: '谢谢参与', probability: 0.34 }
      ],
      rotateDeg: 0,
      isDrawing: false
    }
  },
  methods: {
    ...mapMutations(['setPrizeResult']),
    async drawPrize() {
      if (this.isDrawing) return
      this.isDrawing = true
      try {
        const response = await drawPrize()
        if (response.success) {
          this.animateWheel(response.data.prizeIndex)
          this.setPrizeResult(response.data.prizeName)
        } else {
          alert(response.message || '抽奖失败')
          this.isDrawing = false
        }
      } catch (error) {
        console.error('抽奖请求失败:', error)
        alert('网络连接异常，请稍后重试')
        this.isDrawing = false
      }
    },
    animateWheel(prizeIndex) {
      const totalDeg = 360 * 5 + prizeIndex * (360 / this.prizes.length)
      this.rotateDeg += totalDeg
      setTimeout(() => {
        this.$emit('prize-drawn', this.prizes[prizeIndex].name)
        this.isDrawing = false
      }, 3000)
    }
  }
}
</script>

<style scoped>
.wheel-container {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 0 auto 30px;
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 10px solid #ff4444;
  background: conic-gradient(
    #ff4444 0deg 60deg,
    #ff9800 60deg 120deg,
    #ffeb3b 120deg 180deg,
    #4caf50 180deg 240deg,
    #2196f3 240deg 300deg,
    #9c27b0 300deg 360deg
  );
  transition: transform 3s ease-out;
}

.wheel-sector {
  position: absolute;
  width: 100%;
  height: 100%;
  text-align: center;
  transform-origin: center;
  font-weight: bold;
  color: white;
  padding-top: 20px;
}

.sector-text {
  display: block;
  transform: translateY(120px) rotate(30deg);
}

.wheel-pointer {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  background: #ff4444;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.draw-btn {
  padding: 15px 30px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;
  margin-top: 20px;
}

.draw-btn:hover {
  background: #d32f2f;
}

.draw-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>