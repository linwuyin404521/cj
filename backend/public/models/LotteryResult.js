const mongoose = require('mongoose');

const lotteryResultSchema = new mongoose.Schema({
  // 用户关联
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true  // 添加索引提高查询效率
  },
  
  // 奖品信息
  prizeLevel: {
    type: String,
    required: true,
    enum: ['特等奖', '一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '六等奖', '幸运奖', '参与奖', '谢谢参与']
  },
  
  prizeName: {
    type: String,
    required: true
  },
  
  prizeValue: {
    type: String,
    required: true
  },
  
  // 奖品图片（可选）
  prizeImage: {
    type: String,
    default: ''
  },
  
  // 状态管理
  status: {
    type: String,
    enum: ['unclaimed', 'claimed', 'expired'],
    default: 'unclaimed',
    index: true
  },
  
  claimedAt: {
    type: Date
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 其他信息
  spinMethod: {
    type: String,
    enum: ['normal', 'invite', 'promotion'],
    default: 'normal'
  },
  
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});

// 创建索引
lotteryResultSchema.index({ userId: 1, createdAt: -1 });  // 按用户和时间查询
lotteryResultSchema.index({ status: 1, expiresAt: 1 });   // 按状态和过期时间查询

// 静态方法：获取用户的抽奖统计
lotteryResultSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSpins: { $sum: 1 },
        claimedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
        },
        unclaimedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'unclaimed'] }, 1, 0] }
        },
        expiredCount: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || { totalSpins: 0, claimedCount: 0, unclaimedCount: 0, expiredCount: 0 };
};

// 静态方法：获取最近的中奖记录
lotteryResultSchema.statics.getRecentWinners = async function(limit = 10) {
  return this.find({ 
    prizeLevel: { $nin: ['参与奖', '谢谢参与'] }  // 排除参与奖
  })
  .populate('userId', 'username')  // 关联用户信息
  .sort({ createdAt: -1 })
  .limit(limit);
};

// 实例方法：检查是否过期
lotteryResultSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// 中间件：自动检查过期
lotteryResultSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'unclaimed') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('LotteryResult', lotteryResultSchema);