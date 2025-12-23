import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8080,
    proxy: {
      // 代理所有以 /api 开头的请求到后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      // 同时代理没有 /api 前缀的请求（如果前端没有加 /api 前缀）
      '/auth': {
        target: 'http://localhost:3000/api', // 注意这里指向 /api
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/lottery': {
        target: 'http://localhost:3000/api', // 注意这里指向 /api
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})