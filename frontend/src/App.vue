<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 监听路由变化，更新页面标题
watch(
  () => route.name,
  (routeName) => {
    const titles = {
      'login': '登录 - 电商抽奖系统',
      'register': '注册 - 电商抽奖系统',
      'lottery': '幸运大转盘 - 抽奖赢好礼'
    }
    document.title = titles[routeName] || '电商幸运大转盘'
  },
  { immediate: true }
)
</script>

<style lang="scss">
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: 'Poppins', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
</style>