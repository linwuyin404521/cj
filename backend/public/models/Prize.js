const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: [true, '奖品名称不能为空'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    required: [true, '奖品等级不能为空'],
    enum: ['特等奖', '一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '未中奖']
  },
  
  // 概率设置
  probability: {
    type: Number,
    required: [true, '中奖概率不能为空'],
    min: [0, '概率不能小于0'],
    max: [100, '概率不能大于100']
  },
  weight: {
    type: Number,
    default: 1
  },
  
  // 奖品类型
  type: {
    type: String,
    enum: ['virtual', 'physical', 'coupon', 'points'],
    default: 'virtual'
  },
  
  // 奖品数量
  totalQuantity: {
    type: Number,
    default: -1 // -1表示无限
  },
  remainingQuantity: {
    type: Number,
    default: -1
  },
  dailyLimit: {
    type: Number,
    default: -1 // 每日发放限制
  },
  
  // 奖品值
  value: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  
  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock'],
    default: 'active'
  },
  
  // 图片和显示
  imageUrl: String,
  color: {
    type: String,
    default: '#3498db'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 检查奖品是否可发放
prizeSchema.methods.canAward = function() {
  if (this.status !== 'active') {
    return { canAward: false, reason: '奖品已下架' };
  }
  
  if (this.remainingQuantity === 0) {
    return { canAward: false, reason: '奖品已发完' };
  }
  
  return { canAward: true };
};

// 发放奖品
prizeSchema.methods.award = async function() {
  if (this.remainingQuantity > 0) {
    this.remainingQuantity -= 1;
    
    if (this.remainingQuantity === 0) {
      this.status = 'out_of_stock';
    }
    
    await this.save();
  }
  
  return this;
};

// 静态方法：获取所有可用奖品
prizeSchema.statics.getAvailablePrizes = async function() {
  return await this.find({ 
    status: 'active',
    $or: [
      { remainingQuantity: { $gt: 0 } },
      { remainingQuantity: -1 }
    ]
  }).sort({ sortOrder: 1 });
};

// 索引
prizeSchema.index({ level: 1 });
prizeSchema.index({ probability: -1 });
prizeSchema.index({ status: 1 });
prizeSchema.index({ sortOrder: 1 });

const Prize = mongoose.model('Prize', prizeSchema);

module.exports = Prize;