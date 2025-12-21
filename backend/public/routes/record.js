//路由文件-记录路由
const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const { validatePagination } = require('../middlewares/validation');
const { auth, adminAuth } = require('../middlewares/auth');

/**
 * @route   POST /api/records/save
 * @desc    保存抽奖结果（兼容旧版前端）
 * @access  Public
 */
router.post('/save', recordController.saveDrawResult);

/**
 * @route   GET /api/records
 * @desc    获取所有抽奖记录
 * @access  Public
 */
router.get('/', validatePagination, recordController.getAllRecords);

/**
 * @route   GET /api/records/today
 * @desc    获取今日抽奖记录
 * @access  Public
 */
router.get('/today', recordController.getTodayRecords);

/**
 * @route   GET /api/records/export
 * @desc    导出抽奖记录
 * @access  Private (Admin)
 */
router.get('/export', adminAuth, recordController.exportRecords);

/**
 * @route   GET /api/records/export-csv
 * @desc    导出CSV格式的抽奖记录
 * @access  Private (Admin)
 */
router.get('/export-csv', adminAuth, recordController.exportRecordsCSV);

/**
 * @route   GET /api/records/export-excel
 * @desc    导出Excel格式的抽奖记录
 * @access  Private (Admin)
 */
router.get('/export-excel', adminAuth, recordController.exportRecordsExcel);

/**
 * @route   GET /api/records/stats
 * @desc    获取记录统计信息
 * @access  Public
 */
router.get('/stats', recordController.getRecordsStats);

/**
 * @route   GET /api/records/:id
 * @desc    获取单条抽奖记录详情
 * @access  Public
 */
router.get(
  '/:id',
  validate([
    require('express-validator').param('id').isMongoId().withMessage('记录ID格式错误')
  ]),
  recordController.getRecordById
);

/**
 * @route   PUT /api/records/:id
 * @desc    更新抽奖记录（管理员）
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('记录ID格式错误')
  ]),
  recordController.updateRecord
);

/**
 * @route   DELETE /api/records/:id
 * @desc    删除抽奖记录（管理员）
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('记录ID格式错误')
  ]),
  recordController.deleteRecord
);

/**
 * @route   PUT /api/records/:id/status
 * @desc    更新记录状态（管理员）
 * @access  Private (Admin)
 */
router.put(
  '/:id/status',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('记录ID格式错误'),
    require('express-validator').body('status')
      .isIn(['pending', 'awarded', 'claimed', 'expired', 'cancelled'])
      .withMessage('状态值无效')
  ]),
  recordController.updateRecordStatus
);

/**
 * @route   POST /api/records/:id/verify
 * @desc    核销奖品（管理员）
 * @access  Private (Admin)
 */
router.post(
  '/:id/verify',
  adminAuth,
  validate([
    require('express-validator').param('id').isMongoId().withMessage('记录ID格式错误')
  ]),
  recordController.verifyPrize
);

/**
 * @route   GET /api/records/search
 * @desc    搜索抽奖记录
 * @access  Public
 */
router.get(
  '/search',
  validate([
    require('express-validator').query('keyword').notEmpty().withMessage('搜索关键词不能为空')
  ]),
  recordController.searchRecords
);

/**
 * @route   GET /api/records/by-date
 * @desc    按日期获取抽奖记录
 * @access  Public
 */
router.get(
  '/by-date',
  validate([
    require('express-validator').query('date').isDate().withMessage('日期格式错误')
  ]),
  recordController.getRecordsByDate
);

/**
 * @route   GET /api/records/by-prize/:prizeId
 * @desc    按奖品获取抽奖记录
 * @access  Public
 */
router.get(
  '/by-prize/:prizeId',
  validate([
    require('express-validator').param('prizeId').isMongoId().withMessage('奖品ID格式错误')
  ]),
  recordController.getRecordsByPrize
);

/**
 * @route   GET /api/records/by-user/:userId
 * @desc    按用户获取抽奖记录
 * @access  Public
 */
router.get(
  '/by-user/:userId',
  validate([
    require('express-validator').param('userId').isMongoId().withMessage('用户ID格式错误')
  ]),
  recordController.getRecordsByUser
);

module.exports = router;