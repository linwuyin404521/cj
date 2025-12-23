const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const endpoints = [
  // 不需要认证的端点
  { method: 'GET', path: '/api/health', auth: false, name: '健康检查' },
  { method: 'POST', path: '/api/auth/register', auth: false, name: '用户注册' },
  { method: 'POST', path: '/api/auth/login', auth: false, name: '用户登录' },
  { method: 'GET', path: '/api/lottery/prizes', auth: false, name: '奖品列表' },
  
  // 需要认证的端点
  { method: 'GET', path: '/api/auth/profile', auth: true, name: '用户信息' },
  { method: 'POST', path: '/api/lottery/draw', auth: true, name: '抽奖' },
  { method: 'GET', path: '/api/lottery/history', auth: true, name: '抽奖历史' },
  { method: 'POST', path: '/api/auth/logout', auth: true, name: '用户注销' },
  
  // 前端可能调用的路径（没有 /api 前缀）
  { method: 'POST', path: '/auth/login', auth: false, name: '用户登录(无前缀)' },
  { method: 'POST', path: '/auth/register', auth: false, name: '用户注册(无前缀)' },
  { method: 'GET', path: '/auth/profile', auth: true, name: '用户信息(无前缀)' },
  { method: 'POST', path: '/lottery/draw', auth: true, name: '抽奖(无前缀)' },
  { method: 'GET', path: '/lottery/history', auth: true, name: '抽奖历史(无前缀)' },
  { method: 'GET', path: '/lottery/prizes', auth: false, name: '奖品列表(无前缀)' },
  { method: 'POST', path: '/auth/logout', auth: true, name: '用户注销(无前缀)' }
];

async function checkEndpoints() {
  console.log('🔍 检查所有API端点...\n');
  
  let token = '';
  const testUser = {
    username: `check_${Date.now()}`,
    phone: `139${Date.now().toString().slice(-8)}`,
    email: `check${Date.now()}@test.com`,
    password: '123456'
  };
  
  for (const endpoint of endpoints) {
    const url = API_BASE + endpoint.path;
    console.log(`测试: ${endpoint.name}`);
    console.log(`方法: ${endpoint.method} ${url}`);
    
    try {
      // 准备请求配置
      const config = {
        method: endpoint.method.toLowerCase(),
        url: url
      };
      
      // 添加请求数据
      if (endpoint.method === 'POST') {
        if (endpoint.path.includes('register')) {
          config.data = testUser;
        } else if (endpoint.path.includes('login')) {
          config.data = { email: testUser.email, password: testUser.password };
        } else {
          config.data = {};
        }
      }
      
      // 添加认证头
      if (endpoint.auth && token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }
      
      const response = await axios(config);
      
      console.log(`✅ 状态: ${response.status} - ${response.data?.message || '成功'}`);
      
      // 保存token
      if (endpoint.path.includes('login') && response.data?.token) {
        token = response.data.token;
        console.log(`🔑 获取到Token: ${token.substring(0, 20)}...`);
      }
      
      // 如果是注册，也获取token
      if (endpoint.path.includes('register') && response.data?.token) {
        token = response.data.token;
        console.log(`🔑 注册后获取Token: ${token.substring(0, 20)}...`);
      }
      
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      if (status === 404) {
        console.log(`❌ 404 - 端点不存在: ${endpoint.path}`);
      } else if (status === 401 && endpoint.auth) {
        console.log(`⚠️  401 - 需要认证 (正常)`);
      } else {
        console.log(`❌ ${status || 'Error'} - ${message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('📋 端点检查完成');
  console.log('建议:');
  console.log('1. 前端调用路径应该包含 /api 前缀');
  console.log('2. 或者后端添加无 /api 前缀的路由');
  console.log('3. 或者修改Vite代理配置');
}

checkEndpoints();