const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // 活动信息
  name: {
    type: String,
    required: [true, '活动名称不能为空'],
    trim: true
  },
  description: String,
  
  // 活动时间
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  
  // 活动状态
  status: {
    type: String,
    enum: ['upcoming', 'active', 'paused', 'ended'],
    default: 'upcoming'
  },
  
  // 抽奖规则
  rules: {
    dailyDrawLimit: {
      type: Number,
      default: 5
    },
    totalDrawLimit: {
      type: Number,
      default: -1 // -1表示无限制
    },
    requirePhone: {
      type: Boolean,
      default: true
    },
    requireRealName: {
      type: Boolean,
      default: false
    },
    intervalSeconds: {
      type: Number,
      default: 3
    }
  },
  
  // 奖品池
  prizePool: [{
    prize: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prize'
    },
    weight: {
      type: Number,
      default: 1
    },
    dailyLimit: Number,
    totalLimit: Number,
    awardedCount: {
      type: Number,
      default: 0
    }
  }],
  
  // 参与用户
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    drawCount: {
      type: Number,
      default: 0
    },
    winCount: {
      type: Number,
      default: 0
    },
    lastDrawTime: Date
  }],
  
  // 统计数据
  stats: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    totalDraws: {
      type: Number,
      default: 0
    },
    totalWins: {
      type: Number,
      default: 0
    }
  },
  
  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 配置
  config: {
    enableRealTimeStats: {
      type: Boolean,
      default: true
    },
    showWinnerList: {
      type: Boolean,
      default: true
    },
    requireShare: {
      type: Boolean,
      default: false
    }
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

// 虚拟字段：是否进行中
activitySchema.virtual('isActive').get(function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime && this.status === 'active';
});

// 检查活动状态
activitySchema.methods.checkStatus = function() {
  const now = new Date();
  
  if (now < this.startTime) {
    this.status = 'upcoming';
  } else if (now > this.endTime) {
    this.status = 'ended';
  } else if (this.status !== 'paused') {
    this.status = 'active';
  }
  
  return this.status;
};

// 获取活动奖品列表
activitySchema.methods.getPrizeList = function() {
  return this.prizePool.map(item => ({
    ...item.prize.toObject(),
    weight: item.weight,
    dailyLimit: item.dailyLimit,
    totalLimit: item.totalLimit,
    awardedCount: item.awardedCount
  }));
};

// 检查用户是否可以抽奖
activitySchema.methods.canUserDraw = function(userId) {
  const now = new Date();
  
  // 检查活动时间
  if (!this.isActive) {
    return { canDraw: false, reason: '活动未开始或已结束' };
  }
  
  // 查找用户参与记录
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    // 检查每日限制
    const lastDrawDate = participant.lastDrawTime ? 
      new Date(participant.lastDrawTime).getDate() : null;
    const today = now.getDate();
    
    if (lastDrawDate === today && participant.drawCount >= this.rules.dailyDrawLimit) {
      return { canDraw: false, reason: '今日抽奖次数已用完' };
    }
    
    // 检查抽奖间隔
    if (participant.lastDrawTime) {
      const timeDiff = now - participant.lastDrawTime;
      if (timeDiff < this.rules.intervalSeconds * 1000) {
        return { canDraw: false, reason: '抽奖过于频繁' };
      }
    }
  }
  
  return { canDraw: true };
};

// 索引
activitySchema.index({ startTime: 1 });
activitySchema.index({ endTime: 1 });
activitySchema.index({ status: 1 });
activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;