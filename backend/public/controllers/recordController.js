 //路由控制器-记录控制器
const DrawRecord = require('../models/DrawRecord');
const Prize = require('../models/Prize');
const User = require('../models/User');
const logger = require('../utils/logger');
const moment = require('moment');
const { Parser } = require('json2csv');

class RecordController {
  /**
   * 保存抽奖结果（兼容前端）
   */
  async saveDrawResult(req, res) {
    try {
      const { userInfo, drawResult } = req.body;
      
      if (!userInfo || !userInfo.phone || !drawResult || !drawResult.prizeName) {
        return res.status(400).json({
          success: false,
          message: '参数不完整'
        });
      }
      
      // 查找用户
      let user = await User.findOne({ phone: userInfo.phone });
      if (!user) {
        // 如果用户不存在，创建用户
        user = new User({
          name: userInfo.name || '未知用户',
          phone: userInfo.phone,
          email: userInfo.email
        });
        await user.save();
      }
      
      // 查找对应的奖品
      let prize = await Prize.findOne({ name: drawResult.prizeName });
      if (!prize) {
        // 如果找不到对应奖品，创建虚拟奖品记录
        prize = {
          _id: null,
          name: drawResult.prizeName,
          level: drawResult.level || '未中奖',
          type: 'virtual'
        };
      }
      
      // 创建抽奖记录
      const drawRecord = new DrawRecord({
        user: user._id,
        userName: user.name,
        userPhone: user.phone,
        prize: prize._id,
        prizeName: drawResult.prizeName,
        prizeLevel: drawResult.level || '未中奖',
        prizeType: prize.type,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'Unknown',
        drawTime: new Date(drawResult.time || Date.now()),
        status: drawResult.level === '未中奖' ? 'pending' : 'awarded'
      });
      
      await drawRecord.save();
      
      // 更新用户抽奖统计
      user.totalDraws += 1;
      if (drawResult.level && drawResult.level !== '未中奖') {
        user.totalWins += 1;
      }
      await user.save();
      
      logger.info(`抽奖结果保存成功: ${user.phone} -> ${drawResult.prizeName}`);
      
      res.status(200).json({
        success: true,
        message: '抽奖结果保存成功',
        data: {
          recordId: drawRecord._id,
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone
          },
          prize: {
            name: drawResult.prizeName,
            level: drawResult.level
          },
          drawTime: drawRecord.drawTime
        }
      });
      
    } catch (error) {
      logger.error('保存抽奖结果失败:', error);
      res.status(500).json({
        success: false,
        message: '保存抽奖结果失败'
      });
    }
  }
  
  /**
   * 获取所有抽奖记录（管理员）
   */
  async getAllRecords(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        startDate, 
        endDate, 
        level, 
        status,
        search,
        prizeType
      } = req.query;
      
      // 构建查询条件
      const query = {};
      
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
      
      if (level) {
        query.prizeLevel = level;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (prizeType) {
        query.prizeType = prizeType;
      }
      
      // 搜索功能
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { userName: searchRegex },
          { userPhone: searchRegex },
          { prizeName: searchRegex },
          { ipAddress: searchRegex }
        ];
      }
      
      // 分页查询
      const records = await DrawRecord.find(query)
        .populate('user', 'name phone email')
        .populate('prize', 'name type value color probability')
        .sort({ drawTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      // 统计总数
      const total = await DrawRecord.countDocuments(query);
      
      // 统计信息
      const stats = await DrawRecord.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            winCount: { 
              $sum: { 
                $cond: [{ $ne: ["$prizeLevel", "未中奖"] }, 1, 0] 
              }
            },
            totalValue: { $sum: { $ifNull: ["$prize.value", 0] } },
            uniqueUsers: { $addToSet: "$user" }
          }
        },
        {
          $project: {
            totalCount: 1,
            winCount: 1,
            winRate: {
              $cond: [
                { $eq: ['$totalCount', 0] },
                0,
                { $multiply: [{ $divide: ['$winCount', '$totalCount'] }, 100] }
              ]
            },
            totalValue: 1,
            uniqueUserCount: { $size: "$uniqueUsers" }
          }
        }
      ]);
      
      // 按奖品等级分组统计
      const prizeStats = await DrawRecord.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$prizeLevel',
            count: { $sum: 1 },
            totalValue: { $sum: { $ifNull: ["$prize.value", 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
            hasMore: total > page * limit
          },
          summary: stats[0] || { 
            totalCount: 0, 
            winCount: 0, 
            winRate: 0, 
            totalValue: 0,
            uniqueUserCount: 0
          },
          prizeStats,
          query: {
            startDate,
            endDate,
            level,
            status,
            search,
            prizeType
          }
        }
      });
      
    } catch (error) {
      logger.error('获取抽奖记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取抽奖记录失败'
      });
    }
  }
  
  /**
   * 导出抽奖记录
   */
  async exportRecords(req, res) {
    try {
      const { startDate, endDate, format = 'csv' } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (startDate || endDate) {
        query.drawTime = {};
        if (startDate) {
          query.drawTime.$gte = new Date(startDate);
        }
        if (endDate) {
          query.drawTime.$lte = new Date(endDate);
        }
      }
      
      const records = await DrawRecord.find(query)
        .populate('user', 'name phone email')
        .populate('prize', 'name level type value')
        .sort({ drawTime: -1 })
        .lean();
      
      if (format === 'csv') {
        // 转换为CSV格式
        const fields = [
          { label: '记录ID', value: '_id' },
          { label: '抽奖时间', value: 'drawTime' },
          { label: '用户姓名', value: 'user.name' },
          { label: '用户手机', value: 'userPhone' },
          { label: '奖品名称', value: 'prizeName' },
          { label: '奖品等级', value: 'prizeLevel' },
          { label: '奖品类型', value: 'prizeType' },
          { label: '奖品价值', value: 'prize.value' },
          { label: '状态', value: 'status' },
          { label: '领取码', value: 'claimCode' },
          { label: 'IP地址', value: 'ipAddress' },
          { label: '用户代理', value: 'userAgent' },
          { label: '创建时间', value: 'createdAt' }
        ];
        
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(records);
        
        const filename = `抽奖记录_${moment().format('YYYYMMDD_HHmmss')}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
      } else {
        // JSON格式
        res.status(200).json({
          success: true,
          data: records,
          count: records.length,
          exportedAt: new Date().toISOString(),
          filename: `抽奖记录_${moment().format('YYYYMMDD_HHmmss')}.json`
        });
      }
      
    } catch (error) {
      logger.error('导出抽奖记录失败:', error);
      res.status(500).json({
        success: false,
        message: '导出抽奖记录失败'
      });
    }
  }
  
  /**
   * 获取统计摘要
   */
  async getSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (startDate || endDate) {
        query.drawTime = {};
        if (startDate) {
          query.drawTime.$gte = new Date(startDate);
        }
        if (endDate) {
          query.drawTime.$lte = new Date(endDate);
        }
      }
      
      // 并行获取各种统计
      const [
        basicStats,
        dailyStats,
        hourlyStats,
        userStats,
        prizeStats
      ] = await Promise.all([
        // 基础统计
        DrawRecord.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalDraws: { $sum: 1 },
              totalWins: { 
                $sum: { 
                  $cond: [{ $ne: ["$prizeLevel", "未中奖"] }, 1, 0] 
                }
              },
              totalValue: { $sum: { $ifNull: ["$prize.value", 0] } },
              uniqueUsers: { $addToSet: "$user" }
            }
          }
        ]),
        
        // 每日统计（最近30天）
        DrawRecord.aggregate([
          { 
            $match: { 
              ...query,
              drawTime: { 
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
              }
            } 
          },
          {
            $group: {
              _id: {
                year: { $year: '$drawTime' },
                month: { $month: '$drawTime' },
                day: { $dayOfMonth: '$drawTime' }
              },
              count: { $sum: 1 },
              wins: { 
                $sum: { 
                  $cond: [{ $ne: ["$prizeLevel", "未中奖"] }, 1, 0] 
                }
              }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
          { $limit: 30 }
        ]),
        
        // 小时统计
        DrawRecord.aggregate([
          { 
            $match: { 
              ...query,
              drawTime: { 
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
              }
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
        
        // 用户统计
        DrawRecord.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$user',
              drawCount: { $sum: 1 },
              winCount: { 
                $sum: { 
                  $cond: [{ $ne: ["$prizeLevel", "未中奖"] }, 1, 0] 
                }
              },
              totalValue: { $sum: { $ifNull: ["$prize.value", 0] } }
            }
          },
          { $sort: { drawCount: -1 } },
          { $limit: 10 }
        ]),
        
        // 奖品统计
        DrawRecord.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$prizeLevel',
              count: { $sum: 1 },
              totalValue: { $sum: { $ifNull: ["$prize.value", 0] } }
            }
          },
          { $sort: { count: -1 } }
        ])
      ]);
      
      // 格式化每日统计数据
      const formattedDailyStats = dailyStats.map(item => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        draws: item.count,
        wins: item.wins,
        winRate: item.count > 0 ? (item.wins / item.count * 100).toFixed(2) : 0
      }));
      
      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalDraws: basicStats[0]?.totalDraws || 0,
            totalWins: basicStats[0]?.totalWins || 0,
            winRate: basicStats[0]?.totalDraws > 0 ? 
              (basicStats[0]?.totalWins / basicStats[0]?.totalDraws * 100).toFixed(2) : 0,
            totalValue: basicStats[0]?.totalValue || 0,
            uniqueUsers: basicStats[0]?.uniqueUsers?.length || 0
          },
          dailyStats: formattedDailyStats,
          hourlyStats,
          topUsers: userStats,
          prizeDistribution: prizeStats,
          timeframe: {
            startDate,
            endDate,
            generatedAt: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      logger.error('获取统计摘要失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计摘要失败'
      });
    }
  }
  
  /**
   * 获取单个抽奖记录详情
   */
  async getRecordById(req, res) {
    try {
      const { id } = req.params;
      
      const record = await DrawRecord.findById(id)
        .populate('user', 'name phone email createdAt')
        .populate('prize', 'name description level type value probability')
        .populate('reviewedBy', 'name phone');
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '记录不存在'
        });
      }
      
      res.status(200).json({
        success: true,
        data: record
      });
      
    } catch (error) {
      logger.error('获取记录详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取记录详情失败'
      });
    }
  }
  
  /**
   * 更新抽奖记录状态（管理员）
   */
  async updateRecord(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, claimCode, claimMethod, claimDetails } = req.body;
      
      const record = await DrawRecord.findById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '记录不存在'
        });
      }
      
      // 更新字段
      if (status) record.status = status;
      if (notes !== undefined) record.notes = notes;
      if (claimCode) record.claimCode = claimCode;
      if (claimMethod) record.claimMethod = claimMethod;
      if (claimDetails) record.claimDetails = claimDetails;
      
      // 如果是标记为已发放，设置发放时间
      if (status === 'awarded' && !record.awardTime) {
        record.awardTime = new Date();
      }
      
      // 如果是标记为已领取，设置领取时间
      if (status === 'claimed' && !record.claimTime) {
        record.claimTime = new Date();
      }
      
      // 记录审核信息
      if (req.user && (status || notes)) {
        record.reviewedBy = req.user._id;
        record.reviewTime = new Date();
        record.reviewNotes = notes;
      }
      
      await record.save();
      
      logger.info(`抽奖记录更新: ${id} -> ${status}`, {
        adminId: req.user?._id,
        recordId: record._id,
        prizeName: record.prizeName
      });
      
      res.status(200).json({
        success: true,
        message: '记录更新成功',
        data: record
      });
      
    } catch (error) {
      logger.error('更新抽奖记录失败:', error);
      res.status(500).json({
        success: false,
        message: '更新抽奖记录失败'
      });
    }
  }
  
  /**
   * 删除抽奖记录（管理员）
   */
  async deleteRecord(req, res) {
    try {
      const { id } = req.params;
      
      const record = await DrawRecord.findById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '记录不存在'
        });
      }
      
      // 检查记录状态
      if (record.status === 'claimed') {
        return res.status(400).json({
          success: false,
          message: '已领取的记录不能删除'
        });
      }
      
      await record.deleteOne();
      
      logger.info(`抽奖记录删除: ${id}`, {
        adminId: req.user._id,
        prizeName: record.prizeName,
        userName: record.userName
      });
      
      res.status(200).json({
        success: true,
        message: '记录删除成功'
      });
      
    } catch (error) {
      logger.error('删除抽奖记录失败:', error);
      res.status(500).json({
        success: false,
        message: '删除抽奖记录失败'
      });
    }
  }
  
  /**
   * 获取每日统计
   */
  async getDailyStats(req, res) {
    try {
      const { days = 30 } = req.query;
      
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
            totalDraws: { $sum: 1 },
            totalWins: { 
              $sum: { 
                $cond: [{ $ne: ["$prizeLevel", "未中奖"] }, 1, 0] 
              }
            },
            totalUsers: { $addToSet: "$user" },
            totalValue: { $sum: { $ifNull: ["$prize.value", 0] } }
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
            totalDraws: 1,
            totalWins: 1,
            winRate: {
              $cond: [
                { $eq: ['$totalDraws', 0] },
                0,
                { $multiply: [{ $divide: ['$totalWins', '$totalDraws'] }, 100] }
              ]
            },
            totalUsers: { $size: "$totalUsers" },
            totalValue: 1
          }
        },
        { $sort: { date: 1 } }
      ]);
      
      // 计算累计数据
      let cumulativeDraws = 0;
      let cumulativeWins = 0;
      let cumulativeValue = 0;
      
      const statsWithCumulative = dailyStats.map(stat => {
        cumulativeDraws += stat.totalDraws;
        cumulativeWins += stat.totalWins;
        cumulativeValue += stat.totalValue;
        
        return {
          ...stat,
          cumulativeDraws,
          cumulativeWins,
          cumulativeValue,
          date: moment(stat.date).format('YYYY-MM-DD')
        };
      });
      
      res.status(200).json({
        success: true,
        data: {
          days: parseInt(days),
          startDate,
          endDate: new Date(),
          dailyStats: statsWithCumulative,
          summary: {
            totalDraws: cumulativeDraws,
            totalWins: cumulativeWins,
            totalValue: cumulativeValue,
            avgDrawsPerDay: (cumulativeDraws / days).toFixed(2),
            avgWinsPerDay: (cumulativeWins / days).toFixed(2),
            avgValuePerDay: (cumulativeValue / days).toFixed(2)
          }
        }
      });
      
    } catch (error) {
      logger.error('获取每日统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取每日统计失败'
      });
    }
  }
}

module.exports = new RecordController();