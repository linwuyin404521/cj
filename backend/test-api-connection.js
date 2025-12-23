const axios = require('axios');

async function testAPIConnection() {
  console.log('🔗 测试前后端API对接...\n');
  
  const tests = [
    {
      name: '健康检查',
      method: 'GET',
      url: 'http://localhost:3000/api/health',
      data: null
    },
    {
      name: '用户注册',
      method: 'POST',
      url: 'http://localhost:3000/api/auth/register',
      data: {
        username: `test_${Date.now()}`,
        phone: `138${Date.now().toString().slice(-8)}`,
        email: `test${Date.now()}@example.com`,
        password: '123456'
      }
    },
    {
      name: '用户登录',
      method: 'POST',
      url: 'http://localhost:3000/api/auth/login',
      data: {
        email: '', // 需要动态填充
        password: '123456'
      }
    },
    {
      name: '获取奖品列表',
      method: 'GET',
      url: 'http://localhost:3000/api/lottery/prizes',
      data: null
    }
  ];
  
  let token = '';
  let userEmail = '';
  
  for (const test of tests) {
    console.log(`🧪 测试: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      let response;
      
      if (test.method === 'GET') {
        response = await axios.get(test.url);
      } else if (test.method === 'POST') {
        // 如果是登录测试，需要填充邮箱
        if (test.name === '用户登录' && userEmail) {
          test.data.email = userEmail;
        }
        
        response = await axios.post(test.url, test.data);
        
        // 保存注册的邮箱供登录测试使用
        if (test.name === '用户注册') {
          userEmail = test.data.email;
          token = response.data.token;
          console.log(`   ✅ 注册成功，邮箱: ${userEmail}`);
          console.log(`   🔑 Token: ${token.substring(0, 20)}...`);
        }
        
        // 保存登录的token
        if (test.name === '用户登录') {
          token = response.data.token;
          console.log(`   ✅ 登录成功`);
          console.log(`   🔑 Token: ${token.substring(0, 20)}...`);
        }
      }
      
      console.log(`   ✅ 成功: ${response.data.message || '请求成功'}\n`);
      
    } catch (error) {
      console.error(`   ❌ 失败:`);
      console.error(`      状态码: ${error.response?.status}`);
      console.error(`      错误: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.data) {
        console.error(`      详情:`, JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }
  }
  
  // 测试需要认证的API（如果有token）
  if (token) {
    const authTests = [
      {
        name: '获取用户信息',
        method: 'GET',
        url: 'http://localhost:3000/api/auth/profile'
      },
      {
        name: '抽奖',
        method: 'POST',
        url: 'http://localhost:3000/api/lottery/draw'
      },
      {
        name: '获取抽奖历史',
        method: 'GET',
        url: 'http://localhost:3000/api/lottery/history'
      },
      {
        name: '用户注销',
        method: 'POST',
        url: 'http://localhost:3000/api/auth/logout'
      }
    ];
    
    console.log('🔐 测试需要认证的API...\n');
    
    for (const test of authTests) {
      console.log(`🧪 测试: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      try {
        let response;
        
        if (test.method === 'GET') {
          response = await axios.get(test.url, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (test.method === 'POST') {
          response = await axios.post(test.url, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        console.log(`   ✅ 成功: ${response.data.message || '请求成功'}`);
        
        if (test.name === '抽奖' && response.data.prize) {
          console.log(`   🎁 奖品: ${response.data.prize.name} (${response.data.prize.level})`);
        }
        
        console.log('');
        
      } catch (error) {
        console.error(`   ❌ 失败:`);
        console.error(`      状态码: ${error.response?.status}`);
        console.error(`      错误: ${error.response?.data?.message || error.message}\n`);
      }
    }
  }
  
  console.log('📊 测试完成');
}

// 运行测试
testAPIConnection();