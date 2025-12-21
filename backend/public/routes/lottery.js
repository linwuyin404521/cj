const express = require('express');
const router = express.Router();
const lotteryController = require('../controllers/lotteryController');
const { validatePhone, validateDraw, validatePagination } = require('../middlewares/validation');
const { auth } = require('../middlewares/auth');

/**
 * @route   GET /api/lottery/prizes
 * @desc    获取可用奖品列表
 * @access  Public
 */
router.get('/prizes', lotteryController.getPrizeList);

/**
 * @route   GET /api/lottery/prizes/:id
 * @desc    获取单个奖品详情
 * @access  Public
 */
router.get(
  '/prizes/:id',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误')
  ]),
  lotteryController.getPrizeById
);

/**
 * @route   POST /api/lottery/draw
 * @desc    执行抽奖
 * @access  Public
 */
router.post(
  '/draw',
  validateDraw,
  lotteryController.drawLottery
);

/**
 * @route   POST /api/lottery/draw/auth
 * @desc    执行抽奖（需要登录）
 * @access  Private
 */
router.post(
  '/draw/auth',
  auth,
  lotteryController.drawLotteryAuth
);

/**
 * @route   GET /api/lottery/stats/:phone
 * @desc    获取用户抽奖统计
 * @access  Public
 */
router.get(
  '/stats/:phone',
  validate([
    require('express-validator').param('phone').isMobilePhone('zh-CN').withMessage('手机号格式错误')
  ]),
  lotteryController.getUserStats
);

/**
 * @route   GET /api/lottery/winners
 * @desc    获取中奖记录列表
 * @access  Public
 */
router.get('/winners', validatePagination, lotteryController.getWinners);

/**
 * @route   GET /api/lottery/winners/today
 * @desc    获取今日中奖记录
 * @access  Public
 */
router.get('/winners/today', lotteryController.getTodayWinners);

/**
 * @route   GET /api/lottery/realtime-stats
 * @desc    获取实时统计信息
 * @access  Public
 */
router.get('/realtime-stats', lotteryController.getRealTimeStats);

/**
 * @route   GET /api/lottery/daily-stats
 * @desc    获取每日统计信息
 * @access  Public
 */
router.get('/daily-stats', lotteryController.getDailyStats);

/**
 * @route   GET /api/lottery/hourly-stats
 * @desc    获取每小时统计信息
 * @access  Public
 */
router.get('/hourly-stats', lotteryController.getHourlyStats);

/**
 * @route   POST /api/lottery/simulate
 * @desc    模拟抽奖（测试用）
 * @access  Private (Admin)
 */
router.post(
  '/simulate',
  require('../middlewares/auth').adminAuth,
  validate([
    require('express-validator').body('times').isInt({ min: 1, max: 1000 }).withMessage('模拟次数应为1-1000之间'),
    require('express-validator').body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式错误')
  ]),
  lotteryController.simulateDraw
);

/**
 * @route   GET /api/lottery/activity/:id
 * @desc    获取活动详情
 * @access  Public
 */
router.get(
  '/activity/:id',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误')
  ]),
  lotteryController.getActivity
);

/**
 * @route   GET /api/lottery/activity/:id/stats
 * @desc    获取活动统计信息
 * @access  Public
 */
router.get(
  '/activity/:id/stats',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('活动ID格式错误')
  ]),
  lotteryController.getActivityStats
);

/**
 * @route   POST /api/lottery/claim/:recordId
 * @desc    领取奖品
 * @access  Private
 */
router.post(
  '/claim/:recordId',
  auth,
  validate([
    require('express-validator').param('recordId').isMongoId().withMessage('记录ID格式错误'),
    require('express-validator').body('claimMethod').notEmpty().withMessage('领取方式不能为空')
  ]),
  lotteryController.claimPrize
);

/**
 * @route   GET /api/lottery/my-prizes
 * @desc    获取我的奖品列表
 * @access  Private
 */
router.get('/my-prizes', auth, lotteryController.getMyPrizes);

module.exports = router;