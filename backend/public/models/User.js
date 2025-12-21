//数据模型-用户模型
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: [true, '姓名不能为空'],
    trim: true,
    minlength: [2, '姓名至少2个字符'],
    maxlength: [50, '姓名最多50个字符']
  },
  phone: {
    type: String,
    required: [true, '手机号不能为空'],
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^1[3-9]\d{9}$/.test(v);
      },
      message: '请输入有效的手机号'
    }
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: '请输入有效的邮箱地址'
    }
  },
  
  // 账户信息
  password: {
    type: String,
    minlength: [6, '密码至少6个字符'],
    select: false // 查询时不返回
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  
  // 抽奖相关信息
  totalDraws: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  todayDraws: {
    type: Number,
    default: 0
  },
  lastDrawTime: Date,
  
  // 积分系统
  points: {
    type: Number,
    default: 0
  },
  level: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'diamond'],
    default: 'bronze'
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：中奖率
userSchema.virtual('winRate').get(function() {
  return this.totalDraws > 0 ? (this.totalWins / this.totalDraws * 100).toFixed(2) : 0;
});

// 加密密码中间件
userSchema.pre('save', async function(next) {
  // 只在密码被修改时才加密
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// 重置今日抽奖次数（每天执行）
userSchema.methods.resetDailyDraws = function() {
  this.todayDraws = 0;
  return this.save();
};

// 检查是否可以抽奖
userSchema.methods.canDraw = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 检查今日抽奖次数
  if (this.todayDraws >= 5) {
    return { canDraw: false, reason: '今日抽奖次数已用完' };
  }
  
  // 检查抽奖间隔
  if (this.lastDrawTime) {
    const timeDiff = now - this.lastDrawTime;
    if (timeDiff < 3000) { // 3秒间隔
      return { canDraw: false, reason: '抽奖过于频繁，请稍后再试' };
    }
  }
  
  return { canDraw: true };
};

// 执行抽奖
userSchema.methods.performDraw = async function() {
  const now = new Date();
  this.todayDraws += 1;
  this.totalDraws += 1;
  this.lastDrawTime = now;
  
  // 重置每日抽奖次数（如果过了一天）
  const lastDrawDate = this.lastDrawTime ? new Date(this.lastDrawTime).getDate() : null;
  if (lastDrawDate && lastDrawDate !== now.getDate()) {
    this.todayDraws = 1;
  }
  
  await this.save();
  return this;
};

// 索引
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ points: -1 });
userSchema.index({ totalWins: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;