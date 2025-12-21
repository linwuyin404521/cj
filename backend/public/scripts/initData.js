//数据初始化脚本-初始化数据
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Prize = require('../models/Prize');

// 奖品数据
const initialPrizes = [
  {
    name: '特等奖：iPhone 15 Pro',
    description: '最新款苹果手机',
    level: '特等奖',
    probability: 0.5,
    type: 'physical',
    totalQuantity: 1,
    remainingQuantity: 1,
    value: 8999,
    color: '#FFD700',
    sortOrder: 1
  },
  {
    name: '一等奖：iPad Air',
    description: '苹果平板电脑',
    level: '一等奖',
    probability: 2,
    type: 'physical',
    totalQuantity: 3,
    remainingQuantity: 3,
    value: 4799,
    color: '#C0C0C0',
    sortOrder: 2
  },
  {
    name: '二等奖：AirPods Pro',
    description: '苹果无线耳机',
    level: '二等奖',
    probability: 5,
    type: 'physical',
    totalQuantity: 10,
    remainingQuantity: 10,
    value: 1899,
    color: '#CD7F32',
    sortOrder: 3
  },
  {
    name: '三等奖：智能手表',
    description: '运动智能手表',
    level: '三等奖',
    probability: 10,
    type: 'physical',
    totalQuantity: 20,
    remainingQuantity: 20,
    value: 999,
    color: '#3498db',
    sortOrder: 4
  },
  {
    name: '四等奖：蓝牙音箱',
    description: '便携式蓝牙音箱',
    level: '四等奖',
    probability: 15,
    type: 'physical',
    totalQuantity: 50,
    remainingQuantity: 50,
    value: 299,
    color: '#2ecc71',
    sortOrder: 5
  },
  {
    name: '五等奖：充电宝',
    description: '10000mAh充电宝',
    level: '五等奖',
    probability: 25,
    type: 'physical',
    totalQuantity: 100,
    remainingQuantity: 100,
    value: 99,
    color: '#9b59b6',
    sortOrder: 6
  },
  {
    name: '100积分',
    description: '奖励100积分',
    level: '积分奖',
    probability: 10,
    type: 'points',
    totalQuantity: -1,
    remainingQuantity: -1,
    points: 100,
    color: '#e74c3c',
    sortOrder: 7
  },
  {
    name: '感谢参与',
    description: '谢谢参与',
    level: '未中奖',
    probability: 32.5,
    type: 'virtual',
    totalQuantity: -1,
    remainingQuantity: -1,
    value: 0,
    color: '#95a5a6',
    sortOrder: 8
  }
];

// 测试用户
const testUsers = [
  {
    name: '测试用户1',
    phone: '13800138001',
    email: 'test1@example.com',
    password: '123456'
  },
  {
    name: '测试用户2',
    phone: '13800138002',
    email: 'test2@example.com',
    password: '123456'
  },
  {
    name: '管理员',
    phone: '13800138000',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  }
];

async function initDatabase() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ 数据库连接成功');
    
    // 清空现有数据
    await User.deleteMany({});
    await Prize.deleteMany({});
    
    console.log('🗑️  已清空现有数据');
    
    // 创建奖品
    const createdPrizes = await Prize.insertMany(initialPrizes);
    console.log(`🎁 已创建 ${createdPrizes.length} 个奖品`);
    
    // 创建用户
    const createdUsers = await User.insertMany(testUsers);
    console.log(`👥 已创建 ${createdUsers.length} 个用户`);
    
    // 生成一些测试抽奖记录
    if (process.env.NODE_ENV !== 'production') {
      await generateTestRecords(createdUsers, createdPrizes);
    }
    
    console.log('✨ 数据库初始化完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

async function generateTestRecords(users, prizes) {
  const DrawRecord = require('../models/DrawRecord');
  await DrawRecord.deleteMany({});
  
  const records = [];
  const notWinPrize = prizes.find(p => p.level === '未中奖');
  
  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const prize = Math.random() > 0.7 ? 
      prizes[Math.floor(Math.random() * (prizes.length - 1))] : 
      notWinPrize;
    
    const drawTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    records.push({
      user: user._id,
      userName: user.name,
      userPhone: user.phone,
      prize: prize._id,
      prizeName: prize.name,
      prizeLevel: prize.level,
      prizeType: prize.type,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (测试)',
      drawTime,
      status: prize.level === '未中奖' ? 'pending' : 'awarded'
    });
  }
  
  await DrawRecord.insertMany(records);
  console.log(`📝 已生成 ${records.length} 条测试抽奖记录`);
}

// 执行初始化
if (require.main === module) {
  initDatabase();
}