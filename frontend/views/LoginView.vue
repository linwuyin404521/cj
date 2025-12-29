<template>
  <div class="login-page">
    <Login />
  </div>
</template>

<script>
import Login from '@/components/Login.vue'

export default {
  components: { Login }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}
</style>