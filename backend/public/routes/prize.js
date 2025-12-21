//奖品路由
const express = require('express');
const router = express.Router();
const prizeController = require('../controllers/prizeController');
const { validatePagination } = require('../middlewares/validation');
const { auth, adminAuth } = require('../middlewares/auth');

/**
 * @route   GET /api/prizes
 * @desc    获取所有奖品列表
 * @access  Public
 */
router.get('/', validatePagination, prizeController.getAllPrizes);

/**
 * @route   GET /api/prizes/available
 * @desc    获取可用奖品列表
 * @access  Public
 */
router.get('/available', prizeController.getAvailablePrizes);

/**
 * @route   GET /api/prizes/:id
 * @desc    获取单个奖品详情
 * @access  Public
 */
router.get(
  '/:id',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误')
  ]),
  prizeController.getPrizeById
);

/**
 * @route   POST /api/prizes
 * @desc    创建新奖品（管理员）
 * @access  Private (Admin)
 */
router.post(
  '/',
  adminAuth,
  validate([
    require('express-validator').body('name').notEmpty().withMessage('奖品名称不能为空'),
    require('express-validator').body('level')
      .isIn(['特等奖', '一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '未中奖', '积分奖'])
      .withMessage('奖品等级无效'),
    require('express-validator').body('probability')
      .isFloat({ min: 0, max: 100 })
      .withMessage('概率必须在0-100之间'),
    require('express-validator').body('type')
      .isIn(['virtual', 'physical', 'coupon', 'points'])
      .withMessage('奖品类型无效')
  ]),
  prizeController.createPrize
);

/**
 * @route   PUT /api/prizes/:id
 * @desc    更新奖品信息（管理员）
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误')
  ]),
  prizeController.updatePrize
);

/**
 * @route   DELETE /api/prizes/:id
 * @desc    删除奖品（管理员）
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误')
  ]),
  prizeController.deletePrize
);

/**
 * @route   PUT /api/prizes/:id/status
 * @desc    更新奖品状态（管理员）
 * @access  Private (Admin)
 */
router.put(
  '/:id/status',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误'),
    require('express-validator').body('status')
      .isIn(['active', 'inactive', 'out_of_stock'])
      .withMessage('状态值无效')
  ]),
  prizeController.updatePrizeStatus
);

/**
 * @route   POST /api/prizes/:id/restock
 * @desc    补货奖品（管理员）
 * @access  Private (Admin)
 */
router.post(
  '/:id/restock',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误'),
    require('express-validator').body('quantity').isInt({ min: 1 }).withMessage('补货数量必须大于0')
  ]),
  prizeController.restockPrize
);

/**
 * @route   GET /api/prizes/:id/stats
 * @desc    获取奖品统计信息
 * @access  Public
 */
router.get(
  '/:id/stats',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误')
  ]),
  prizeController.getPrizeStats
);

/**
 * @route   GET /api/prizes/:id/records
 * @desc    获取奖品的抽奖记录
 * @access  Public
 */
router.get(
  '/:id/records',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('奖品ID格式错误')
  ]),
  validatePagination,
  prizeController.getPrizeRecords
);

/**
 * @route   GET /api/prizes/search
 * @desc    搜索奖品
 * @access  Public
 */
router.get(
  '/search',
  validate([
    require('express-validator').query('keyword').notEmpty().withMessage('搜索关键词不能为空')
  ]),
  prizeController.searchPrizes
);

/**
 * @route   GET /api/prizes/category/:category
 * @desc    按分类获取奖品
 * @access  Public
 */
router.get(
  '/category/:category',
  validate([
    require('express-validator').param('category')
      .isIn(['all', 'physical', 'virtual', 'coupon', 'points'])
      .withMessage('分类无效')
  ]),
  prizeController.getPrizesByCategory
);

/**
 * @route   GET /api/prizes/level/:level
 * @desc    按等级获取奖品
 * @access  Public
 */
router.get(
  '/level/:level',
  validate([
    require('express-validator').param('level')
      .isIn(['特等奖', '一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '未中奖', '积分奖'])
      .withMessage('奖品等级无效')
  ]),
  prizeController.getPrizesByLevel
);

/**
 * @route   POST /api/prizes/batch-import
 * @desc    批量导入奖品（管理员）
 * @access  Private (Admin)
 */
router.post(
  '/batch-import',
  adminAuth,
  prizeController.batchImportPrizes
);

/**
 * @route   GET /api/prizes/export
 * @desc    导出奖品列表（管理员）
 * @access  Private (Admin)
 */
router.get('/export', adminAuth, prizeController.exportPrizes);

/**
 * @route   POST /api/prizes/sort
 * @desc    更新奖品排序（管理员）
 * @access  Private (Admin)
 */
router.post(
  '/sort',
  adminAuth,
  validate([
    require('express-validator').body('prizes').isArray().withMessage('奖品列表格式错误')
  ]),
  prizeController.updatePrizesSortOrder
);

module.exports = router;