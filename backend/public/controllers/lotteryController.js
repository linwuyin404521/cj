//路由控制器-抽奖控制器
const User = require('../models/User');
const Prize = require('../models/Prize');
const DrawRecord = require('../models/DrawRecord');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');
const LotteryAlgorithm = require('../utils/lotteryAlgorithm');

class LotteryController {
  /**
   * 获取奖品列表
   */
  async getPrizeList(req, res) {
    try {
      const prizes = await Prize.find({ 
        status: 'active',
        $or: [
          { remainingQuantity: { $gt: 0 } },
          { remainingQuantity: -1 }
        ]
      })
      .sort({ sortOrder: 1, level: 1 });
      
      // 格式化返回数据
      const formattedPrizes = prizes.map(prize => ({
        id: prize._id,
        name: prize.name,
        description: prize.description,
        level: prize.level,
        probability: prize.probability,
        type: prize.type,
        totalQuantity: prize.totalQuantity,
        remainingQuantity: prize.remainingQuantity,
        value: prize.value,
        points: prize.points,
        color: prize.color,
        imageUrl: prize.imageUrl
      }));
      
      // 计算总概率
      const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
      
      res.status(200).json({
        success: true,
        data: {
          prizes: formattedPrizes,
          totalProbability: totalProbability.toFixed(2),
          count: prizes.length,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('获取奖品列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取奖品列表失败'
      });
    }
  }
  
  /**
   * 抽奖主逻辑
   */
  async drawLottery(req, res) {
    try {
      const { phone, activityId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      logger.info(`抽奖请求: ${phone}`, { ip: ipAddress });
      
      // 查找用户
      let user = await User.findOne({ phone });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '请先保存用户信息'
        });
      }
      
      // 检查用户状态
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '账户已被禁用'
        });
      }
      
      // 检查是否可以抽奖
      const canDrawResult = user.canDraw();
      if (!canDrawResult.canDraw) {
        return res.status(400).json({
          success: false,
          message: canDrawResult.reason
        });
      }
      
      // 检查活动（如果提供了活动ID）
      let activity = null;
      if (activityId) {
        activity = await Activity.findById(activityId);
        if (!activity || !activity.isActive) {
          return res.status(400).json({
            success: false,
            message: '活动不可用'
          });
        }
        
        const activityCheck = activity.canUserDraw(user._id);
        if (!activityCheck.canDraw) {
          return res.status(400).json({
            success: false,
            message: activityCheck.reason
          });
        }
      }
      
      // 获取奖品列表
      let prizes;
      if (activity) {
        // 使用活动奖品池
        prizes = activity.getPrizeList();
      } else {
        // 使用默认奖品池
        prizes = await Prize.getAvailablePrizes();
      }
      
      if (prizes.length === 0) {
        logger.error('奖品池为空');
        return res.status(500).json({
          success: false,
          message: '奖品配置错误'
        });
      }
      
      // 概率衰减（防止频繁中奖）
      const adjustedPrizes = LotteryAlgorithm.probabilityDecay(prizes, {
        recentWins: await this.getRecentWinsCount(user._id)
      });
      
      // 时间分段概率调整
      const finalPrizes = LotteryAlgorithm.timeBasedProbability(adjustedPrizes);
      
      // 使用保底算法
      const lotteryResult = LotteryAlgorithm.guaranteedLottery(finalPrizes, {
        loseStreak: await this.getLoseStreak(user._id),
        recentWins: await this.getRecentWinsCount(user._id)
      });
      
      const selectedPrize = lotteryResult.prize;
      const isGuaranteed = lotteryResult.isGuaranteed;
      
      logger.info(`抽奖结果: ${user.phone} -> ${selectedPrize.level} (${selectedPrize.name})`, {
        userId: user._id,
        prizeId: selectedPrize._id,
        isGuaranteed
      });
      
      // 检查奖品是否可以发放
      const canAwardResult = selectedPrize.canAward ? selectedPrize.canAward() : { canAward: true };
      if (!canAwardResult.canAward) {
        // 如果奖品不可发放，选择未中奖
        const notWinPrize = prizes.find(p => p.level === '未中奖');
        if (notWinPrize) {
          selectedPrize = notWinPrize;
          logger.warn(`奖品不可发放，降级为未中奖: ${canAwardResult.reason}`);
        }
      }
      
      // 更新用户抽奖信息
      user = await user.performDraw();
      
      // 如果是中奖，更新中奖次数
      if (selectedPrize.level !== '未中奖') {
        user.totalWins += 1;
        await user.save();
      }
      
      // 更新连败记录
      if (selectedPrize.level === '未中奖') {
        await this.updateLoseStreak(user._id, true);
      } else {
        await this.updateLoseStreak(user._id, false);
      }
      
      // 创建抽奖记录
      const drawRecord = new DrawRecord({
        user: user._id,
        userName: user.name,
        userPhone: user.phone,
        prize: selectedPrize._id,
        prizeName: selectedPrize.name,
        prizeLevel: selectedPrize.level,
        prizeType: selectedPrize.type,
        ipAddress,
        userAgent: req.get('user-agent'),
        notes: isGuaranteed ? '保底中奖' : undefined
      });
      
      // 如果中奖了，发放奖品
      if (selectedPrize.level !== '未中奖') {
        await drawRecord.award();
        
        // 更新奖品库存
        if (selectedPrize.award) {
          await selectedPrize.award();
        }
        
        // 如果是积分奖品，给用户加积分
        if (selectedPrize.type === 'points' && selectedPrize.points > 0) {
          user.points += selectedPrize.points;
          await user.save();
        }
        
        // 更新活动统计（如果有活动）
        if (activity) {
          activity.stats.totalWins += 1;
          await activity.save();
        }
      }
      
      await drawRecord.save();
      
      // 更新活动参与统计（如果有活动）
      if (activity) {
        await this.updateActivityParticipation(activity, user._id);
        activity.stats.totalDraws += 1;
        await activity.save();
      }
      
      // 返回抽奖结果
      const responseData = {
        prizeId: selectedPrize._id,
        prizeName: selectedPrize.name,
        prizeLevel: selectedPrize.level,
        prizeType: selectedPrize.type,
        drawTime: drawRecord.drawTime,
        recordId: drawRecord._id,
        claimCode: drawRecord.claimCode,
        points: selectedPrize.points || 0,
        value: selectedPrize.value || 0,
        isGuaranteed,
        userStats: {
          todayDraws: user.todayDraws,
          remainingDraws: Math.max(0, 5 - user.todayDraws),
          totalDraws: user.totalDraws,
          totalWins: user.totalWins,
          winRate: user.winRate,
          points: user.points,
          level: user.level
        }
      };
      
      res.status(200).json({
        success: true,
        message: selectedPrize.level === '未中奖' ? '很遗憾，这次没有中奖' : '恭喜中奖！',
        data: responseData
      });
      
    } catch (error) {
      logger.error('抽奖失败:', error);
      res.status(500).json({
        success: false,
        message: '抽奖失败，请稍后重试'
      });
    }
  }
  
  /**
   * 获取用户抽奖统计
   */
  async getUserStats(req, res) {
    try {
      const { phone } = req.params;
      
      const user = await User.findOne({ phone }).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 获取最近的抽奖记录
      const recentRecords = await DrawRecord.find({ user: user._id })
        .populate('prize', 'name type value color')
        .sort({ drawTime: -1 })
        .limit(10);
      
      // 今日统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStats = await DrawRecord.aggregate([
        {
          $match: {
            user: user._id,
            drawTime: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            todayDraws: { $sum: 1 },
            todayWins: {
              $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
            }
          }
        }
      ]);
      
      // 获取奖品统计
      const prizeStats = await DrawRecord.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: '$prizeLevel',
            count: { $sum: 1 },
            totalValue: { $sum: '$prize.value' }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      // 获取连胜/连败信息
      const streakInfo = await this.getStreakInfo(user._id);
      
      res.status(200).json({
        success: true,
        data: {
          user,
          recentRecords,
          todayStats: todayStats[0] || { todayDraws: 0, todayWins: 0 },
          prizeStats,
          streakInfo,
          summary: {
            totalDraws: user.totalDraws,
            totalWins: user.totalWins,
            winRate: user.winRate,
            points: user.points,
            level: user.level,
            daysActive: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24))
          }
        }
      });
      
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户统计失败'
      });
    }
  }
  
  /**
   * 获取中奖记录
   */
  async getWinners(req, res) {
    try {
      const { limit = 50, level, date } = req.query;
      
      // 构建查询条件
      const query = {
        prizeLevel: { $ne: '未中奖' },
        status: { $in: ['awarded', 'claimed'] }
      };
      
      if (level) {
        query.prizeLevel = level;
      }
      
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.drawTime = { $gte: startDate, $lte: endDate };
      }
      
      const winners = await DrawRecord.find(query)
        .populate('user', 'name phone')
        .populate('prize', 'name value color')
        .sort({ drawTime: -1 })
        .limit(parseInt(limit));
      
      // 格式化返回数据
      const formattedWinners = winners.map(record => ({
        id: record._id,
        user: record.user ? {
          name: record.user.name,
          phone: record.user.phone
        } : {
          name: record.userName,
          phone: record.userPhone
        },
        prize: {
          name: record.prizeName,
          level: record.prizeLevel,
          value: record.prize ? record.prize.value : 0
        },
        drawTime: record.drawTime,
        status: record.status,
        claimCode: record.claimCode
      }));
      
      res.status(200).json({
        success: true,
        data: {
          winners: formattedWinners,
          count: winners.length,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('获取中奖记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取中奖记录失败'
      });
    }
  }
  
  /**
   * 获取实时统计
   */
  async getRealTimeStats(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 并发获取各种统计数据
      const [totalStats, todayStats, hourlyStats, prizeDistribution] = await Promise.all([
        // 总统计
        DrawRecord.aggregate([
          {
            $group: {
              _id: null,
              totalDraws: { $sum: 1 },
              totalWins: { 
                $sum: { 
                  $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] 
                }
              },
              totalUsers: { $addToSet: '$user' }
            }
          },
          {
            $project: {
              totalDraws: 1,
              totalWins: 1,
              totalUsers: { $size: '$totalUsers' },
              winRate: {
                $cond: [
                  { $eq: ['$totalDraws', 0] },
                  0,
                  { $multiply: [{ $divide: ['$totalWins', '$totalDraws'] }, 100] }
                ]
              }
            }
          }
        ]),
        
        // 今日统计
        DrawRecord.aggregate([
          {
            $match: {
              drawTime: { $gte: today }
            }
          },
          {
            $group: {
              _id: null,
              todayDraws: { $sum: 1 },
              todayWins: { 
                $sum: { 
                  $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] 
                }
              },
              todayUsers: { $addToSet: '$user' }
            }
          }
        ]),
        
        // 小时统计（最近24小时）
        DrawRecord.aggregate([
          {
            $match: {
              drawTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: { $hour: '$drawTime' },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        
        // 奖品分布统计
        DrawRecord.aggregate([
          {
            $group: {
              _id: '$prizeLevel',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ])
      ]);
      
      // 获取活跃用户数
      const activeUsers = await User.countDocuments({ status: 'active' });
      
      res.status(200).json({
        success: true,
        data: {
          total: totalStats[0] || { 
            totalDraws: 0, 
            totalWins: 0, 
            totalUsers: 0, 
            winRate: 0 
          },
          today: todayStats[0] || { 
            todayDraws: 0, 
            todayWins: 0, 
            todayUsers: 0 
          },
          hourlyStats,
          prizeDistribution,
          activeUsers,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('获取实时统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取实时统计失败'
      });
    }
  }
  
  /**
   * 获取活动列表
   */
  async getActivities(req, res) {
    try {
      const activities = await Activity.find({
        status: { $in: ['upcoming', 'active'] },
        endTime: { $gte: new Date() }
      })
      .sort({ startTime: 1 })
      .limit(10);
      
      res.status(200).json({
        success: true,
        data: {
          activities,
          count: activities.length
        }
      });
      
    } catch (error) {
      logger.error('获取活动列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活动列表失败'
      });
    }
  }
  
  /**
   * 获取活动详情
   */
  async getActivityDetails(req, res) {
    try {
      const { id } = req.params;
      
      const activity = await Activity.findById(id)
        .populate('prizePool.prize')
        .populate('participants.user', 'name phone');
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }
      
      res.status(200).json({
        success: true,
        data: activity
      });
      
    } catch (error) {
      logger.error('获取活动详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活动详情失败'
      });
    }
  }
  
  /**
   * 领取奖品
   */
  async claimPrize(req, res) {
    try {
      const { recordId } = req.params;
      const { method, details } = req.body;
      const user = req.user;
      
      const record = await DrawRecord.findById(recordId);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '抽奖记录不存在'
        });
      }
      
      // 检查权限
      if (record.user.toString() !== user._id.toString() && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权领取此奖品'
        });
      }
      
      // 检查状态
      if (record.status !== 'awarded') {
        return res.status(400).json({
          success: false,
          message: '奖品状态不可领取'
        });
      }
      
      // 检查是否过期
      if (record.isExpired) {
        record.status = 'expired';
        await record.save();
        return res.status(400).json({
          success: false,
          message: '奖品已过期'
        });
      }
      
      // 领取奖品
      await record.claim(method, details);
      
      logger.info(`奖品领取成功: ${recordId}`, {
        userId: user._id,
        method,
        prizeName: record.prizeName
      });
      
      res.status(200).json({
        success: true,
        message: '奖品领取成功',
        data: {
          recordId: record._id,
          prizeName: record.prizeName,
          claimTime: record.claimTime,
          claimMethod: record.claimMethod
        }
      });
      
    } catch (error) {
      logger.error('领取奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '领取奖品失败'
      });
    }
  }
  
  /**
   * 获取当前用户的抽奖历史
   */
  async getUserHistory(req, res) {
    try {
      const user = req.user;
      const { page = 1, limit = 20 } = req.query;
      
      const records = await DrawRecord.find({ user: user._id })
        .populate('prize', 'name type value color')
        .sort({ drawTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      const total = await DrawRecord.countDocuments({ user: user._id });
      
      res.status(200).json({
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('获取用户历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取抽奖历史失败'
      });
    }
  }
  
  /**
   * 辅助方法：获取用户近期中奖次数
   */
  async getRecentWinsCount(userId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await DrawRecord.countDocuments({
      user: userId,
      prizeLevel: { $ne: '未中奖' },
      drawTime: { $gte: oneDayAgo }
    });
    return count;
  }
  
  /**
   * 辅助方法：获取用户连败记录
   */
  async getLoseStreak(userId) {
    // 获取最近10次抽奖记录
    const recentRecords = await DrawRecord.find({ user: userId })
      .sort({ drawTime: -1 })
      .limit(10);
    
    let loseStreak = 0;
    for (const record of recentRecords) {
      if (record.prizeLevel === '未中奖') {
        loseStreak++;
      } else {
        break;
      }
    }
    
    return loseStreak;
  }
  
  /**
   * 辅助方法：更新连败记录
   */
  async updateLoseStreak(userId, isLose) {
    // 在实际项目中，这里可以将连败记录存储到Redis或数据库
    // 这里简化处理，只记录日志
    if (isLose) {
      logger.debug(`用户 ${userId} 连败记录更新`);
    }
  }
  
  /**
   * 辅助方法：获取连胜/连败信息
   */
  async getStreakInfo(userId) {
    const recentRecords = await DrawRecord.find({ user: userId })
      .sort({ drawTime: -1 })
      .limit(20);
    
    let currentStreak = 0;
    let isWinningStreak = null;
    let maxWinningStreak = 0;
    let maxLosingStreak = 0;
    let currentWinningStreak = 0;
    let currentLosingStreak = 0;
    
    for (const record of recentRecords) {
      const isWin = record.prizeLevel !== '未中奖';
      
      if (isWinningStreak === null) {
        isWinningStreak = isWin;
        currentStreak = 1;
      } else if (isWinningStreak === isWin) {
        currentStreak++;
      } else {
        break;
      }
      
      if (isWin) {
        currentWinningStreak++;
        currentLosingStreak = 0;
        maxWinningStreak = Math.max(maxWinningStreak, currentWinningStreak);
      } else {
        currentLosingStreak++;
        currentWinningStreak = 0;
        maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
      }
    }
    
    return {
      currentStreak,
      isWinningStreak,
      maxWinningStreak,
      maxLosingStreak,
      recentDraws: recentRecords.length
    };
  }
  
  /**
   * 辅助方法：更新活动参与记录
   */
  async updateActivityParticipation(activity, userId) {
    const participantIndex = activity.participants.findIndex(
      p => p.user.toString() === userId.toString()
    );
    
    if (participantIndex >= 0) {
      activity.participants[participantIndex].drawCount += 1;
      activity.participants[participantIndex].lastDrawTime = new Date();
    } else {
      activity.participants.push({
        user: userId,
        drawCount: 1,
        winCount: 0,
        lastDrawTime: new Date()
      });
      activity.stats.totalParticipants += 1;
    }
    
    await activity.save();
  }
}

module.exports = new LotteryController();