//路由控制器-抽奖控制器
const User = require('../models/User');
const DrawRecord = require('../models/DrawRecord');
const logger = require('../utils/logger');
const moment = require('moment');

class UserController {
  /**
   * 创建或更新用户（免登录）
   */
  async createOrUpdateUser(req, res) {
    try {
      const { name, phone, email, password } = req.body;
      
      // 验证必填字段
      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: '姓名和手机号为必填项'
        });
      }
      
      // 查找用户
      let user = await User.findOne({ phone });
      
      if (user) {
        // 更新用户信息
        user.name = name;
        user.email = email || user.email;
        
        if (password) {
          user.password = password;
        }
        
        await user.save();
        
        logger.info(`用户信息更新: ${phone}`);
        
        res.status(200).json({
          success: true,
          message: '用户信息更新成功',
          data: {
            user: {
              id: user._id,
              name: user.name,
              phone: user.phone,
              email: user.email,
              totalDraws: user.totalDraws,
              totalWins: user.totalWins,
              points: user.points,
              level: user.level
            }
          }
        });
      } else {
        // 创建新用户
        user = new User({
          name,
          phone,
          email,
          password: password || phone.slice(-6) // 默认密码为手机号后6位
        });
        
        await user.save();
        
        logger.info(`新用户创建: ${phone}`);
        
        res.status(201).json({
          success: true,
          message: '用户创建成功',
          data: {
            user: {
              id: user._id,
              name: user.name,
              phone: user.phone,
              email: user.email,
              totalDraws: user.totalDraws,
              totalWins: user.totalWins,
              points: user.points,
              level: user.level
            }
          }
        });
      }
      
    } catch (error) {
      logger.error('创建/更新用户失败:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: '该手机号已注册'
        });
      }
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: '用户信息保存失败'
      });
    }
  }
  
  /**
   * 获取用户信息
   */
  async getUserInfo(req, res) {
    try {
      const { phone } = req.params;
      
      const user = await User.findOne({ phone }).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      res.status(200).json({
        success: true,
        data: { user }
      });
      
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }
  
  /**
   * 获取用户抽奖记录
   */
  async getUserRecords(req, res) {
    try {
      const { phone } = req.params;
      const { page = 1, limit = 20, status, level } = req.query;
      
      // 查找用户
      const user = await User.findOne({ phone });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 构建查询条件
      const query = { user: user._id };
      
      if (status) {
        query.status = status;
      }
      
      if (level) {
        query.prizeLevel = level;
      }
      
      // 分页查询
      const records = await DrawRecord.find(query)
        .populate('prize', 'name type value color')
        .sort({ drawTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      // 统计总数
      const total = await DrawRecord.countDocuments(query);
      
      // 统计中奖次数
      const winStats = await DrawRecord.aggregate([
        { $match: { user: user._id, prizeLevel: { $ne: '未中奖' } } },
        {
          $group: {
            _id: '$prizeLevel',
            count: { $sum: 1 },
            lastWin: { $max: '$drawTime' }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      // 今日抽奖统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayDraws = await DrawRecord.countDocuments({
        user: user._id,
        drawTime: { $gte: today }
      });
      
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
            totalDraws: user.totalDraws,
            totalWins: user.totalWins,
            winRate: user.winRate,
            todayDraws,
            remainingDraws: Math.max(0, 5 - todayDraws), // 假设每日限制5次
            winStats
          }
        }
      });
      
    } catch (error) {
      logger.error('获取用户记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户记录失败'
      });
    }
  }
  
  /**
   * 获取用户排行榜
   */
  async getUserRanking(req, res) {
    try {
      const { type = 'wins', limit = 50 } = req.query;
      
      let sortField;
      let sortTitle;
      
      switch (type) {
        case 'wins':
          sortField = { totalWins: -1 };
          sortTitle = '中奖排行榜';
          break;
        case 'draws':
          sortField = { totalDraws: -1 };
          sortTitle = '抽奖次数排行榜';
          break;
        case 'points':
          sortField = { points: -1 };
          sortTitle = '积分排行榜';
          break;
        default:
          sortField = { totalWins: -1 };
          sortTitle = '中奖排行榜';
      }
      
      const users = await User.find({ 
        status: 'active',
        totalDraws: { $gt: 0 } // 只显示有过抽奖记录的用户
      })
        .select('name phone totalDraws totalWins points level createdAt')
        .sort(sortField)
        .limit(parseInt(limit));
      
      // 添加排名和计算胜率
      const rankedUsers = users.map((user, index) => ({
        rank: index + 1,
        ...user.toObject(),
        winRate: ((user.totalWins / user.totalDraws) * 100 || 0).toFixed(2)
      }));
      
      res.status(200).json({
        success: true,
        data: {
          title: sortTitle,
          type,
          users: rankedUsers,
          count: rankedUsers.length,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('获取用户排行榜失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户排行榜失败'
      });
    }
  }
  
  /**
   * 获取所有用户（管理员）
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      
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
      
      // 分页查询
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      // 统计总数
      const total = await User.countDocuments(query);
      
      // 用户统计
      const userStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            totalDraws: { $sum: '$totalDraws' },
            totalWins: { $sum: '$totalWins' },
            totalPoints: { $sum: '$points' }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: userStats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            totalDraws: 0,
            totalWins: 0,
            totalPoints: 0
          }
        }
      });
      
    } catch (error) {
      logger.error('获取所有用户失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      });
    }
  }
  
  /**
   * 更新用户状态（管理员）
   */
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      user.status = status;
      await user.save();
      
      logger.info(`管理员更新用户状态: ${user.phone} -> ${status}`, {
        adminId: req.user._id,
        targetUserId: user._id
      });
      
      res.status(200).json({
        success: true,
        message: '用户状态更新成功',
        data: { user }
      });
      
    } catch (error) {
      logger.error('更新用户状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新用户状态失败'
      });
    }
  }
  
  /**
   * 删除用户（管理员）
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 检查是否有抽奖记录
      const hasRecords = await DrawRecord.exists({ user: id });
      if (hasRecords) {
        return res.status(400).json({
          success: false,
          message: '用户有抽奖记录，无法删除'
        });
      }
      
      await user.deleteOne();
      
      logger.info(`管理员删除用户: ${user.phone}`, {
        adminId: req.user._id,
        targetUserId: user._id
      });
      
      res.status(200).json({
        success: true,
        message: '用户删除成功'
      });
      
    } catch (error) {
      logger.error('删除用户失败:', error);
      res.status(500).json({
        success: false,
        message: '删除用户失败'
      });
    }
  }
  
  /**
   * 获取用户详细统计
   */
  async getUserDetailedStats(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 获取用户的所有抽奖记录
      const records = await DrawRecord.find({ user: id })
        .sort({ drawTime: -1 })
        .limit(100);
      
      // 月度统计
      const monthlyStats = await DrawRecord.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: {
              year: { $year: '$drawTime' },
              month: { $month: '$drawTime' }
            },
            totalDraws: { $sum: 1 },
            totalWins: {
              $sum: { $cond: [{ $ne: ['$prizeLevel', '未中奖'] }, 1, 0] }
            },
            firstDraw: { $min: '$drawTime' },
            lastDraw: { $max: '$drawTime' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]);
      
      // 奖品类型统计
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
      
      // 活跃时间分析
      const hourStats = await DrawRecord.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: { $hour: '$drawTime' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          user,
          summary: {
            totalDraws: user.totalDraws,
            totalWins: user.totalWins,
            winRate: user.winRate,
            points: user.points,
            level: user.level,
            daysSinceJoin: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)),
            avgDrawsPerDay: (user.totalDraws / Math.max(1, Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)))).toFixed(2)
          },
          recentRecords: records.slice(0, 10),
          monthlyStats,
          prizeStats,
          hourStats,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('获取用户详细统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户统计失败'
      });
    }
  }
}

module.exports = new UserController();