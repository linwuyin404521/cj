<template>
  <div class="prize-list">
    <div 
      v-for="(prize, index) in prizes"
      :key="index"
      class="prize-item"
      :style="{ borderLeftColor: prize.color }"
    >
      <div class="prize-rank">
        <span class="rank-badge">第{{ index + 1 }}名</span>
      </div>
      
      <div class="prize-icon" :style="{ backgroundColor: prize.color }">
        <i :class="prize.icon"></i>
      </div>
      
      <div class="prize-info">
        <div class="prize-name">{{ prize.name }}</div>
        <div class="prize-value">{{ prize.value }}</div>
      </div>
      
      <div class="prize-probability">
        <div class="probability-value">{{ prize.probability }}%</div>
        <div class="probability-label">中奖概率</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  prizes: {
    type: Array,
    required: true
  }
})
</script>

<style lang="scss" scoped>
.prize-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.prize-item {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 16px;
  border-left: 6px solid #3498db;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
}

.prize-rank {
  .rank-badge {
    background: #2c3e50;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    min-width: 60px;
    display: inline-block;
    text-align: center;
  }
}

.prize-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.prize-info {
  .prize-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 5px;
  }
  
  .prize-value {
    font-size: 0.95rem;
    color: #f39c12;
    font-weight: 500;
  }
}

.prize-probability {
  text-align: center;
  
  .probability-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: #e74c3c;
    margin-bottom: 4px;
  }
  
  .probability-label {
    font-size: 0.85rem;
    color: #7f8c8d;
  }
}
</style>