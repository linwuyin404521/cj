// mongodb/init.js
db = db.getSiblingDB('lottery');

// 创建管理员用户
db.createUser({
  user: 'lottery_admin',
  pwd: 'strong_password_here',
  roles: [
    { role: 'readWrite', db: 'lottery' },
    { role: 'dbAdmin', db: 'lottery' }
  ]
});

// 创建集合
db.createCollection('users');
db.createCollection('prizes');
db.createCollection('draw_records');

// 创建索引
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ lastLogin: -1 });

db.prizes.createIndex({ isActive: 1 });
db.prizes.createIndex({ type: 1 });
db.prizes.createIndex({ probability: 1 });

db.draw_records.createIndex({ userId: 1, drawTime: -1 });
db.draw_records.createIndex({ drawTime: -1 });
db.draw_records.createIndex({ prizeId: 1 });

// 初始化测试数据（可选）
const testPrizes = [
  {
    name: "一等奖 iPhone 14",
    description: "最新款苹果手机",
    type: "physical",
    probability: 1,
    quantity: 1,
    awarded: 0,
    value: 8999,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "二等奖 小米平板",
    description: "高性能平板电脑",
    type: "physical",
    probability: 3,
    quantity: 3,
    awarded: 0,
    value: 2999,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "三等奖 京东购物卡",
    description: "500元购物卡",
    type: "coupon",
    probability: 10,
    quantity: 10,
    awarded: 0,
    value: 500,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "四等奖 谢谢参与",
    description: "再接再厉",
    type: "virtual",
    probability: 86,
    quantity: 999999,
    awarded: 0,
    value: 0,
    isActive: true,
    createdAt: new Date()
  }
];

db.prizes.insertMany(testPrizes);

print('✅ 数据库初始化完成！');