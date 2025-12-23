// 初始化数据库
db = db.getSiblingDB('lottery_system');

// 创建集合
db.createCollection('users');
db.createCollection('prizes');
db.createCollection('lotteryrecords');

// 创建索引
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

db.prizes.createIndex({ isActive: 1, stock: 1 });
db.prizes.createIndex({ probability: -1 });

db.lotteryrecords.createIndex({ user: 1, spinDate: -1 });
db.lotteryrecords.createIndex({ spinDate: -1 });
db.lotteryrecords.createIndex({ prize: 1 });

// 插入初始奖品数据
const prizes = [
  {
    name: "一等奖 iPhone 14",
    description: "最新款苹果手机",
    type: "physical",
    probability: 0.01,
    stock: 2,
    value: 7999,
    color: "#FFD700",
    icon: "fas fa-mobile-alt",
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "二等奖 AirPods Pro",
    description: "苹果无线耳机",
    type: "physical",
    probability: 0.05,
    stock: 5,
    value: 1999,
    color: "#C0C0C0",
    icon: "fas fa-headphones",
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "三等奖 京东卡 100元",
    description: "京东购物卡",
    type: "coupon",
    probability: 0.10,
    stock: 20,
    value: 100,
    color: "#CD7F32",
    icon: "fas fa-gift-card",
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "四等奖 优惠券 50元",
    description: "全场通用优惠券",
    type: "coupon",
    probability: 0.15,
    stock: 50,
    value: 50,
    color: "#6A5ACD",
    icon: "fas fa-ticket-alt",
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "五等奖 积分 100分",
    description: "可用于兑换商品",
    type: "virtual",
    probability: 0.20,
    stock: 1000,
    value: 10,
    color: "#32CD32",
    icon: "fas fa-coins",
    isActive: true,
    createdAt: new Date()
  },
  {
    name: "幸运奖 会员7天",
    description: "平台会员体验",
    type: "virtual",
    probability: 0.25,
    stock: 500,
    value: 5,
    color: "#87CEEB",
    icon: "fas fa-crown",
    isActive: true,
    createdAt: new Date()
  }
];

db.prizes.insertMany(prizes);

print("数据库初始化完成！");