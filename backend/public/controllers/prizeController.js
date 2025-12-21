<<<<<<< HEAD
const Prize = require('../models/Prize');
const DrawRecord = require('../models/DrawRecord');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');
const moment = require('moment');

class PrizeController {
  /**
   * 获取所有奖品
   */
  async getAllPrizes(req, res) {
    try {
      const { page = 1, limit = 20, status, level, search } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (level) {
        query.level = level;
      }
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { description: searchRegex }
        ];
      }
      
      // 分页查询
      const prizes = await Prize.find(query)
        .sort({ sortOrder: 1, level: 1, probability: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      // 统计总数
      const total = await Prize.countDocuments(query);
      
      // 统计信息
      const stats = await Prize.aggregate([
        { $match: query },
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
            totalProbability: { $sum: '$probability' }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          prizes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: stats[0] || {
            totalPrizes: 0,
            activePrizes: 0,
            outOfStock: 0,
            totalValue: 0,
            totalProbability: 0
          }
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
   * 获取可用奖品列表（用于抽奖）
   */
  async getAvailablePrizes(req, res) {
    try {
      const prizes = await Prize.getAvailablePrizes();
      
      // 计算库存状态
      const prizesWithStatus = prizes.map(prize => ({
        ...prize.toObject(),
        stockStatus: prize.remainingQuantity === -1 ? '无限' : 
          prize.remainingQuantity === 0 ? '缺货' : 
          prize.remainingQuantity <= 5 ? '紧张' : '充足'
      }));
      
      res.status(200).json({
        success: true,
        data: {
          prizes: prizesWithStatus,
          count: prizes.length,
          totalProbability: prizes.reduce((sum, prize) => sum + prize.probability, 0)
        }
      });
      
    } catch (error) {
      logger.error('获取可用奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '获取可用奖品失败'
      });
    }
  }
  
  /**
   * 获取单个奖品详情
   */
  async getPrizeById(req, res) {
    try {
      const { id } = req.params;
      
      const prize = await Prize.findById(id);
      
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 获取奖品的中奖记录统计
      const awardStats = await DrawRecord.aggregate([
        { $match: { prize: prize._id } },
        {
          $group: {
            _id: null,
            totalAwarded: { $sum: 1 },
            totalClaimed: {
              $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
            },
            totalValue: { $sum: '$prize.value' },
            recentAward: { $max: '$drawTime' }
          }
        }
      ]);
      
      // 获取中奖用户列表
      const winners = await DrawRecord.find({ prize: prize._id })
        .populate('user', 'name phone')
        .sort({ drawTime: -1 })
        .limit(10);
      
      res.status(200).json({
        success: true,
        data: {
          prize,
          stats: awardStats[0] || {
            totalAwarded: 0,
            totalClaimed: 0,
            totalValue: 0
          },
          recentWinners: winners,
          availability: {
            remaining: prize.remainingQuantity,
            total: prize.totalQuantity,
            status: prize.status,
            canAward: prize.canAward ? prize.canAward().canAward : true
          }
        }
      });
      
    } catch (error) {
      logger.error('获取奖品详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取奖品详情失败'
      });
    }
  }
  
  /**
   * 创建新奖品（管理员）
   */
  async createPrize(req, res) {
    try {
      const prizeData = req.body;
      
      // 如果未指定剩余数量，默认与总数相同
      if (!prizeData.remainingQuantity && prizeData.totalQuantity !== undefined) {
        prizeData.remainingQuantity = prizeData.totalQuantity;
      }
      
      // 根据库存设置状态
      if (prizeData.remainingQuantity === 0) {
        prizeData.status = 'out_of_stock';
      } else if (prizeData.status === undefined) {
        prizeData.status = 'active';
      }
      
      const prize = new Prize(prizeData);
      await prize.save();
      
      logger.info(`奖品创建成功: ${prize.name}`, {
        adminId: req.user._id,
        prizeId: prize._id,
        level: prize.level
      });
      
      res.status(201).json({
        success: true,
        message: '奖品创建成功',
        data: prize
      });
      
    } catch (error) {
      logger.error('创建奖品失败:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: '创建奖品失败'
      });
    }
  }
  
  /**
   * 更新奖品信息（管理员）
   */
  async updatePrize(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 检查库存状态
      if (updateData.remainingQuantity !== undefined) {
        if (updateData.remainingQuantity === 0) {
          updateData.status = 'out_of_stock';
        } else if (prize.status === 'out_of_stock' && updateData.remainingQuantity > 0) {
          updateData.status = 'active';
        }
      }
      
      // 更新字段
      Object.keys(updateData).forEach(key => {
        prize[key] = updateData[key];
      });
      
      await prize.save();
      
      logger.info(`奖品更新成功: ${prize.name}`, {
        adminId: req.user._id,
        prizeId: prize._id,
        updates: Object.keys(updateData)
      });
      
      res.status(200).json({
        success: true,
        message: '奖品更新成功',
        data: prize
      });
      
    } catch (error) {
      logger.error('更新奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '更新奖品失败'
      });
    }
  }
  
  /**
   * 删除奖品（管理员）
   */
  async deletePrize(req, res) {
    try {
      const { id } = req.params;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 检查是否有中奖记录
      const hasAwarded = await DrawRecord.exists({ prize: prize._id });
      if (hasAwarded) {
        return res.status(400).json({
          success: false,
          message: '该奖品已有中奖记录，不能删除'
        });
      }
      
      await prize.deleteOne();
      
      logger.info(`奖品删除成功: ${prize.name}`, {
        adminId: req.user._id,
        prizeId: prize._id
      });
      
      res.status(200).json({
        success: true,
        message: '奖品删除成功'
      });
      
    } catch (error) {
      logger.error('删除奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '删除奖品失败'
      });
    }
  }
  
  /**
   * 更新奖品库存（管理员）
   */
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 更新库存
      prize.remainingQuantity = quantity;
      
      // 更新状态
      if (quantity === 0) {
        prize.status = 'out_of_stock';
      } else if (prize.status === 'out_of_stock') {
        prize.status = 'active';
      }
      
      await prize.save();
      
      logger.info(`奖品库存更新: ${prize.name} -> ${quantity}`, {
        adminId: req.user._id,
        prizeId: prize._id
      });
      
      res.status(200).json({
        success: true,
        message: '库存更新成功',
        data: {
          prizeId: prize._id,
          name: prize.name,
          remainingQuantity: prize.remainingQuantity,
          status: prize.status
        }
      });
      
    } catch (error) {
      logger.error('更新奖品库存失败:', error);
      res.status(500).json({
        success: false,
        message: '更新库存失败'
      });
    }
  }
  
  /**
   * 获取奖品统计信息（管理员）
   */
  async getPrizeStats(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 构建时间查询条件
      const timeQuery = {};
      if (startDate || endDate) {
        timeQuery.drawTime = {};
        if (startDate) {
          timeQuery.drawTime.$gte = new Date(startDate);
        }
        if (endDate) {
          timeQuery.drawTime.$lte = new Date(endDate);
        }
      }
      
      // 获取中奖统计
      const awardStats = await DrawRecord.aggregate([
        { 
          $match: { 
            prize: prize._id,
            ...timeQuery
          } 
        },
        {
          $group: {
            _id: null,
            totalAwarded: { $sum: 1 },
            totalClaimed: {
              $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
            },
            totalValue: { $sum: '$prize.value' },
            firstAward: { $min: '$drawTime' },
            lastAward: { $max: '$drawTime' }
          }
        }
      ]);
      
      // 获取每日中奖统计（最近30天）
      const dailyStats = await DrawRecord.aggregate([
        { 
          $match: { 
            prize: prize._id,
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
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 }
      ]);
      
      // 获取中奖用户统计
      const userStats = await DrawRecord.aggregate([
        { $match: { prize: prize._id } },
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 },
            lastAward: { $max: '$drawTime' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          prize: {
            id: prize._id,
            name: prize.name,
            level: prize.level,
            probability: prize.probability,
            remainingQuantity: prize.remainingQuantity,
            totalQuantity: prize.totalQuantity
          },
          stats: awardStats[0] || {
            totalAwarded: 0,
            totalClaimed: 0,
            totalValue: 0
          },
          dailyStats: dailyStats.map(item => ({
            date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
            count: item.count
          })),
          topUsers: userStats,
          timeframe: {
            startDate,
            endDate,
            generatedAt: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      logger.error('获取奖品统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取奖品统计失败'
      });
    }
  }
  
  /**
   * 批量导入奖品（管理员）
   */
  async batchCreatePrizes(req, res) {
    try {
      const { prizes } = req.body;
      
      if (!Array.isArray(prizes) || prizes.length === 0) {
        return res.status(400).json({
          success: false,
          message: '奖品数据必须是数组且不能为空'
        });
      }
      
      // 验证每个奖品数据
      const validatedPrizes = [];
      const errors = [];
      
      for (let i = 0; i < prizes.length; i++) {
        const prizeData = prizes[i];
        
        try {
          // 设置默认值
          if (!prizeData.remainingQuantity && prizeData.totalQuantity !== undefined) {
            prizeData.remainingQuantity = prizeData.totalQuantity;
          }
          
          if (!prizeData.status) {
            prizeData.status = prizeData.remainingQuantity === 0 ? 'out_of_stock' : 'active';
          }
          
          if (!prizeData.color) {
            // 根据等级分配颜色
            const colorMap = {
              '特等奖': '#FFD700',
              '一等奖': '#C0C0C0',
              '二等奖': '#CD7F32',
              '三等奖': '#3498db',
              '四等奖': '#2ecc71',
              '五等奖': '#9b59b6',
              '积分奖': '#e74c3c',
              '未中奖': '#95a5a6'
            };
            prizeData.color = colorMap[prizeData.level] || '#3498db';
          }
          
          validatedPrizes.push(prizeData);
          
        } catch (error) {
          errors.push(`第${i + 1}个奖品: ${error.message}`);
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: '部分奖品数据验证失败',
          errors
        });
      }
      
      // 批量创建奖品
      const createdPrizes = await Prize.insertMany(validatedPrizes);
      
      logger.info(`批量创建奖品成功: ${createdPrizes.length}个`, {
        adminId: req.user._id
      });
      
      res.status(201).json({
        success: true,
        message: `成功创建 ${createdPrizes.length} 个奖品`,
        data: {
          created: createdPrizes.length,
          prizes: createdPrizes.map(p => ({
            id: p._id,
            name: p.name,
            level: p.level,
            probability: p.probability
          }))
        }
      });
      
    } catch (error) {
      logger.error('批量创建奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '批量创建奖品失败'
      });
    }
  }
  
  /**
   * 导出奖品列表（管理员）
   */
  async exportPrizes(req, res) {
    try {
      const prizes = await Prize.find()
        .sort({ level: 1, sortOrder: 1 })
        .lean();
      
      const fields = [
        { label: '奖品ID', value: '_id' },
        { label: '奖品名称', value: 'name' },
        { label: '奖品描述', value: 'description' },
        { label: '奖品等级', value: 'level' },
        { label: '中奖概率', value: 'probability' },
        { label: '奖品类型', value: 'type' },
        { label: '总数量', value: 'totalQuantity' },
        { label: '剩余数量', value: 'remainingQuantity' },
        { label: '每日限制', value: 'dailyLimit' },
        { label: '奖品价值', value: 'value' },
        { label: '积分值', value: 'points' },
        { label: '状态', value: 'status' },
        { label: '颜色代码', value: 'color' },
        { label: '排序顺序', value: 'sortOrder' },
        { label: '创建时间', value: 'createdAt' },
        { label: '更新时间', value: 'updatedAt' }
      ];
      
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(prizes);
      
      const filename = `奖品列表_${moment().format('YYYYMMDD_HHmmss')}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csv);
      
    } catch (error) {
      logger.error('导出奖品列表失败:', error);
      res.status(500).json({
        success: false,
        message: '导出奖品列表失败'
      });
    }
  }
}

=======
const Prize = require('../models/Prize');
const DrawRecord = require('../models/DrawRecord');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');
const moment = require('moment');

class PrizeController {
  /**
   * 获取所有奖品
   */
  async getAllPrizes(req, res) {
    try {
      const { page = 1, limit = 20, status, level, search } = req.query;
      
      // 构建查询条件
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (level) {
        query.level = level;
      }
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { description: searchRegex }
        ];
      }
      
      // 分页查询
      const prizes = await Prize.find(query)
        .sort({ sortOrder: 1, level: 1, probability: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      // 统计总数
      const total = await Prize.countDocuments(query);
      
      // 统计信息
      const stats = await Prize.aggregate([
        { $match: query },
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
            totalProbability: { $sum: '$probability' }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          prizes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          stats: stats[0] || {
            totalPrizes: 0,
            activePrizes: 0,
            outOfStock: 0,
            totalValue: 0,
            totalProbability: 0
          }
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
   * 获取可用奖品列表（用于抽奖）
   */
  async getAvailablePrizes(req, res) {
    try {
      const prizes = await Prize.getAvailablePrizes();
      
      // 计算库存状态
      const prizesWithStatus = prizes.map(prize => ({
        ...prize.toObject(),
        stockStatus: prize.remainingQuantity === -1 ? '无限' : 
          prize.remainingQuantity === 0 ? '缺货' : 
          prize.remainingQuantity <= 5 ? '紧张' : '充足'
      }));
      
      res.status(200).json({
        success: true,
        data: {
          prizes: prizesWithStatus,
          count: prizes.length,
          totalProbability: prizes.reduce((sum, prize) => sum + prize.probability, 0)
        }
      });
      
    } catch (error) {
      logger.error('获取可用奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '获取可用奖品失败'
      });
    }
  }
  
  /**
   * 获取单个奖品详情
   */
  async getPrizeById(req, res) {
    try {
      const { id } = req.params;
      
      const prize = await Prize.findById(id);
      
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 获取奖品的中奖记录统计
      const awardStats = await DrawRecord.aggregate([
        { $match: { prize: prize._id } },
        {
          $group: {
            _id: null,
            totalAwarded: { $sum: 1 },
            totalClaimed: {
              $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
            },
            totalValue: { $sum: '$prize.value' },
            recentAward: { $max: '$drawTime' }
          }
        }
      ]);
      
      // 获取中奖用户列表
      const winners = await DrawRecord.find({ prize: prize._id })
        .populate('user', 'name phone')
        .sort({ drawTime: -1 })
        .limit(10);
      
      res.status(200).json({
        success: true,
        data: {
          prize,
          stats: awardStats[0] || {
            totalAwarded: 0,
            totalClaimed: 0,
            totalValue: 0
          },
          recentWinners: winners,
          availability: {
            remaining: prize.remainingQuantity,
            total: prize.totalQuantity,
            status: prize.status,
            canAward: prize.canAward ? prize.canAward().canAward : true
          }
        }
      });
      
    } catch (error) {
      logger.error('获取奖品详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取奖品详情失败'
      });
    }
  }
  
  /**
   * 创建新奖品（管理员）
   */
  async createPrize(req, res) {
    try {
      const prizeData = req.body;
      
      // 如果未指定剩余数量，默认与总数相同
      if (!prizeData.remainingQuantity && prizeData.totalQuantity !== undefined) {
        prizeData.remainingQuantity = prizeData.totalQuantity;
      }
      
      // 根据库存设置状态
      if (prizeData.remainingQuantity === 0) {
        prizeData.status = 'out_of_stock';
      } else if (prizeData.status === undefined) {
        prizeData.status = 'active';
      }
      
      const prize = new Prize(prizeData);
      await prize.save();
      
      logger.info(`奖品创建成功: ${prize.name}`, {
        adminId: req.user._id,
        prizeId: prize._id,
        level: prize.level
      });
      
      res.status(201).json({
        success: true,
        message: '奖品创建成功',
        data: prize
      });
      
    } catch (error) {
      logger.error('创建奖品失败:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: '创建奖品失败'
      });
    }
  }
  
  /**
   * 更新奖品信息（管理员）
   */
  async updatePrize(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 检查库存状态
      if (updateData.remainingQuantity !== undefined) {
        if (updateData.remainingQuantity === 0) {
          updateData.status = 'out_of_stock';
        } else if (prize.status === 'out_of_stock' && updateData.remainingQuantity > 0) {
          updateData.status = 'active';
        }
      }
      
      // 更新字段
      Object.keys(updateData).forEach(key => {
        prize[key] = updateData[key];
      });
      
      await prize.save();
      
      logger.info(`奖品更新成功: ${prize.name}`, {
        adminId: req.user._id,
        prizeId: prize._id,
        updates: Object.keys(updateData)
      });
      
      res.status(200).json({
        success: true,
        message: '奖品更新成功',
        data: prize
      });
      
    } catch (error) {
      logger.error('更新奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '更新奖品失败'
      });
    }
  }
  
  /**
   * 删除奖品（管理员）
   */
  async deletePrize(req, res) {
    try {
      const { id } = req.params;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 检查是否有中奖记录
      const hasAwarded = await DrawRecord.exists({ prize: prize._id });
      if (hasAwarded) {
        return res.status(400).json({
          success: false,
          message: '该奖品已有中奖记录，不能删除'
        });
      }
      
      await prize.deleteOne();
      
      logger.info(`奖品删除成功: ${prize.name}`, {
        adminId: req.user._id,
        prizeId: prize._id
      });
      
      res.status(200).json({
        success: true,
        message: '奖品删除成功'
      });
      
    } catch (error) {
      logger.error('删除奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '删除奖品失败'
      });
    }
  }
  
  /**
   * 更新奖品库存（管理员）
   */
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 更新库存
      prize.remainingQuantity = quantity;
      
      // 更新状态
      if (quantity === 0) {
        prize.status = 'out_of_stock';
      } else if (prize.status === 'out_of_stock') {
        prize.status = 'active';
      }
      
      await prize.save();
      
      logger.info(`奖品库存更新: ${prize.name} -> ${quantity}`, {
        adminId: req.user._id,
        prizeId: prize._id
      });
      
      res.status(200).json({
        success: true,
        message: '库存更新成功',
        data: {
          prizeId: prize._id,
          name: prize.name,
          remainingQuantity: prize.remainingQuantity,
          status: prize.status
        }
      });
      
    } catch (error) {
      logger.error('更新奖品库存失败:', error);
      res.status(500).json({
        success: false,
        message: '更新库存失败'
      });
    }
  }
  
  /**
   * 获取奖品统计信息（管理员）
   */
  async getPrizeStats(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const prize = await Prize.findById(id);
      if (!prize) {
        return res.status(404).json({
          success: false,
          message: '奖品不存在'
        });
      }
      
      // 构建时间查询条件
      const timeQuery = {};
      if (startDate || endDate) {
        timeQuery.drawTime = {};
        if (startDate) {
          timeQuery.drawTime.$gte = new Date(startDate);
        }
        if (endDate) {
          timeQuery.drawTime.$lte = new Date(endDate);
        }
      }
      
      // 获取中奖统计
      const awardStats = await DrawRecord.aggregate([
        { 
          $match: { 
            prize: prize._id,
            ...timeQuery
          } 
        },
        {
          $group: {
            _id: null,
            totalAwarded: { $sum: 1 },
            totalClaimed: {
              $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
            },
            totalValue: { $sum: '$prize.value' },
            firstAward: { $min: '$drawTime' },
            lastAward: { $max: '$drawTime' }
          }
        }
      ]);
      
      // 获取每日中奖统计（最近30天）
      const dailyStats = await DrawRecord.aggregate([
        { 
          $match: { 
            prize: prize._id,
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
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 }
      ]);
      
      // 获取中奖用户统计
      const userStats = await DrawRecord.aggregate([
        { $match: { prize: prize._id } },
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 },
            lastAward: { $max: '$drawTime' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          prize: {
            id: prize._id,
            name: prize.name,
            level: prize.level,
            probability: prize.probability,
            remainingQuantity: prize.remainingQuantity,
            totalQuantity: prize.totalQuantity
          },
          stats: awardStats[0] || {
            totalAwarded: 0,
            totalClaimed: 0,
            totalValue: 0
          },
          dailyStats: dailyStats.map(item => ({
            date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
            count: item.count
          })),
          topUsers: userStats,
          timeframe: {
            startDate,
            endDate,
            generatedAt: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      logger.error('获取奖品统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取奖品统计失败'
      });
    }
  }
  
  /**
   * 批量导入奖品（管理员）
   */
  async batchCreatePrizes(req, res) {
    try {
      const { prizes } = req.body;
      
      if (!Array.isArray(prizes) || prizes.length === 0) {
        return res.status(400).json({
          success: false,
          message: '奖品数据必须是数组且不能为空'
        });
      }
      
      // 验证每个奖品数据
      const validatedPrizes = [];
      const errors = [];
      
      for (let i = 0; i < prizes.length; i++) {
        const prizeData = prizes[i];
        
        try {
          // 设置默认值
          if (!prizeData.remainingQuantity && prizeData.totalQuantity !== undefined) {
            prizeData.remainingQuantity = prizeData.totalQuantity;
          }
          
          if (!prizeData.status) {
            prizeData.status = prizeData.remainingQuantity === 0 ? 'out_of_stock' : 'active';
          }
          
          if (!prizeData.color) {
            // 根据等级分配颜色
            const colorMap = {
              '特等奖': '#FFD700',
              '一等奖': '#C0C0C0',
              '二等奖': '#CD7F32',
              '三等奖': '#3498db',
              '四等奖': '#2ecc71',
              '五等奖': '#9b59b6',
              '积分奖': '#e74c3c',
              '未中奖': '#95a5a6'
            };
            prizeData.color = colorMap[prizeData.level] || '#3498db';
          }
          
          validatedPrizes.push(prizeData);
          
        } catch (error) {
          errors.push(`第${i + 1}个奖品: ${error.message}`);
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: '部分奖品数据验证失败',
          errors
        });
      }
      
      // 批量创建奖品
      const createdPrizes = await Prize.insertMany(validatedPrizes);
      
      logger.info(`批量创建奖品成功: ${createdPrizes.length}个`, {
        adminId: req.user._id
      });
      
      res.status(201).json({
        success: true,
        message: `成功创建 ${createdPrizes.length} 个奖品`,
        data: {
          created: createdPrizes.length,
          prizes: createdPrizes.map(p => ({
            id: p._id,
            name: p.name,
            level: p.level,
            probability: p.probability
          }))
        }
      });
      
    } catch (error) {
      logger.error('批量创建奖品失败:', error);
      res.status(500).json({
        success: false,
        message: '批量创建奖品失败'
      });
    }
  }
  
  /**
   * 导出奖品列表（管理员）
   */
  async exportPrizes(req, res) {
    try {
      const prizes = await Prize.find()
        .sort({ level: 1, sortOrder: 1 })
        .lean();
      
      const fields = [
        { label: '奖品ID', value: '_id' },
        { label: '奖品名称', value: 'name' },
        { label: '奖品描述', value: 'description' },
        { label: '奖品等级', value: 'level' },
        { label: '中奖概率', value: 'probability' },
        { label: '奖品类型', value: 'type' },
        { label: '总数量', value: 'totalQuantity' },
        { label: '剩余数量', value: 'remainingQuantity' },
        { label: '每日限制', value: 'dailyLimit' },
        { label: '奖品价值', value: 'value' },
        { label: '积分值', value: 'points' },
        { label: '状态', value: 'status' },
        { label: '颜色代码', value: 'color' },
        { label: '排序顺序', value: 'sortOrder' },
        { label: '创建时间', value: 'createdAt' },
        { label: '更新时间', value: 'updatedAt' }
      ];
      
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(prizes);
      
      const filename = `奖品列表_${moment().format('YYYYMMDD_HHmmss')}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csv);
      
    } catch (error) {
      logger.error('导出奖品列表失败:', error);
      res.status(500).json({
        success: false,
        message: '导出奖品列表失败'
      });
    }
  }
}

>>>>>>> 7b1fccad50f1492c9684d8a85ddea6dca559fee9
module.exports = new PrizeController();