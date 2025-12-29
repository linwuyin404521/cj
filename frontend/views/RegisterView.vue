<template>
  <div class="register-page">
    <Register />
  </div>
</template>

<script>
import Register from '@/components/Register.vue'

export default {
  components: { Register }
}
</script>

<style scoped>
.register-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}
</style>