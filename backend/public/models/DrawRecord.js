//数据模型-抽奖记录模型
const mongoose = require('mongoose');

const drawRecordSchema = new mongoose.Schema({
  // 用户信息
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: String,
  userPhone: String,
  
  // 奖品信息
  prize: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prize',
    required: true
  },
  prizeName: {
    type: String,
    required: true
  },
  prizeLevel: {
    type: String,
    required: true
  },
  prizeType: {
    type: String,
    enum: ['virtual', 'physical', 'coupon', 'points']
  },
  
  // 抽奖信息
  drawTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  
  // 状态信息
  status: {
    type: String,
    enum: ['pending', 'awarded', 'claimed', 'expired', 'cancelled'],
    default: 'pending'
  },
  awardTime: Date,
  claimTime: Date,
  expireTime: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
  },
  
  // 领取信息
  claimCode: {
    type: String,
    unique: true,
    sparse: true
  },
  claimMethod: String,
  claimDetails: mongoose.Schema.Types.Mixed,
  
  // 备注
  notes: String,
  
  // 审核信息
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewTime: Date,
  reviewNotes: String
}, {
  timestamps: true
});

// 虚拟字段：是否过期
drawRecordSchema.virtual('isExpired').get(function() {
  return this.expireTime && new Date() > this.expireTime;
});

// 虚拟字段：是否可领取
drawRecordSchema.virtual('canClaim').get(function() {
  return this.status === 'awarded' && !this.isExpired;
});

// 发放奖品
drawRecordSchema.methods.award = async function() {
  this.status = 'awarded';
  this.awardTime = new Date();
  
  // 生成领取码（如果是实物奖品）
  if (this.prizeType === 'physical' || this.prizeType === 'coupon') {
    this.claimCode = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  }
  
  await this.save();
  return this;
};

// 领取奖品
drawRecordSchema.methods.claim = async function(method, details) {
  if (this.status !== 'awarded') {
    throw new Error('奖品状态不可领取');
  }
  
  if (this.isExpired) {
    this.status = 'expired';
    await this.save();
    throw new Error('奖品已过期');
  }
  
  this.status = 'claimed';
  this.claimTime = new Date();
  this.claimMethod = method;
  this.claimDetails = details;
  
  await this.save();
  return this;
};

// 静态方法：统计用户中奖情况
drawRecordSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$prizeLevel',
        count: { $sum: 1 },
        totalValue: { $sum: '$prize.value' }
      }
    }
  ]);
  
  return stats;
};

// 索引
drawRecordSchema.index({ user: 1, drawTime: -1 });
drawRecordSchema.index({ prizeLevel: 1 });
drawRecordSchema.index({ status: 1 });
drawRecordSchema.index({ claimCode: 1 });
drawRecordSchema.index({ drawTime: -1 });
drawRecordSchema.index({ userPhone: 1 });

const DrawRecord = mongoose.model('DrawRecord', drawRecordSchema);

module.exports = DrawRecord;