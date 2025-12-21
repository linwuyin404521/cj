//管理路由
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { validatePagination } = require('../middlewares/validation');
const { adminAuth } = require('../middlewares/auth');

/**
 * @route   GET /api/admin/dashboard
 * @desc    获取管理仪表板数据
 * @access  Private (Admin)
 */
router.get('/dashboard', adminAuth, adminController.getDashboard);

/**
 * @route   GET /api/admin/system-stats
 * @desc    获取系统统计信息
 * @access  Private (Admin)
 */
router.get('/system-stats', adminAuth, adminController.getSystemStats);

/**
 * @route   GET /api/admin/activities
 * @desc    获取所有活动列表
 * @access  Private (Admin)
 */
router.get('/activities', adminAuth, validatePagination, adminController.getActivities);

/**
 * @route   POST /api/admin/activities
 * @desc    创建新活动
 * @access  Private (Admin)
 */
router.post(
  '/activities',
  adminAuth,
  validate([
    require('express-validator').body('name').notEmpty().withMessage('活动名称不能为空'),
    require('express-validator').body('startTime').isISO8601().withMessage('开始时间格式错误'),
    require('express-validator').body('endTime').isISO8601().withMessage('结束时间格式错误'),
    require('express-validator').body('endTime').custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('结束时间必须晚于开始时间');
      }
      return true;
    })
  ]),
  adminController.createActivity
);

/**
 * @route   PUT /api/admin/activities/:id
 * @desc    更新活动信息
 * @access  Private (Admin)
 */
router.put(
  '/activities/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误')
  ]),
  adminController.updateActivity
);

/**
 * @route   DELETE /api/admin/activities/:id
 * @desc    删除活动
 * @access  Private (Admin)
 */
router.delete(
  '/activities/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误')
  ]),
  adminController.deleteActivity
);

/**
 * @route   POST /api/admin/activities/:id/status
 * @desc    更新活动状态
 * @access  Private (Admin)
 */
router.post(
  '/activities/:id/status',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误'),
    require('express-validator').body('status')
      .isIn(['upcoming', 'active', 'paused', 'ended'])
      .withMessage('状态值无效')
  ]),
  adminController.updateActivityStatus
);

/**
 * @route   POST /api/admin/activities/:id/add-prize
 * @desc    向活动添加奖品
 * @access  Private (Admin)
 */
router.post(
  '/activities/:id/add-prize',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误'),
    require('express-validator').body('prizeId').isMongoId().withMessage('奖品ID格式错误'),
    require('express-validator').body('weight').isFloat({ min: 0 }).withMessage('权重必须大于0')
  ]),
  adminController.addPrizeToActivity
);

/**
 * @route   DELETE /api/admin/activities/:id/remove-prize/:prizeId
 * @desc    从活动移除奖品
 * @access  Private (Admin)
 */
router.delete(
  '/activities/:id/remove-prize/:prizeId',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误'),
    require('express-validator').param('prizeId').isMongoId().withMessage('奖品ID格式错误')
  ]),
  adminController.removePrizeFromActivity
);

/**
 * @route   POST /api/admin/broadcast
 * @desc    发送广播消息
 * @access  Private (Admin)
 */
router.post(
  '/broadcast',
  adminAuth,
  validate([
    require('express-validator').body('title').notEmpty().withMessage('标题不能为空'),
    require('express-validator').body('message').notEmpty().withMessage('消息内容不能为空'),
    require('express-validator').body('type')
      .isIn(['all', 'users', 'winners'])
      .withMessage('广播类型无效')
  ]),
  adminController.sendBroadcast
);

/**
 * @route   GET /api/admin/logs
 * @desc    获取系统日志
 * @access  Private (Admin)
 */
router.get('/logs', adminAuth, validatePagination, adminController.getSystemLogs);

/**
 * @route   GET /api/admin/logs/error
 * @desc    获取错误日志
 * @access  Private (Admin)
 */
router.get('/logs/error', adminAuth, validatePagination, adminController.getErrorLogs);

/**
 * @route   GET /api/admin/backup
 * @desc    备份数据库
 * @access  Private (Admin)
 */
router.get('/backup', adminAuth, adminController.backupDatabase);

/**
 * @route   POST /api/admin/restore
 * @desc    恢复数据库
 * @access  Private (Admin)
 */
router.post(
  '/restore',
  adminAuth,
  validate([
    require('express-validator').body('backupFile').notEmpty().withMessage('备份文件不能为空')
  ]),
  adminController.restoreDatabase
);

/**
 * @route   POST /api/admin/reset-daily-draws
 * @desc    重置所有用户每日抽奖次数
 * @access  Private (Admin)
 */
router.post('/reset-daily-draws', adminAuth, adminController.resetAllDailyDraws);

/**
 * @route   POST /api/admin/reset-test-data
 * @desc    重置测试数据
 * @access  Private (Admin)
 */
router.post('/reset-test-data', adminAuth, adminController.resetTestData);

/**
 * @route   GET /api/admin/analytics
 * @desc    获取分析数据
 * @access  Private (Admin)
 */
router.get('/analytics', adminAuth, adminController.getAnalytics);

/**
 * @route   GET /api/admin/analytics/daily
 * @desc    获取每日分析数据
 * @access  Private (Admin)
 */
router.get('/analytics/daily', adminAuth, adminController.getDailyAnalytics);

/**
 * @route   GET /api/admin/analytics/hourly
 * @desc    获取每小时分析数据
 * @access  Private (Admin)
 */
router.get('/analytics/hourly', adminAuth, adminController.getHourlyAnalytics);

/**
 * @route   GET /api/admin/analytics/user-growth
 * @desc    获取用户增长数据
 * @access  Private (Admin)
 */
router.get('/analytics/user-growth', adminAuth, adminController.getUserGrowthAnalytics);

/**
 * @route   GET /api/admin/analytics/prize-distribution
 * @desc    获取奖品分布数据
 * @access  Private (Admin)
 */
router.get('/analytics/prize-distribution', adminAuth, adminController.getPrizeDistributionAnalytics);

/**
 * @route   POST /api/admin/maintenance
 * @desc    进入维护模式
 * @access  Private (Admin)
 */
router.post(
  '/maintenance',
  adminAuth,
  validate([
    require('express-validator').body('mode')
      .isIn(['enable', 'disable'])
      .withMessage('模式值无效'),
    require('express-validator').body('message').optional().isString()
  ]),
  adminController.toggleMaintenanceMode
);

module.exports = router;