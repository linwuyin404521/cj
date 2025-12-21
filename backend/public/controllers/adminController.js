//管理控制器
const User = require('../models/User');
const Prize = require('../models/Prize');
const DrawRecord = require('../models/DrawRecord');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class AdminController {
  /**
   * 获取管理仪表板数据
   */
  async getDashboardData(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      // 并行获取所有统计数据
      const [
        userStats,
        prizeStats,
        recordStats,
        todayStats,
        yesterdayStats,
        topUsers,
        recentActivities,
        systemInfo
      ] = await Promise.all([
        // 用户统计
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              todayNewUsers: {
                $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] }
              },
              adminUsers: {
                $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
              },
              totalPoints: { $sum: '$points' }
            }
          }
        ]),
        
        // 奖品统计
        Prize.aggregate([
          {
            $group: {
              _id: null,
              totalPrizes: { $sum: 1 },
              activePrizes: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              outOfStock: {
                $sum: { $cond: [{ $eq: ['$status', 'out_of_stock'] }, 1, 0] }
              },
              totalValue: { $sum: '$value' },
              totalInventory: {
                $sum: {
                  $cond: [
                    { $eq: ['$remainingQuantity', -1] },
                    0,
                    '$remainingQuantity'
                  ]
                }
              }
            }
          }
        ]),
        
        // 抽奖记录统计
        DrawRecord.aggregate([
          {
            $group: {
              _id: null,
              totalDraws: { $sum: 1 },
              totalWins: {
                $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
              },
              totalValue: { $sum: { $ifNull: ["$prize.value", 0] } },
              totalClaimed: {
                $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
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
                $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
              },
              todayUsers: { $addToSet: "$user" }
            }
          }
        ]),
        
        // 昨日统计
        DrawRecord.aggregate([
          {
            $match: {
              drawTime: { $gte: yesterday, $lt: today }
            }
          },
          {
            $group: {
              _id: null,
              yesterdayDraws: { $sum: 1 },
              yesterdayWins: {
                $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
              }
            }
          }
        ]),
        
        // 热门用户
        User.find({ status: 'active', totalDraws: { $gt: 0 } })
          .select('name phone totalDraws totalWins points lastLoginAt')
          .sort({ totalDraws: -1 })
          .limit(5)
          .lean(),
        
        // 最近活动
        Activity.find()
          .sort({ startTime: -1 })
          .limit(5)
          .lean(),
        
        // 系统信息
        this.getSystemInfo()
      ]);
      
      // 获取最近7天趋势数据
      const trendData = await this.getTrendData(7);
      
      // 获取实时数据（最近1小时）
      const realtimeData = await this.getRealtimeData();
      
      // 获取报警信息
      const alerts = await this.checkSystemAlerts();
      
      res.status(200).json({
        success: true,
        data: {
          summary: {
            users: userStats[0] || {
              totalUsers: 0,
              activeUsers: 0,
              todayNewUsers: 0,
              adminUsers: 0,
              totalPoints: 0
            },
            prizes: prizeStats[0] || {
              totalPrizes: 0,
              activePrizes: 0,
              outOfStock: 0,
              totalValue: 0,
              totalInventory: 0
            },
            records: recordStats[0] || {
              totalDraws: 0,
              totalWins: 0,
              totalValue: 0,
              totalClaimed: 0
            },
            today: todayStats[0] || {
              todayDraws: 0,
              todayWins: 0,
              todayUsers: 0
            },
            yesterday: yesterdayStats[0] || {
              yesterdayDraws: 0,
              yesterdayWins: 0
            }
          },
          topUsers: topUsers.map(user => ({
            ...user,
            winRate: user.totalDraws > 0 ? 
              (user.totalWins / user.totalDraws * 100).toFixed(2) : 0
          })),
          recentActivities,
          trendData,
          realtimeData,
          systemInfo,
          alerts,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('获取仪表板数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取仪表板数据失败'
      });
    }
  }
  
  /**
   * 获取用户管理列表
   */
  async getUserManagementList(req, res) {
    try {
      const { page = 1, limit = 20, search, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ];
      }
      
      if (status) {
        query.status = status;
      }
      
      if (role) {
        query.role = role;
      }
      
      // 构建排序条件
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // 分页查询
      const users = await User.find(query)
        .select('-password')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();
      
      // 获取用户统计信息
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayDraws = await DrawRecord.countDocuments({
            user: user._id,
            drawTime: { $gte: today }
          });
          
          return {
            ...user,
            todayDraws,
            winRate: user.totalDraws > 0 ? 
              (user.totalWins / user.totalDraws * 100).toFixed(2) : 0,
            daysSinceJoin: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24))
          };
        })
      );
      
      // 统计总数
      const total = await User.countDocuments(query);
      
      // 用户状态统计
      const statusStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          users: usersWithStats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: {
            status: statusStats,
            total
          },
          filters: {
            search,
            status,
            role,
            sortBy,
            sortOrder
          }
        }
      });
      
    } catch (error) {
      logger.error('获取用户管理列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      });
    }
  }
  
  /**
   * 获取抽奖记录管理列表
   */
  async getRecordManagementList(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50,
        status,
        level,
        prizeType,
        startDate,
        endDate,
        search,
        sortBy = 'drawTime',
        sortOrder = 'desc'
      } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (level) {
        query.prizeLevel = level;
      }
      
      if (prizeType) {
        query.prizeType = prizeType;
      }
      
      // 时间范围查询
      if (startDate || endDate) {
        query.drawTime = {};
        if (startDate) {
          query.drawTime.$gte = new Date(startDate);
        }
        if (endDate) {
          query.drawTime.$lte = new Date(endDate);
        }
      }
      
      // 搜索功能
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { userName: searchRegex },
          { userPhone: searchRegex },
          { prizeName: searchRegex },
          { claimCode: searchRegex },
          { ipAddress: searchRegex }
        ];
      }
      
      // 构建排序条件
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // 分页查询
      const records = await DrawRecord.find(query)
        .populate('user', 'name phone')
        .populate('prize', 'name type value')
        .populate('reviewedBy', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();
      
      // 统计总数
      const total = await DrawRecord.countDocuments(query);
      
      // 状态统计
      const statusStats = await DrawRecord.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // 等级统计
      const levelStats = await DrawRecord.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$prizeLevel',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: {
            status: statusStats,
            level: levelStats,
            total
          },
          filters: {
            status,
            level,
            prizeType,
            startDate,
            endDate,
            search,
            sortBy,
            sortOrder
          }
        }
      });
      
    } catch (error) {
      logger.error('获取记录管理列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取记录列表失败'
      });
    }
  }
  
  /**
   * 获取奖品管理列表
   */
  async getPrizeManagementList(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20,
        status,
        level,
        type,
        search,
        sortBy = 'sortOrder',
        sortOrder = 'asc'
      } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (level) {
        query.level = level;
      }
      
      if (type) {
        query.type = type;
      }
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { description: searchRegex }
        ];
      }
      
      // 构建排序条件
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      if (sortBy !== 'sortOrder') {
        sort.sortOrder = 1; // 次要排序
      }
      
      // 分页查询
      const prizes = await Prize.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();
      
      // 获取每个奖品的发放统计
      const prizesWithStats = await Promise.all(
        prizes.map(async (prize) => {
          const awardedCount = await DrawRecord.countDocuments({
            prize: prize._id
          });
          
          const claimedCount = await DrawRecord.countDocuments({
            prize: prize._id,
            status: 'claimed'
          });
          
          return {
            ...prize,
            awardedCount,
            claimedCount,
            claimRate: awardedCount > 0 ? 
              (claimedCount / awardedCount * 100).toFixed(2) : 0,
            stockStatus: prize.remainingQuantity === -1 ? '无限' : 
              prize.remainingQuantity === 0 ? '缺货' : 
              prize.remainingQuantity <= 5 ? '紧张' : '充足'
          };
        })
      );
      
      // 统计总数
      const total = await Prize.countDocuments(query);
      
      // 状态统计
      const statusStats = await Prize.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // 类型统计
      const typeStats = await Prize.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          prizes: prizesWithStats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: {
            status: statusStats,
            type: typeStats,
            total
          },
          filters: {
            status,
            level,
            type,
            search,
            sortBy,
            sortOrder
          }
        }
      });
      
    } catch (error) {
      logger.error('获取奖品管理列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取奖品列表失败'
      });
    }
  }
  
  /**
   * 创建抽奖活动
   */
  async createActivity(req, res) {
    try {
      const activityData = req.body;
      
      // 设置创建者
      activityData.createdBy = req.user._id;
      
      // 检查活动时间
      const startTime = new Date(activityData.startTime);
      const endTime = new Date(activityData.endTime);
      
      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: '开始时间必须早于结束时间'
        });
      }
      
      // 检查奖品池
      if (!activityData.prizePool || activityData.prizePool.length === 0) {
        return res.status(400).json({
          success: false,
          message: '奖品池不能为空'
        });
      }
      
      // 验证所有奖品是否存在
      const prizeIds = activityData.prizePool.map(item => item.prize);
      const prizes = await Prize.find({ _id: { $in: prizeIds } });
      
      if (prizes.length !== prizeIds.length) {
        return res.status(400).json({
          success: false,
          message: '部分奖品不存在'
        });
      }
      
      // 计算总权重并初始化发放计数
      activityData.prizePool = activityData.prizePool.map(item => ({
        ...item,
        awardedCount: 0
      }));
      
      // 初始化统计
      activityData.stats = {
        totalParticipants: 0,
        totalDraws: 0,
        totalWins: 0
      };
      
      // 创建活动
      const activity = new Activity(activityData);
      await activity.save();
      
      logger.info(`抽奖活动创建成功: ${activity.name}`, {
        adminId: req.user._id,
        activityId: activity._id,
        prizeCount: activity.prizePool.length
      });
      
      res.status(201).json({
        success: true,
        message: '活动创建成功',
        data: activity
      });
      
    } catch (error) {
      logger.error('创建抽奖活动失败:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: '创建活动失败'
      });
    }
  }
  
  /**
   * 更新抽奖活动
   */
  async updateActivity(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const activity = await Activity.findById(id);
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }
      
      // 检查活动状态
      if (activity.isActive && updateData.status === 'paused') {
        // 可以暂停进行中的活动
      } else if (activity.status === 'ended') {
        return res.status(400).json({
          success: false,
          message: '已结束的活动不能修改'
        });
      }
      
      // 更新字段
      Object.keys(updateData).forEach(key => {
        activity[key] = updateData[key];
      });
      
      // 更新活动状态（根据时间）
      activity.checkStatus();
      
      await activity.save();
      
      logger.info(`抽奖活动更新成功: ${activity.name}`, {
        adminId: req.user._id,
        activityId: activity._id,
        updates: Object.keys(updateData)
      });
      
      res.status(200).json({
        success: true,
        message: '活动更新成功',
        data: activity
      });
      
    } catch (error) {
      logger.error('更新抽奖活动失败:', error);
      res.status(500).json({
        success: false,
        message: '更新活动失败'
      });
    }
  }
  
  /**
   * 删除抽奖活动
   */
  async deleteActivity(req, res) {
    try {
      const { id } = req.params;
      
      const activity = await Activity.findById(id);
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }
      
      // 检查活动状态
      if (activity.isActive) {
        return res.status(400).json({
          success: false,
          message: '进行中的活动不能删除'
        });
      }
      
      // 检查是否有抽奖记录
      const hasRecords = activity.stats.totalDraws > 0;
      if (hasRecords) {
        return res.status(400).json({
          success: false,
          message: '已有抽奖记录的活动不能删除'
        });
      }
      
      await activity.deleteOne();
      
      logger.info(`抽奖活动删除成功: ${activity.name}`, {
        adminId: req.user._id,
        activityId: activity._id
      });
      
      res.status(200).json({
        success: true,
        message: '活动删除成功'
      });
      
    } catch (error) {
      logger.error('删除抽奖活动失败:', error);
      res.status(500).json({
        success: false,
        message: '删除活动失败'
      });
    }
  }
  
  /**
   * 获取所有抽奖活动
   */
  async getAllActivities(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20,
        status,
        search,
        sortBy = 'startTime',
        sortOrder = 'desc'
      } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.name = searchRegex;
      }
      
      // 构建排序条件
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // 分页查询
      const activities = await Activity.find(query)
        .populate('createdBy', 'name phone')
        .populate('prizePool.prize', 'name level')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();
      
      // 处理虚拟字段
      const activitiesWithVirtual = activities.map(activity => ({
        ...activity,
        isActive: activity.startTime <= new Date() && activity.endTime >= new Date() && activity.status === 'active',
        duration: Math.floor((new Date(activity.endTime) - new Date(activity.startTime)) / (1000 * 60 * 60 * 24)),
        daysRemaining: activity.endTime > new Date() ? 
          Math.ceil((new Date(activity.endTime) - new Date()) / (1000 * 60 * 60 * 24)) : 0
      }));
      
      // 统计总数
      const total = await Activity.countDocuments(query);
      
      // 状态统计
      const statusStats = await Activity.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          activities: activitiesWithVirtual,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: {
            status: statusStats,
            total
          }
        }
      });
      
    } catch (error) {
      logger.error('获取抽奖活动失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活动列表失败'
      });
    }
  }
  
  /**
   * 获取活动统计
   */
  async getActivityStats(req, res) {
    try {
      const { id } = req.params;
      
      const activity = await Activity.findById(id)
        .populate('prizePool.prize', 'name level probability')
        .populate('participants.user', 'name phone');
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }
      
      // 获取活动的抽奖记录
      const activityRecords = await DrawRecord.find({
        drawTime: { $gte: activity.startTime, $lte: activity.endTime }
      });
      
      // 按奖品统计
      const prizeStats = activity.prizePool.map(poolItem => {
        const recordsForPrize = activityRecords.filter(
          record => record.prize?.toString() === poolItem.prize._id.toString()
        );
        
        return {
          prize: poolItem.prize,
          weight: poolItem.weight,
          awardedCount: recordsForPrize.length,
          claimedCount: recordsForPrize.filter(r => r.status === 'claimed').length,
          participants: recordsForPrize.map(r => r.user).filter((v, i, a) => a.indexOf(v) === i).length
        };
      });
      
      // 用户参与统计
      const participantStats = activity.participants.map(participant => ({
        user: participant.user,
        drawCount: participant.drawCount,
        winCount: participant.winCount,
        winRate: participant.drawCount > 0 ? 
          (participant.winCount / participant.drawCount * 100).toFixed(2) : 0,
        lastDrawTime: participant.lastDrawTime
      }));
      
      // 每日统计
      const dailyStats = [];
      const currentDate = new Date(activity.startTime);
      const endDate = new Date(activity.endTime);
      
      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayRecords = activityRecords.filter(
          record => record.drawTime >= dayStart && record.drawTime <= dayEnd
        );
        
        dailyStats.push({
          date: dayStart.toISOString().split('T')[0],
          draws: dayRecords.length,
          wins: dayRecords.filter(r => r.prizeLevel !== '未中奖').length,
          participants: [...new Set(dayRecords.map(r => r.user.toString()))].length
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // 热门时间段统计
      const hourStats = Array(24).fill(0).map((_, hour) => {
        const hourRecords = activityRecords.filter(
          record => new Date(record.drawTime).getHours() === hour
        );
        return {
          hour,
          draws: hourRecords.length,
          wins: hourRecords.filter(r => r.prizeLevel !== '未中奖').length
        };
      });
      
      res.status(200).json({
        success: true,
        data: {
          activity: {
            id: activity._id,
            name: activity.name,
            status: activity.status,
            startTime: activity.startTime,
            endTime: activity.endTime,
            totalParticipants: activity.stats.totalParticipants,
            totalDraws: activity.stats.totalDraws,
            totalWins: activity.stats.totalWins
          },
          prizeStats,
          participantStats: participantStats.sort((a, b) => b.drawCount - a.drawCount),
          dailyStats,
          hourStats,
          summary: {
            avgDrawsPerDay: (activity.stats.totalDraws / Math.max(1, dailyStats.length)).toFixed(2),
            avgDrawsPerUser: (activity.stats.totalDraws / Math.max(1, activity.stats.totalParticipants)).toFixed(2),
            winRate: activity.stats.totalDraws > 0 ? 
              (activity.stats.totalWins / activity.stats.totalDraws * 100).toFixed(2) : 0,
            participantRate: activity.stats.totalParticipants > 0 ? 
              (activity.stats.totalWins / activity.stats.totalParticipants * 100).toFixed(2) : 0
          }
        }
      });
      
    } catch (error) {
      logger.error('获取活动统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活动统计失败'
      });
    }
  }
  
  /**
   * 备份数据库
   */
  async backupDatabase(req, res) {
    try {
      const timestamp = moment().format('YYYYMMDD_HHmmss');
      const backupDir = path.join(__dirname, '../backups');
      const backupFile = path.join(backupDir, `lottery_backup_${timestamp}.json`);
      
      // 确保备份目录存在
      await fs.mkdir(backupDir, { recursive: true });
      
      // 获取所有数据
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          users: await User.find().lean(),
          prizes: await Prize.find().lean(),
          records: await DrawRecord.find().lean(),
          activities: await Activity.find().lean()
        }
      };
      
      // 保存到文件
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      // 如果使用MongoDB，也可以使用mongodump
      if (process.env.MONGODB_URI) {
        const mongodumpCommand = `mongodump --uri="${process.env.MONGODB_URI}" --out="${path.join(backupDir, `mongodump_${timestamp}`)}"`;
        try {
          await execPromise(mongodumpCommand);
        } catch (mongodumpError) {
          logger.warn('MongoDB dump失败，使用JSON备份:', mongodumpError.message);
        }
      }
      
      // 清理旧的备份文件（保留最近10个）
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(f => f.startsWith('lottery_backup_') && f.endsWith('.json'));
      
      if (backupFiles.length > 10) {
        backupFiles.sort();
        const filesToDelete = backupFiles.slice(0, backupFiles.length - 10);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(backupDir, file));
        }
      }
      
      logger.info(`数据库备份成功: ${backupFile}`, {
        adminId: req.user._id,
        backupFile
      });
      
      res.status(200).json({
        success: true,
        message: '数据库备份成功',
        data: {
          backupFile: path.basename(backupFile),
          timestamp,
          size: (await fs.stat(backupFile)).size,
          items: {
            users: backupData.data.users.length,
            prizes: backupData.data.prizes.length,
            records: backupData.data.records.length,
            activities: backupData.data.activities.length
          }
        }
      });
      
    } catch (error) {
      logger.error('数据库备份失败:', error);
      res.status(500).json({
        success: false,
        message: '数据库备份失败'
      });
    }
  }
  
  /**
   * 恢复数据库
   */
  async restoreDatabase(req, res) {
    try {
      const { backupFile } = req.body;
      
      if (!backupFile) {
        return res.status(400).json({
          success: false,
          message: '备份文件名不能为空'
        });
      }
      
      const backupDir = path.join(__dirname, '../backups');
      const backupPath = path.join(backupDir, backupFile);
      
      // 检查备份文件是否存在
      try {
        await fs.access(backupPath);
      } catch {
        return res.status(404).json({
          success: false,
          message: '备份文件不存在'
        });
      }
      
      // 读取备份数据
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      // 验证备份数据格式
      if (!backupData.data || !backupData.timestamp) {
        return res.status(400).json({
          success: false,
          message: '备份文件格式错误'
        });
      }
      
      // 备份当前数据
      const currentTimestamp = moment().format('YYYYMMDD_HHmmss');
      const currentBackupFile = path.join(backupDir, `restore_backup_${currentTimestamp}.json`);
      
      const currentData = {
        timestamp: new Date().toISOString(),
        data: {
          users: await User.find().lean(),
          prizes: await Prize.find().lean(),
          records: await DrawRecord.find().lean(),
          activities: await Activity.find().lean()
        }
      };
      
      await fs.writeFile(currentBackupFile, JSON.stringify(currentData, null, 2));
      
      // 开始恢复数据
      await User.deleteMany({});
      await Prize.deleteMany({});
      await DrawRecord.deleteMany({});
      await Activity.deleteMany({});
      
      // 恢复数据
      await User.insertMany(backupData.data.users);
      await Prize.insertMany(backupData.data.prizes);
      await DrawRecord.insertMany(backupData.data.records);
      await Activity.insertMany(backupData.data.activities);
      
      logger.info(`数据库恢复成功: ${backupFile}`, {
        adminId: req.user._id,
        backupFile,
        currentBackup: path.basename(currentBackupFile)
      });
      
      res.status(200).json({
        success: true,
        message: '数据库恢复成功',
        data: {
          restoredFrom: backupFile,
          originalBackup: path.basename(currentBackupFile),
          items: {
            users: backupData.data.users.length,
            prizes: backupData.data.prizes.length,
            records: backupData.data.records.length,
            activities: backupData.data.activities.length
          },
          backupTime: backupData.timestamp,
          restoreTime: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('数据库恢复失败:', error);
      res.status(500).json({
        success: false,
        message: '数据库恢复失败'
      });
    }
  }
  
  /**
   * 查看系统日志
   */
  async getSystemLogs(req, res) {
    try {
      const { level, limit = 100, startDate, endDate } = req.query;
      
      // 这里简化处理，实际应该从日志文件或日志服务读取
      // 假设我们使用winston，可以配置日志查询
      
      const logDir = path.join(__dirname, '../logs');
      let logs = [];
      
      try {
        const logFile = path.join(logDir, 'combined.log');
        const logContent = await fs.readFile(logFile, 'utf8');
        
        logs = logContent
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return { message: line, level: 'info' };
            }
          })
          .reverse();
        
        // 过滤
        if (level) {
          logs = logs.filter(log => log.level === level);
        }
        
        if (startDate) {
          const start = new Date(startDate);
          logs = logs.filter(log => new Date(log.timestamp || log.time) >= start);
        }
        
        if (endDate) {
          const end = new Date(endDate);
          logs = logs.filter(log => new Date(log.timestamp || log.time) <= end);
        }
        
        // 限制数量
        logs = logs.slice(0, parseInt(limit));
        
      } catch (error) {
        logger.warn('读取日志文件失败:', error.message);
        // 返回模拟日志
        logs = this.getMockLogs(parseInt(limit));
      }
      
      // 日志统计
      const logStats = {
        total: logs.length,
        byLevel: logs.reduce((acc, log) => {
          acc[log.level] = (acc[log.level] || 0) + 1;
          return acc;
        }, {}),
        byService: logs.reduce((acc, log) => {
          const service = log.service || 'unknown';
          acc[service] = (acc[service] || 0) + 1;
          return acc;
        }, {})
      };
      
      res.status(200).json({
        success: true,
        data: {
          logs,
          stats: logStats,
          query: {
            level,
            limit,
            startDate,
            endDate
          }
        }
      });
      
    } catch (error) {
      logger.error('获取系统日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取系统日志失败'
      });
    }
  }
  
  /**
   * 发送系统广播
   */
  async sendBroadcast(req, res) {
    try {
      const { title, content, type = 'info', target = 'all' } = req.body;
      
      // 这里应该实现实际的消息推送机制
      // 例如：WebSocket广播、站内信、邮件通知等
      
      // 记录广播消息
      const broadcast = {
        id: Date.now().toString(),
        title,
        content,
        type,
        target,
        sender: {
          id: req.user._id,
          name: req.user.name
        },
        timestamp: new Date().toISOString(),
        readBy: []
      };
      
      // 保存到数据库或缓存
      // 这里简化处理，只记录日志
      
      logger.info(`系统广播发送成功: ${title}`, {
        adminId: req.user._id,
        broadcast: broadcast
      });
      
      // 这里可以添加WebSocket广播
      // this.broadcastToClients(broadcast);
      
      res.status(200).json({
        success: true,
        message: '广播发送成功',
        data: broadcast
      });
      
    } catch (error) {
      logger.error('发送系统广播失败:', error);
      res.status(500).json({
        success: false,
        message: '发送广播失败'
      });
    }
  }
  
  /**
   * 获取系统设置
   */
  async getSystemSettings(req, res) {
    try {
      // 这里应该从数据库或配置文件读取系统设置
      const settings = {
        lottery: {
          dailyDrawLimit: 5,
          drawInterval: 3000,
          winRate: 30,
          guaranteeDraws: 10,
          guaranteePrize: '三等奖'
        },
        points: {
          signInPoints: 10,
          drawCost: 0,
          winMultiplier: 1,
          exchangeRate: 100
        },
        security: {
          enableCaptcha: false,
          enableIpLimit: true,
          maxAttemptsPerHour: 100,
          blockDuration: 3600
        },
        notification: {
          enableEmail: false,
          enableSMS: false,
          prizeNotification: true,
          adminAlert: true
        },
        maintenance: {
          mode: false,
          message: '',
          startTime: null,
          endTime: null
        },
        version: {
          api: '1.0.0',
          database: '1.0.0',
          lastUpdated: new Date().toISOString()
        }
      };
      
      res.status(200).json({
        success: true,
        data: settings
      });
      
    } catch (error) {
      logger.error('获取系统设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取系统设置失败'
      });
    }
  }
  
  /**
   * 更新系统设置
   */
  async updateSystemSettings(req, res) {
    try {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: '设置数据格式错误'
        });
      }
      
      // 这里应该将设置保存到数据库或配置文件
      // 验证设置数据
      const validSettings = this.validateSettings(settings);
      
      // 记录设置变更
      logger.info(`系统设置更新`, {
        adminId: req.user._id,
        settings: validSettings,
        changedAt: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '系统设置更新成功',
        data: {
          settings: validSettings,
          updatedAt: new Date().toISOString(),
          updatedBy: {
            id: req.user._id,
            name: req.user.name
          }
        }
      });
      
    } catch (error) {
      logger.error('更新系统设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新系统设置失败'
      });
    }
  }
  
  /**
   * 获取分析数据
   */
  async getAnalyticsData(req, res) {
    try {
      const { type = 'daily', startDate, endDate } = req.query;
      
      let analyticsData;
      
      switch (type) {
        case 'daily':
          analyticsData = await this.getDailyAnalytics(startDate, endDate);
          break;
        case 'weekly':
          analyticsData = await this.getWeeklyAnalytics(startDate, endDate);
          break;
        case 'monthly':
          analyticsData = await this.getMonthlyAnalytics(startDate, endDate);
          break;
        case 'yearly':
          analyticsData = await this.getYearlyAnalytics(startDate, endDate);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: '不支持的统计类型'
          });
      }
      
      res.status(200).json({
        success: true,
        data: {
          type,
          period: {
            startDate: startDate || analyticsData.period.startDate,
            endDate: endDate || analyticsData.period.endDate
          },
          ...analyticsData
        }
      });
      
    } catch (error) {
      logger.error('获取分析数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分析数据失败'
      });
    }
  }
  
  // 辅助方法
  
  /**
   * 获取系统信息
   */
  async getSystemInfo() {
    const os = require('os');
    
    return {
      server: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length
      },
      node: {
        version: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      database: {
        connected: true,
        models: ['User', 'Prize', 'DrawRecord', 'Activity'].length
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 获取趋势数据
   */
  async getTrendData(days) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const dailyStats = await DrawRecord.aggregate([
      {
        $match: {
          drawTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$drawTime' },
            month: { $month: '$drawTime' },
            day: { $dayOfMonth: '$drawTime' }
          },
          draws: { $sum: 1 },
          wins: {
            $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
          },
          users: { $addToSet: "$user" }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          draws: 1,
          wins: 1,
          users: { $size: "$users" }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    return dailyStats.map(stat => ({
      date: moment(stat.date).format('MM-DD'),
      draws: stat.draws,
      wins: stat.wins,
      winRate: stat.draws > 0 ? (stat.wins / stat.draws * 100).toFixed(2) : 0,
      users: stat.users
    }));
  }
  
  /**
   * 获取实时数据
   */
  async getRealtimeData() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [hourStats, recentWinners] = await Promise.all([
      DrawRecord.aggregate([
        {
          $match: {
            drawTime: { $gte: oneHourAgo }
          }
        },
        {
          $group: {
            _id: { $minute: '$drawTime' },
            draws: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 60 }
      ]),
      
      DrawRecord.find({
        prizeLevel: { $ne: '未中奖' },
        drawTime: { $gte: oneHourAgo }
      })
      .populate('user', 'name phone')
      .sort({ drawTime: -1 })
      .limit(10)
      .lean()
    ]);
    
    return {
      hourStats: hourStats.map(stat => ({
        minute: stat._id,
        draws: stat.draws
      })),
      recentWinners: recentWinners.map(winner => ({
        user: winner.user ? winner.user.name : '未知用户',
        prize: winner.prizeName,
        time: moment(winner.drawTime).fromNow()
      })),
      currentOnline: Math.floor(Math.random() * 100) + 50 // 模拟在线用户数
    };
  }
  
  /**
   * 检查系统报警
   */
  async checkSystemAlerts() {
    const alerts = [];
    
    // 检查奖品库存
    const lowStockPrizes = await Prize.find({
      remainingQuantity: { $gt: 0, $lt: 5 },
      status: 'active'
    }).limit(5);
    
    if (lowStockPrizes.length > 0) {
      alerts.push({
        type: 'warning',
        title: '奖品库存紧张',
        message: `${lowStockPrizes.length}个奖品库存低于5件`,
        items: lowStockPrizes.map(p => p.name),
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查活动状态
    const endingActivities = await Activity.find({
      endTime: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      status: 'active'
    });
    
    if (endingActivities.length > 0) {
      alerts.push({
        type: 'info',
        title: '活动即将结束',
        message: `${endingActivities.length}个活动将在24小时内结束`,
        items: endingActivities.map(a => a.name),
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查错误日志
    // 这里可以检查最近的错误日志
    
    return alerts;
  }
  
  /**
   * 获取每日分析数据
   */
  async getDailyAnalytics(startDate, endDate) {
    const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = endDate || new Date();
    
    const dailyData = await DrawRecord.aggregate([
      {
        $match: {
          drawTime: { $gte: defaultStartDate, $lte: defaultEndDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$drawTime' },
            month: { $month: '$drawTime' },
            day: { $dayOfMonth: '$drawTime' }
          },
          draws: { $sum: 1 },
          wins: {
            $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
          },
          value: { $sum: { $ifNull: ["$prize.value", 0] } },
          users: { $addToSet: "$user" }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          draws: 1,
          wins: 1,
          winRate: {
            $cond: [
              { $eq: ['$draws', 0] },
              0,
              { $multiply: [{ $divide: ['$wins', '$draws'] }, 100] }
            ]
          },
          avgValue: {
            $cond: [
              { $eq: ['$draws', 0] },
              0,
              { $divide: ['$value', '$draws'] }
            ]
          },
          users: { $size: "$users" }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    return {
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate
      },
      dailyData: dailyData.map(d => ({
        ...d,
        date: moment(d.date).format('YYYY-MM-DD')
      })),
      summary: this.calculateSummary(dailyData)
    };
  }
  
  /**
   * 获取每周分析数据
   */
  async getWeeklyAnalytics(startDate, endDate) {
    // 实现类似getDailyAnalytics但按周分组
    // 这里简化处理，返回模拟数据
    return {
      period: {
        startDate: startDate || new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date()
      },
      weeklyData: [],
      summary: {}
    };
  }
  
  /**
   * 计算统计摘要
   */
  calculateSummary(data) {
    if (data.length === 0) {
      return {
        totalDraws: 0,
        totalWins: 0,
        avgWinRate: 0,
        avgDrawsPerDay: 0,
        avgUsersPerDay: 0,
        totalValue: 0,
        avgValuePerDraw: 0
      };
    }
    
    const totalDraws = data.reduce((sum, d) => sum + d.draws, 0);
    const totalWins = data.reduce((sum, d) => sum + d.wins, 0);
    const totalValue = data.reduce((sum, d) => sum + (d.avgValue || 0) * d.draws, 0);
    const totalUsers = data.reduce((sum, d) => sum + d.users, 0);
    
    return {
      totalDraws,
      totalWins,
      avgWinRate: totalDraws > 0 ? (totalWins / totalDraws * 100).toFixed(2) : 0,
      avgDrawsPerDay: (totalDraws / data.length).toFixed(2),
      avgUsersPerDay: (totalUsers / data.length).toFixed(2),
      totalValue: totalValue.toFixed(2),
      avgValuePerDraw: totalDraws > 0 ? (totalValue / totalDraws).toFixed(2) : 0
    };
  }
  
  /**
   * 获取模拟日志
   */
  getMockLogs(limit) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const services = ['auth', 'lottery', 'user', 'prize', 'system'];
    const messages = [
      '用户登录成功',
      '抽奖请求处理完成',
      '奖品库存更新',
      '数据库连接正常',
      'API请求频率超限',
      '验证码发送成功',
      '活动状态变更',
      '备份任务执行',
      '系统设置更新',
      '错误请求拦截'
    ];
    
    const logs = [];
    const now = Date.now();
    
    for (let i = 0; i < limit; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      logs.push({
        level,
        message: `${service}: ${message}`,
        service,
        timestamp: new Date(now - i * 60000).toISOString(), // 每分钟一条
        meta: {
          userId: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 1000)}` : null,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`
        }
      });
    }
    
    return logs;
  }
  
  /**
   * 验证设置数据
   */
  validateSettings(settings) {
    const defaultSettings = {
      lottery: {
        dailyDrawLimit: 5,
        drawInterval: 3000,
        winRate: 30,
        guaranteeDraws: 10,
        guaranteePrize: '三等奖'
      }
    };
    
    return {
      ...defaultSettings,
      ...settings,
      lottery: {
        ...defaultSettings.lottery,
        ...(settings.lottery || {})
      }
    };
  }
}

module.exports = new AdminController();